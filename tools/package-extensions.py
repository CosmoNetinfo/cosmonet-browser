"""Create deterministic, unsigned extension/theme ZIPs; no CRX signing keys."""
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def archive(destination, files):
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as output:
        for name, data in sorted(files):
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            output.writestr(info, data)


def main():
    target = ROOT / "dist/extensions"
    target.mkdir(parents=True, exist_ok=True)
    extension = ROOT / "extensions/cosmo-home"
    manifest = json.loads((extension / "manifest.json").read_text())
    if manifest.get("host_permissions") or manifest.get("content_scripts"):
        raise ValueError("Cosmo Home must not access visited websites.")
    archive(target / "cosmo-home.zip", [(path.relative_to(extension).as_posix(), path.read_bytes())
                                       for path in extension.rglob("*") if path.is_file()])
    for theme in sorted((ROOT / "themes").glob("*.json")):
        data = theme.read_bytes()
        manifest = json.loads(data)
        if "theme" not in manifest or "permissions" in manifest:
            raise ValueError(f"Invalid theme: {theme}")
        theme_dir = target / theme.stem
        theme_dir.mkdir(exist_ok=True)
        (theme_dir / "manifest.json").write_bytes(data)
        archive(target / ("cosmo-theme-" + theme.stem + ".zip"), [("manifest.json", data)])
    print(f"Extension and themes created in {target}")


if __name__ == "__main__":
    main()
