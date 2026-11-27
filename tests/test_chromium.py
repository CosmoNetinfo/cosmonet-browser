import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("cosmo_build", ROOT / "tools/chromium.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class SourceOverlayTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.src = Path(self.temp.name) / "src"
        self.series = json.loads((ROOT / "chromium/patches/series.json").read_text())
        for change in self.series:
            source = ROOT / ".work/upstream" / change["path"]
            self.assertTrue(source.exists(), "Run tools/fetch-upstream.py before upstream tests")
            destination = self.src / change["path"]
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)

    def apply(self):
        build.apply_patches(self.src, require_revision=False)

    def test_exact_upstream_baseline_and_idempotence(self):
        self.apply()
        self.apply()
        for change in self.series:
            self.assertEqual(hashlib.sha256((self.src / change["path"]).read_bytes()).hexdigest(),
                             change["patchedSha256"])

    def test_source_drift_does_not_partially_patch_checkout(self):
        changed = self.src / self.series[-1]["path"]
        changed.write_bytes(changed.read_bytes() + b"\n// local edit\n")
        first = self.src / self.series[0]["path"]
        before = first.read_bytes()
        with self.assertRaisesRegex(ValueError, "Source drift"):
            self.apply()
        self.assertEqual(first.read_bytes(), before)

    def test_wrong_revision_is_rejected_before_changes(self):
        with patch.object(build, "run", return_value="a" * 40):
            with self.assertRaisesRegex(ValueError, "Wrong Chromium revision"):
                build.apply_patches(self.src)

    def test_local_only_guards_and_profile_separation(self):
        self.apply()
        sync = (self.src / "components/sync/base/command_line_switches.cc").read_text()
        self.assertIn("return false;", sync)
        self.assertNotIn("return !base::CommandLine", sync)
        account = (self.src / "chrome/browser/password_manager/factories/account_password_store_factory.cc").read_text()
        self.assertNotIn("return BuildPasswordStore(context);", account)
        backend = (self.src / "chrome/browser/password_manager/factories/password_store_backend_factory.cc").read_text()
        self.assertNotIn("make_unique<password_manager::PasswordStoreAndroidLocalBackend>", backend)
        self.assertIn("PasswordStoreBuiltInBackend", backend, "Desktop native password backend must remain")
        android = (self.src / "chrome/android/java/AndroidManifest.xml").read_text()
        self.assertNotIn('android:allowBackup="true"', android)
        self.assertNotIn('android:backupAgent=', android)
        self.assertIn('data_dir_basename = "cosmo-browser"',
                      (self.src / "chrome/common/chrome_paths_linux.cc").read_text())
        self.assertIn('kProductPathName[] = L"CosmoBrowser"',
                      (self.src / "chrome/install_static/chromium_install_modes.h").read_text())

    def test_upstream_copyright_is_preserved(self):
        self.apply()
        branding = (self.src / "chrome/app/theme/chromium/BRANDING").read_text()
        self.assertIn("The Chromium Authors. All rights reserved.", branding)


class ConfigurationTests(unittest.TestCase):
    def test_builds_do_not_weaken_sandbox_or_site_isolation(self):
        for args in (ROOT / "chromium/args").glob("*.gn"):
            text = args.read_text()
            for dangerous in ("no-sandbox", "disable-web-security", "disable-site-isolation", "enable_nacl"):
                self.assertNotIn(dangerous, text)
            self.assertIn("use_remoteexec = false", text)
            self.assertIn("is_debug = false", text)

    def test_android_has_own_package(self):
        text = (ROOT / "chromium/args/android-arm64.gn").read_text()
        self.assertIn('chrome_public_manifest_package = "info.cosmonet.browser"', text)

    def test_workspace_rejects_shell_metacharacters_and_repository(self):
        for name in (str(ROOT), str(ROOT / "build"), "/tmp/cosmo;echo", "/tmp/cosmo&evil"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                build.validate_workspace(name)

    def test_desktop_and_android_hosts_are_explicit(self):
        self.assertEqual(build.PRODUCT["platforms"]["android-arm64"]["host"], "Linux")
        self.assertFalse(build.PRODUCT["distribution"]["publicReleaseReady"])


if __name__ == "__main__":
    unittest.main()
