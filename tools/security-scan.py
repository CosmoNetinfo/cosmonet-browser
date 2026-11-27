"""Run pinned official Gitleaks with redaction; no API key is required."""
import hashlib
import io
from pathlib import Path
import platform
import subprocess
import tarfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = "8.30.1"


def main():
    system = "windows" if platform.system() == "Windows" else "linux"
    suffix = "zip" if system == "windows" else "tar.gz"
    name = f"gitleaks_{VERSION}_{system}_x64.{suffix}"
    base = f"https://github.com/gitleaks/gitleaks/releases/download/v{VERSION}/"
    target = ROOT / ".work/security-tools"
    target.mkdir(parents=True, exist_ok=True)
    def get(filename):
        request = urllib.request.Request(base + filename, headers={"User-Agent":"CosmoBrowser-security"})
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read()
    checksums = get(f"gitleaks_{VERSION}_checksums.txt").decode()
    expected = next(line.split()[0] for line in checksums.splitlines() if line.split()[-1] == name)
    archive_path = target / name
    content = archive_path.read_bytes() if archive_path.exists() else get(name)
    if hashlib.sha256(content).hexdigest() != expected:
        raise RuntimeError("Gitleaks archive checksum mismatch")
    archive_path.write_bytes(content)
    executable = target / ("gitleaks.exe" if system == "windows" else "gitleaks")
    if system == "windows":
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            executable.write_bytes(archive.read("gitleaks.exe"))
    else:
        with tarfile.open(fileobj=io.BytesIO(content), mode="r:gz") as archive:
            member = archive.extractfile("gitleaks")
            if member is None:
                raise RuntimeError("Gitleaks executable missing from release")
            executable.write_bytes(member.read())
        executable.chmod(0o755)
    report = ROOT / ".work/secrets-redacted.json"
    result = subprocess.run([str(executable), "git", str(ROOT), "--log-opts=--all",
                             "--redact=100", "--no-banner", "--ignore-gitleaks-allow",
                             "--gitleaks-ignore-path", str(ROOT / ".gitleaksignore"),
                             "--report-format=json", "--report-path=" + str(report)], cwd=ROOT)
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
