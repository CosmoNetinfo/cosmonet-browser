"""Cosmo Browser Chromium build driver. Python standard library only.

No source reset, forced checkout, global Git changes or privilege escalation.
Full sync is a separate, explicit command and can download tens of GB.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PRODUCT = json.loads((ROOT / "chromium/product.json").read_text(encoding="utf-8"))
LOCK = json.loads((ROOT / "chromium/upstream.lock.json").read_text(encoding="utf-8"))
if isinstance(LOCK["files"], list):
    LOCK["files"] = {entry["path"]: entry["sha256"] for entry in LOCK["files"]}
DEPOT_URL = "https://chromium.googlesource.com/chromium/tools/depot_tools.git"


def run(args, cwd=None, env=None, capture=False):
    args = [str(arg) for arg in args]
    print("+ " + subprocess.list2cmdline(args), flush=True)
    return subprocess.run(args, cwd=cwd, env=env, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None).stdout


def environment(workspace):
    env = os.environ.copy()
    env["PATH"] = str(workspace / "depot_tools") + os.pathsep + env["PATH"]
    env["DEPOT_TOOLS_WIN_TOOLCHAIN"] = "0"
    env["DEPOT_TOOLS_UPDATE"] = "0"
    return env


def depot_command(workspace, name):
    suffix = ".bat" if platform.system() == "Windows" else ""
    return workspace / "depot_tools" / (name + suffix)


def validate_workspace(value):
    workspace = Path(value).resolve()
    if " " in str(workspace):
        raise ValueError("Chromium requires a workspace path without spaces.")
    if any(char in str(workspace) for char in '&|<>^%!"\'`$;\n\r'):
        raise ValueError("Workspace contains shell metacharacters.")
    if workspace == ROOT or ROOT in workspace.parents:
        raise ValueError("Use a separate build workspace, outside this repository.")
    if workspace == workspace.parent:
        raise ValueError("A drive root cannot be the build workspace.")
    return workspace


def doctor(target, workspace):
    checks = []

    def check(name, ok, detail):
        checks.append({"name": name, "ok": bool(ok), "detail": str(detail)})

    host = platform.system()
    check("host", host == PRODUCT["platforms"][target]["host"],
          f"{target} requires {PRODUCT['platforms'][target]['host']}; found {host}")
    check("architecture", platform.machine().lower() in ("amd64", "x86_64"), platform.machine())
    check("git", shutil.which("git"), shutil.which("git") or "Install Git")
    disk_path = workspace
    while not disk_path.exists():
        disk_path = disk_path.parent
    free = shutil.disk_usage(disk_path).free / 1024**3
    check("disk", free >= 120, f"{free:.1f} GiB available; reserve >=120 GiB (more recommended)")
    if host == "Windows" and target == "windows-x64":
        vswhere = Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")) / "Microsoft Visual Studio/Installer/vswhere.exe"
        vs_path = ""
        if vswhere.exists():
            vs_path = subprocess.run([str(vswhere), "-latest", "-products", "*",
                                     "-version", "[18.0,19.0)", "-requires",
                                     "Microsoft.VisualStudio.Component.VC.ATLMFC",
                                     "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
                                     "-property", "installationPath"],
                                    capture_output=True, text=True, check=True).stdout.strip()
        check("visual-studio", vs_path,
              vs_path or "Visual Studio 2026: Desktop C++, x64 tools and ATL/MFC required")
        kits = Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")) / "Windows Kits/10"
        sdk = kits / "Include/10.0.28000.0/um/Windows.h"
        check("windows-sdk", sdk.exists(), f"Required by pinned Chromium: {sdk}")
        debug = kits / "Debuggers/x64/cdb.exe"
        check("debugging-tools", debug.exists(), debug)
        try:
            drive = subprocess.run(["powershell", "-NoProfile", "-Command",
                                    f"[System.IO.DriveInfo]::new('{workspace.anchor}').DriveFormat"],
                                   capture_output=True, text=True, check=True).stdout.strip()
            check("filesystem", drive == "NTFS", drive)
        except (OSError, subprocess.SubprocessError):
            check("filesystem", False, "Could not verify NTFS")
    if host == "Linux":
        check("python", sys.version_info >= (3, 9), platform.python_version())
        check("build-dependencies", shutil.which("pkg-config"),
              "Run src/build/install-build-deps.sh before runhooks")
    return checks


def require_doctor(target, workspace):
    checks = doctor(target, workspace)
    for item in checks:
        print(f"{'OK' if item['ok'] else 'MISSING'} {item['name']}: {item['detail']}")
    if not all(item["ok"] for item in checks):
        raise ValueError("Build prerequisites missing; no source download started.")


def validate_source(src):
    actual = run(["git", "rev-parse", "HEAD"], cwd=src, capture=True).strip()
    if actual != LOCK["revision"]:
        raise ValueError(f"Wrong Chromium revision: {actual}; expected {LOCK['revision']}")


def sync(target, workspace):
    require_doctor(target, workspace)
    marker = workspace / ".cosmo-workspace.json"
    if workspace.exists() and any(workspace.iterdir()) and not marker.exists():
        raise ValueError("Refusing to adopt a nonempty, unmarked workspace.")
    workspace.mkdir(parents=True, exist_ok=True)
    if marker.exists():
        saved = json.loads(marker.read_text())
        if saved != {"target": target, "revision": LOCK["revision"]}:
            raise ValueError("Workspace target/revision differs; use a separate workspace.")
    else:
        marker.write_text(json.dumps({"target": target, "revision": LOCK["revision"]}) + "\n")
    depot = workspace / "depot_tools"
    if not depot.exists():
        run(["git", "clone", DEPOT_URL, depot])
        run(["git", "checkout", "--detach", LOCK["depot_tools_revision"]], cwd=depot)
    depot_sha = run(["git", "rev-parse", "HEAD"], cwd=depot, capture=True).strip()
    if depot_sha != LOCK["depot_tools_revision"]:
        raise ValueError("depot_tools revision differs from lock.")
    src = workspace / "src"
    if not src.exists():
        run(["git", "clone", "--depth", "1", "--branch", LOCK["version"],
             "--config", "core.autocrlf=false", "--config", "core.longpaths=true",
             LOCK["repository"], src])
    validate_source(src)
    if run(["git", "status", "--porcelain", "--untracked-files=no"], cwd=src, capture=True).strip():
        raise ValueError("Source contains modifications. Sync only a clean checkout.")
    target_os = ["android", "linux"] if target == "android-arm64" else []
    config = ("solutions = " + repr([{"name": "src", "url": LOCK["repository"],
               "managed": False, "custom_deps": {}, "custom_vars": {}}]) + "\n"
              + "target_os = " + repr(target_os) + "\n")
    config_path = workspace / ".gclient"
    if config_path.exists() and config_path.read_text() != config:
        raise ValueError("Existing .gclient differs; refusing to overwrite it.")
    config_path.write_text(config)
    run([depot_command(workspace, "gclient"), "sync", "--nohooks",
         "--revision", "src@" + LOCK["revision"]], cwd=workspace, env=environment(workspace))
    print("Dependencies synced. On Linux, install build dependencies, then run configure.")


def apply_patches(src, require_revision=True):
    if require_revision:
        validate_source(src)
    series = json.loads((ROOT / "chromium/patches/series.json").read_text())
    pending = []
    # Validate EVERY file before touching ANY file. Drift is a hard failure.
    for spec in series:
        path = src / spec["path"]
        data = path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        original = LOCK["files"][spec["path"]]
        if digest == spec["patchedSha256"]:
            continue
        if digest != original:
            raise ValueError(f"Source drift in {spec['path']}; nothing applied.")
        if "asset" in spec:
            patched = (ROOT / spec["asset"]).read_bytes()
        else:
            text = data.decode("utf-8")
            for replacement in spec["replacements"]:
                before, after = replacement["before"], replacement["after"]
                if text.count(before) != replacement.get("count", 1):
                    raise ValueError(f"Patch context mismatch in {spec['path']}")
                text = text.replace(before, after)
            patched = text.encode("utf-8")
        if hashlib.sha256(patched).hexdigest() != spec["patchedSha256"]:
            raise ValueError(f"Patch result mismatch: {spec['path']}")
        pending.append((path, patched))
    for path, data in pending:
        temporary = path.with_name(path.name + ".cosmo-tmp")
        temporary.write_bytes(data)
        temporary.replace(path)
    print(f"Applied {len(pending)} source changes; already applied: {len(series)-len(pending)}")


def configure(target, workspace):
    require_doctor(target, workspace)
    src = workspace / "src"
    apply_patches(src)
    env = environment(workspace)
    run([depot_command(workspace, "gclient"), "runhooks"], cwd=workspace, env=env)
    output = src / "out" / ("Cosmo-" + target)
    output.mkdir(parents=True, exist_ok=True)
    (output / "args.gn").write_bytes((ROOT / "chromium/args" / (target + ".gn")).read_bytes())
    run([depot_command(workspace, "gn"), "gen", str(output), "--fail-on-unused-args"], cwd=src, env=env)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["doctor", "sync", "apply", "configure", "build"])
    parser.add_argument("--target", choices=list(PRODUCT["platforms"]), required=True)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--json", action="store_true", help="Machine-readable doctor output")
    args = parser.parse_args()
    workspace = validate_workspace(args.workspace)
    if args.command == "doctor":
        checks = doctor(args.target, workspace)
        if args.json:
            print(json.dumps({"target": args.target, "checks": checks}, indent=2))
        else:
            for item in checks:
                print(f"{'OK' if item['ok'] else 'MISSING'} {item['name']}: {item['detail']}")
        return 0 if all(item["ok"] for item in checks) else 2
    if args.command == "sync":
        sync(args.target, workspace)
    elif args.command == "apply":
        apply_patches(workspace / "src")
    elif args.command == "configure":
        configure(args.target, workspace)
    elif args.command == "build":
        require_doctor(args.target, workspace)
        validate_source(workspace / "src")
        # Recheck patch state; a pristine checkout cannot bypass privacy changes.
        apply_patches(workspace / "src")
        out = workspace / "src/out" / ("Cosmo-" + args.target)
        if not (out / "build.ninja").exists():
            raise ValueError("Run configure first.")
        run([depot_command(workspace, "autoninja"), "-C", out,
             PRODUCT["platforms"][args.target]["target"]],
            cwd=workspace / "src", env=environment(workspace))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
