import asyncio
import importlib.util
import pathlib
import unittest
import tempfile
import time
import sys
spec = importlib.util.spec_from_file_location('launcher', pathlib.Path(__file__).with_name('launch.py'))
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class GateTests(unittest.TestCase):
    def test_allowlist_uses_socket_not_forwarded_header(self):
        async def check(peer, expected):
            messages = []
            async def app(scope, receive, send):
                await send({'type': 'http.response.start', 'status': 204})
            async def send(message):
                messages.append(message)
            await launcher.PeerGate(app, ['100.70.1.2'])({'type': 'http', 'client': (peer, 1), 'headers': [(b'x-forwarded-for', b'100.70.1.2')]}, None, send)
            self.assertEqual(messages[0]['status'], expected)
        asyncio.run(check('100.70.1.2', 204))
        asyncio.run(check('127.0.0.1', 403))
        asyncio.run(check('100.70.1.3', 403))

    def test_timed_out_command_cleans_its_process_group(self):
        if sys.platform == 'win32':
            self.skipTest('POSIX process-group test')
        node_spec = importlib.util.spec_from_file_location('node', pathlib.Path(__file__).with_name('node.py'))
        node = importlib.util.module_from_spec(node_spec)
        node_spec.loader.exec_module(node)
        with tempfile.TemporaryDirectory() as folder:
            marker = pathlib.Path(folder) / 'orphan'
            child = 'import time,pathlib; time.sleep(0.5); pathlib.Path(' + repr(str(marker)) + ').touch()'
            parent = 'import subprocess,sys,time; subprocess.Popen([sys.executable,"-c",' + repr(child) + ']); time.sleep(10)'
            with self.assertRaisesRegex(RuntimeError, 'command_timeout'):
                node.command([sys.executable, '-c', parent], timeout=0.15)
            time.sleep(0.6)
            self.assertFalse(marker.exists())


if __name__ == '__main__':
    unittest.main()
