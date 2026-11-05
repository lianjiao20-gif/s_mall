import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name('prepare-known-hosts.sh')
HOST = 'deploy.example.com'


class PrepareKnownHostsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.keys = tempfile.TemporaryDirectory()
        cls.public_keys = {}
        for kind in ('ed25519', 'ecdsa'):
            key_path = Path(cls.keys.name) / kind
            subprocess.run(['ssh-keygen', '-q', '-t', kind, '-N', '', '-f', str(key_path)], check=True)
            cls.public_keys[kind] = key_path.with_suffix('.pub').read_text().strip()

    @classmethod
    def tearDownClass(cls):
        cls.keys.cleanup()

    def prepare(self, value):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        output = Path(directory.name) / 'known_hosts'
        result = subprocess.run(
            ['bash', str(SCRIPT), str(output)], capture_output=True, text=True,
            env={**os.environ, 'DEPLOY_HOST': HOST, 'DEPLOY_KNOWN_HOSTS': value},
        )
        return result, output

    def assert_matches_host(self, output):
        result = subprocess.run(['ssh-keygen', '-F', HOST, '-f', str(output)], capture_output=True)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(output.stat().st_mode & 0o777, 0o600)

    def test_accepts_matching_known_hosts_record(self):
        result, output = self.prepare(f'{HOST} {self.public_keys["ed25519"]}\n')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_matches_host(output)

    def test_binds_bare_server_public_key_to_deploy_host(self):
        result, output = self.prepare(self.public_keys['ed25519'] + '\r\n')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_matches_host(output)

    def test_accepts_ecdsa_instead_of_requiring_ed25519(self):
        result, output = self.prepare(f'{HOST} {self.public_keys["ecdsa"]}')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_matches_host(output)

    def test_accepts_hashed_host_record(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'known_hosts'
            path.write_text(f'{HOST} {self.public_keys["ed25519"]}\n')
            subprocess.run(['ssh-keygen', '-H', '-f', str(path)], check=True, capture_output=True)
            value = path.read_text()
        result, output = self.prepare(value)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_matches_host(output)

    def test_rejects_full_record_for_another_host(self):
        result, output = self.prepare(f'other.example.com {self.public_keys["ed25519"]}')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('does not match DEPLOY_HOST', result.stderr)
        self.assertFalse(output.exists())

    def test_rejects_fingerprint_with_actionable_message(self):
        result, output = self.prepare('SHA256:not-a-public-host-key')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('fingerprint', result.stderr)
        self.assertFalse(output.exists())

    def test_rejects_invalid_key_without_printing_secret(self):
        value = f'{HOST} ssh-ed25519 sensitive-invalid-value'
        result, output = self.prepare(value)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('not a valid SSH public key', result.stderr)
        self.assertNotIn('sensitive-invalid-value', result.stderr + result.stdout)
        self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
