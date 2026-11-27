"""Download a small, verifiable Chromium source baseline; never a full checkout."""
import base64
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
VERSION = "159.0.8154.34"
REVISION = "4deb883708d3d25100c5aac2148aafc95dae95ac"
FILES = [
    "chrome/VERSION",
    "chrome/app/theme/chromium/BRANDING",
    "chrome/app/theme/chromium/product_logo_16.png",
    "chrome/app/theme/chromium/product_logo_22.png",
    "chrome/app/theme/chromium/product_logo_24.png",
    "chrome/app/theme/chromium/product_logo_32.png",
    "chrome/app/theme/chromium/product_logo_48.png",
    "chrome/app/theme/chromium/product_logo_64.png",
    "chrome/app/theme/chromium/product_logo_128.png",
    "chrome/app/theme/chromium/product_logo_256.png",
    "chrome/app/theme/chromium/win/chromium.ico",
    "chrome/app/chromium_strings.grd",
    "chrome/common/chrome_paths_linux.cc",
    "chrome/browser/sync/BUILD.gn",
    "chrome/browser/sync/sync_service_factory.cc",
    "chrome/install_static/chromium_install_modes.h",
    "components/sync/base/command_line_switches.cc",
    "chrome/browser/password_manager/factories/account_password_store_factory.cc",
    "chrome/browser/password_manager/factories/profile_password_store_factory.cc",
    "components/sync/service/sync_service_impl.cc",
    "chrome/android/BUILD.gn",
    "chrome/android/chrome_public_apk_tmpl.gni",
    "chrome/browser/password_manager/factories/password_store_backend_factory.cc",
    "chrome/android/java/AndroidManifest.xml",
    "build/config/chrome_build.gni",
]


def get(url):
    request = urllib.request.Request(url, headers={"User-Agent": "CosmoBrowser-build/0.2"})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def main():
    lock_path = ROOT / "chromium" / "upstream.lock.json"
    previous = json.loads(lock_path.read_text()) if lock_path.exists() else None
    lock = {"version": VERSION, "revision": REVISION,
            "repository": "https://chromium.googlesource.com/chromium/src.git",
            "files": {}}
    baseline = ROOT / ".work" / "upstream"
    for name in FILES:
        cached = baseline / name
        if cached.exists() and previous and hashlib.sha256(cached.read_bytes()).hexdigest() == previous["files"].get(name):
            content = (baseline / name).read_bytes()
        else:
            try:
                content = base64.b64decode(get(
                    f"https://chromium.googlesource.com/chromium/src/+/{REVISION}/{name}?format=TEXT"), validate=True)
            except urllib.error.HTTPError as error:
                if error.code != 404:
                    raise
                print(f"Not present in this revision: {name}", flush=True)
                continue
        if previous and name in previous["files"] and hashlib.sha256(content).hexdigest() != previous["files"][name]:
            raise RuntimeError(f"Upstream content differs from lock: {name}")
        target = baseline / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        lock["files"][name] = hashlib.sha256(content).hexdigest()
        print(f"Verified download: {name}", flush=True)
    version = dict(line.split("=", 1) for line in (baseline / "chrome/VERSION").read_text().splitlines())
    actual = ".".join(version[key] for key in ("MAJOR", "MINOR", "BUILD", "PATCH"))
    if actual != VERSION:
        raise RuntimeError(f"Source version mismatch: {actual}")
    if previous:
        lock["depot_tools_revision"] = previous["depot_tools_revision"]
    else:
        depot = json.loads(get("https://chromium.googlesource.com/chromium/tools/depot_tools/+/HEAD?format=JSON").decode().split("\n", 1)[1])
        lock["depot_tools_revision"] = depot["commit"]
    destination = ROOT / "chromium" / "upstream.lock.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    print(f"Locked Chromium {VERSION}, depot_tools {lock['depot_tools_revision']}")


if __name__ == "__main__":
    main()
