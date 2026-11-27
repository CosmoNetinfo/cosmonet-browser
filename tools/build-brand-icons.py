"""Export the approved bitmap mark to browser/app icon formats, preserving alpha.

Development-only dependency: Pillow. No creative alteration of the source logo.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    master = Image.open(ROOT / "branding/cosmo-browser-master.png").convert("RGBA")
    if master.width != master.height:
        raise ValueError("Logo master must be square.")
    if master.getchannel("A").getextrema()[0] != 0:
        raise ValueError("Logo master must have a transparent background.")
    output = ROOT / "branding/icons"
    output.mkdir(parents=True, exist_ok=True)
    extension = ROOT / "extensions/cosmo-home/icons"
    extension.mkdir(parents=True, exist_ok=True)
    for size in (16, 22, 24, 32, 48, 64, 128, 192, 256, 512, 1024):
        icon = master.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(output / f"cosmo-browser-{size}.png", optimize=True)
        if size in (16, 32, 48, 128):
            icon.save(extension / f"cosmo-{size}.png", optimize=True)
    master.save(output / "cosmo-browser.ico", format="ICO",
                sizes=[(size, size) for size in (16, 24, 32, 48, 64, 128, 256)])
    (ROOT / "favicon.ico").write_bytes((output / "cosmo-browser.ico").read_bytes())
    (ROOT / "favicon.png").write_bytes((output / "cosmo-browser-32.png").read_bytes())
    # Separate versioned favicon; preserve historical brand assets.
    for directory in (ROOT / "src-web/assets", ROOT / "www/assets"):
        (directory / "cosmo-browser-favicon.png").write_bytes((output / "cosmo-browser-32.png").read_bytes())
    print(f"Exported transparent PNG icons and multi-resolution ICO to {output}")


if __name__ == "__main__":
    main()
