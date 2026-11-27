"""Regenerate reviewed source overlays against the downloaded locked baseline."""
import difflib
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / ".work/upstream"
LOCK = json.loads((ROOT / "chromium/upstream.lock.json").read_text())


def main():
    specs = []

    def add(path, replacements):
        original = (BASELINE / path).read_bytes()
        if hashlib.sha256(original).hexdigest() != LOCK["files"][path]:
            raise ValueError(f"Unverified baseline: {path}")
        text = original.decode("utf-8")
        entries = []
        for before, after in replacements:
            count = text.count(before)
            if count != 1:
                raise ValueError(f"Expected one context in {path}; found {count}: {before[:60]}")
            text = text.replace(before, after)
            entries.append({"before": before, "after": after})
        specs.append({"path": path, "replacements": entries,
                      "patchedSha256": hashlib.sha256(text.encode()).hexdigest()})
        return original.decode(), text

    diffs = []

    def change(path, replacements):
        before, after = add(path, replacements)
        diffs.extend(difflib.unified_diff(before.splitlines(True), after.splitlines(True),
                                        fromfile="a/" + path, tofile="b/" + path))

    change("chrome/app/theme/chromium/BRANDING", [
        ("COMPANY_FULLNAME=The Chromium Authors", "COMPANY_FULLNAME=CosmoNet"),
        ("COMPANY_SHORTNAME=The Chromium Authors", "COMPANY_SHORTNAME=CosmoNet"),
        ("PRODUCT_FULLNAME=Chromium", "PRODUCT_FULLNAME=Cosmo Browser"),
        ("PRODUCT_SHORTNAME=Chromium", "PRODUCT_SHORTNAME=Cosmo Browser"),
        ("PRODUCT_INSTALLER_FULLNAME=Chromium Installer", "PRODUCT_INSTALLER_FULLNAME=Cosmo Browser Installer"),
        ("PRODUCT_INSTALLER_SHORTNAME=Chromium Installer", "PRODUCT_INSTALLER_SHORTNAME=Cosmo Browser Installer"),
    ])
    path = "chrome/app/chromium_strings.grd"
    original = (BASELINE / path).read_text(encoding="utf-8")
    replacements = []
    # Match source messages, not identifiers, links, copyright or translation paths.
    import re
    for name in ("IDS_PRODUCT_NAME", "IDS_SHORT_PRODUCT_NAME"):
        candidates = re.findall(r'<message name="' + name + r'"[^>]*>\s*Chromium\s*</message>', original)
        if len(candidates) != 1:
            raise ValueError(f"Product string moved: {name}")
        replacements.append((candidates[0], candidates[0].replace("\n            Chromium\n", "\n            Cosmo Browser\n")))
    change(path, replacements)
    change("chrome/common/chrome_paths_linux.cc", [
        ('std::string data_dir_basename = "chromium";', 'std::string data_dir_basename = "cosmo-browser";'),
    ])
    change("chrome/install_static/chromium_install_modes.h", [
        ('kProductPathName[] = L"Chromium";', 'kProductPathName[] = L"CosmoBrowser";'),
        ('.base_app_name = L"Chromium",', '.base_app_name = L"Cosmo Browser",'),
        ('.base_app_id = L"Chromium",', '.base_app_id = L"CosmoBrowser",'),
        ('.browser_prog_id_prefix = L"ChromiumHTM",', '.browser_prog_id_prefix = L"CosmoBrowserHTM",'),
        ('L"Chromium HTML Document",', 'L"Cosmo Browser HTML Document",'),
        ('.direct_launch_url_scheme = "chromium",', '.direct_launch_url_scheme = "cosmo-browser",'),
        ('.pdf_prog_id_prefix = L"ChromiumPDF",', '.pdf_prog_id_prefix = L"CosmoBrowserPDF",'),
        ('L"Chromium PDF Document",', 'L"Cosmo Browser PDF Document",'),
    ])
    change("components/sync/base/command_line_switches.cc", [
        ('return !base::CommandLine::ForCurrentProcess()->HasSwitch(kDisableSync);',
         '// Cosmo Browser: browser data stays on this device.\n  return false;'),
    ])
    change("chrome/browser/password_manager/factories/account_password_store_factory.cc", [
        ('return BuildPasswordStore(context);',
         '// Cosmo Browser: never create an account-backed password store.\n  return nullptr;'),
    ])
    path = "chrome/browser/password_manager/factories/password_store_backend_factory.cc"
    text = (BASELINE / path).read_text()
    start = text.index("  using password_manager_android_util::PasswordManagerUtilBridge;")
    end = text.index("#else   //  BUILDFLAG(IS_ANDROID)", start)
    change(path, [(text[start:end],
                  "  // Cosmo Browser: no GMS password backend. A device-local Android vault\n"
                  "  // must be implemented and audited before enabling password saving.\n"
                  "  return std::make_unique<password_manager::PasswordStoreEmptyBackend>();\n")])
    path = "chrome/android/java/AndroidManifest.xml"
    text = (BASELINE / path).read_text()
    start = text.index("        {% if backup_key is defined %}")
    end = text.index("        {% endif %}", start) + len("        {% endif %}")
    change(path, [(text[start:end],
                  '        <!-- Cosmo Browser: do not back up browser data to cloud services. -->\n'
                  '        android:allowBackup="false"')])
    out = ROOT / "chromium/patches"
    icons = {f"chrome/app/theme/chromium/product_logo_{size}.png":
             f"branding/icons/cosmo-browser-{size}.png" for size in (16, 22, 24, 32, 48, 64, 128, 256)}
    icons["chrome/app/theme/chromium/win/chromium.ico"] = "branding/icons/cosmo-browser.ico"
    for path, asset in icons.items():
        if path not in LOCK["files"]:
            continue
        specs.append({"path": path, "asset": asset,
                      "patchedSha256": hashlib.sha256((ROOT / asset).read_bytes()).hexdigest()})
    out.mkdir(parents=True, exist_ok=True)
    (out / "series.json").write_text(json.dumps(specs, indent=2) + "\n", encoding="utf-8")
    (out / "cosmo-browser.patch").write_text("".join(diffs), encoding="utf-8")
    print(f"Generated {len(specs)} reviewed source and icon overlays.")


if __name__ == "__main__":
    main()
