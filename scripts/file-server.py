#!/usr/bin/env python3
"""GameData Studio - 本地文件服务
用法: python3 file-server.py
自动下载/更新加载项，同时提供文件读写 API。
"""

import os
import ssl
import json
import base64
import socket
import uuid
import subprocess
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen, Request
from urllib.error import URLError

# Temporary storage for chunked uploads
_chunks = {}  # id -> { 'directory': str, 'fileName': str, 'parts': [str] }

PORT = 9876
DATA_DIR = os.path.join(os.path.expanduser('~'), '.gamedata-studio')
WEB_DIR = os.path.join(DATA_DIR, 'web')
VERSION_FILE = os.path.join(WEB_DIR, 'version.txt')

GITHUB_PAGES = 'https://vinesy-x.github.io/gamedata-studio'
GITHUB_RAW = 'https://raw.githubusercontent.com/Vinesy-x/gamedata-studio/main'
REMOTE_VERSION_URL = f'{GITHUB_PAGES}/version.txt'
SELF_PATH = os.path.abspath(__file__)

# Files to download from GitHub Pages
DIST_FILES = [
    'taskpane.html',
    'taskpane.bundle.js',
    'taskpane.bundle.js.LICENSE.txt',
    'assets/gds-16.png',
    'assets/gds-32.png',
    'assets/gds-80.png',
]

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.ico': 'image/x-icon',
}


def fetch_url(url):
    """Fetch URL content, return bytes or None."""
    try:
        req = Request(url, headers={'User-Agent': 'GameDataStudio/1.0'})
        with urlopen(req, timeout=15) as resp:
            return resp.read()
    except (URLError, OSError) as e:
        print(f'  Warning: failed to fetch {url}: {e}')
        return None


def check_and_update():
    """Download/update add-in files from GitHub Pages."""
    local_version = ''
    if os.path.exists(VERSION_FILE):
        with open(VERSION_FILE) as f:
            local_version = f.read().strip()

    print('Checking for updates...')
    remote_data = fetch_url(REMOTE_VERSION_URL)
    if remote_data is None:
        if local_version:
            print(f'  Offline mode, using cached v{local_version}')
            return True
        print('  ERROR: No cached files and cannot reach GitHub. Check your network.')
        return False

    remote_version = remote_data.decode().strip()
    if remote_version == local_version:
        print(f'  Already up to date (v{local_version})')
        return True

    print(f'  Updating: v{local_version or "none"} -> v{remote_version}')
    os.makedirs(os.path.join(WEB_DIR, 'assets'), exist_ok=True)

    ok = True
    for rel_path in DIST_FILES:
        url = f'{GITHUB_PAGES}/{rel_path}'
        data = fetch_url(url)
        if data is None:
            ok = False
            continue
        local_path = os.path.join(WEB_DIR, rel_path)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'wb') as f:
            f.write(data)
        print(f'  Downloaded {rel_path} ({len(data)} bytes)')

    if ok:
        with open(VERSION_FILE, 'w') as f:
            f.write(remote_version)
        print(f'  Updated to v{remote_version}')
    else:
        print('  Some files failed to download, will retry next time')

    # Self-update: download latest file-server.py from GitHub
    self_update_url = f'{GITHUB_RAW}/scripts/file-server.py'
    new_script = fetch_url(self_update_url)
    if new_script:
        try:
            current = open(SELF_PATH, 'rb').read()
            if new_script != current:
                with open(SELF_PATH, 'wb') as f:
                    f.write(new_script)
                print('  file-server.py updated, restart to apply')
        except Exception as e:
            print(f'  Warning: self-update failed: {e}')

    return True


class FileHandler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # API: read file
        if path == '/api/read-file':
            self._handle_read(parsed)
            return

        # API: git push (execute whitelisted git commands)
        if path == '/api/git-push':
            self._handle_git_push(parsed)
            return

        # API: write file via GET (Office webview blocks POST)
        if path == '/api/write-start':
            self._handle_write_start(parsed)
            return
        if path == '/api/write-chunk':
            self._handle_write_chunk(parsed)
            return
        if path == '/api/write-finish':
            self._handle_write_finish(parsed)
            return

        # Static files
        if path == '/':
            path = '/taskpane.html'
        local_path = os.path.join(WEB_DIR, path.lstrip('/'))
        if os.path.isfile(local_path):
            self._serve_static(local_path)
            return

        self.send_response(404)
        self._cors()
        self.end_headers()

    # ── Git push (whitelisted commands only) ──

    def _handle_git_push(self, parsed):
        params = parse_qs(parsed.query)
        directory = params.get('directory', [''])[0]
        script_b64 = params.get('script', [''])[0]
        if not directory or not script_b64:
            self.send_response(400)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error":"missing params (directory, script)"}')
            return

        try:
            script = base64.b64decode(script_b64).decode('utf-8')
        except Exception as e:
            self.send_response(400)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"base64 decode failed: {e}"}).encode())
            return

        # Security: each line must start with cd, git, or be empty
        for line in script.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            if not (line.startswith('cd ') or line.startswith('git ')):
                self.send_response(403)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"forbidden command: {line}"}).encode())
                return

        print(f'  [git-push] dir={directory}')
        try:
            result = subprocess.run(
                script, shell=True, cwd=directory,
                capture_output=True, text=True, timeout=60
            )
            body = {
                "ok": result.returncode == 0,
                "output": result.stdout,
                "exitCode": result.returncode,
            }
            if result.returncode != 0:
                body["error"] = result.stderr
            print(f'  [git-push] exitCode={result.returncode}')
            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(body).encode())
        except subprocess.TimeoutExpired:
            self.send_response(504)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error":"command timed out (60s)"}')
        except Exception as e:
            self.send_response(500)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    # ── GET-based chunked write (bypass Office proxy POST block) ──

    def _handle_write_start(self, parsed):
        params = parse_qs(parsed.query)
        directory = params.get('directory', [''])[0]
        fileName = params.get('fileName', [''])[0]
        if not directory or not fileName:
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(b'{"error":"missing params"}')
            return
        cid = str(uuid.uuid4())
        _chunks[cid] = {'directory': directory, 'fileName': fileName, 'parts': []}
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'id': cid}).encode())

    def _handle_write_chunk(self, parsed):
        params = parse_qs(parsed.query)
        cid = params.get('id', [''])[0]
        data = params.get('data', [''])[0]
        index = int(params.get('index', ['0'])[0])
        if not cid or cid not in _chunks:
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(b'{"error":"invalid id"}')
            return
        parts = _chunks[cid]['parts']
        # Extend list if needed
        while len(parts) <= index:
            parts.append('')
        parts[index] = data
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def _handle_write_finish(self, parsed):
        params = parse_qs(parsed.query)
        cid = params.get('id', [''])[0]
        if not cid or cid not in _chunks:
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(b'{"error":"invalid id"}')
            return
        info = _chunks.pop(cid)
        directory = info['directory']
        fileName = info['fileName']
        full_b64 = ''.join(info['parts'])
        try:
            os.makedirs(directory, exist_ok=True)
            filepath = os.path.join(directory, fileName)
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(full_b64))
            print(f'  -> {filepath} ({os.path.getsize(filepath)} bytes)')
        except Exception as e:
            print(f'  ERROR: Write failed: {e}')
            self.send_response(500)
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def _serve_static(self, local_path):
        ext = os.path.splitext(local_path)[1].lower()
        content_type = MIME_TYPES.get(ext, 'application/octet-stream')
        with open(local_path, 'rb') as f:
            data = f.read()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _handle_read(self, parsed):
        params = parse_qs(parsed.query)
        directory = params.get('directory', [''])[0]
        fileName = params.get('fileName', [''])[0]

        if not directory or not fileName:
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(b'{"error":"missing params"}')
            return

        filepath = os.path.join(directory, fileName)
        if not os.path.exists(filepath):
            self.send_response(404)
            self._cors()
            self.end_headers()
            self.wfile.write(b'{"error":"not found"}')
            return

        with open(filepath, 'rb') as f:
            data = f.read()
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/octet-stream')
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/api/write-file':
            self.send_response(404)
            self._cors()
            self.end_headers()
            return

        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length)
            body = json.loads(raw)
        except Exception as e:
            print(f'  ERROR: Failed to parse POST body: {e}')
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"parse error: {e}"}).encode())
            return

        directory = body.get('directory', '')
        fileName = body.get('fileName', '')
        data_b64 = body.get('data', '')

        if not directory or not fileName:
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(b'{"error":"missing params"}')
            return

        try:
            os.makedirs(directory, exist_ok=True)
            filepath = os.path.join(directory, fileName)
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(data_b64))
            print(f'  -> {filepath} ({os.path.getsize(filepath)} bytes)')
        except Exception as e:
            print(f'  ERROR: Write failed: {e}')
            self.send_response(500)
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def log_message(self, format, *args):
        pass


class DualStackHTTPServer(HTTPServer):
    address_family = socket.AF_INET6
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


def find_dev_certs():
    """Find office-addin-dev-certs for HTTPS."""
    cert_dir = os.path.expanduser('~/.office-addin-dev-certs')
    cert = os.path.join(cert_dir, 'localhost.crt')
    key = os.path.join(cert_dir, 'localhost.key')
    ca = os.path.join(cert_dir, 'ca.crt')
    if os.path.exists(cert) and os.path.exists(key):
        return cert, key, ca
    return None, None, None


if __name__ == '__main__':
    print('GameData Studio File Server')
    print()

    if not check_and_update():
        raise SystemExit(1)

    try:
        server = DualStackHTTPServer(('::', PORT), FileHandler)
    except OSError:
        server = HTTPServer(('0.0.0.0', PORT), FileHandler)

    # Enable HTTPS if dev certs are available
    cert, key, ca = find_dev_certs()
    protocol = 'http'
    if cert and key:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(cert, key)
        server.socket = ctx.wrap_socket(server.socket, server_side=True)
        protocol = 'https'

    print()
    print(f'Ready! {protocol}://localhost:{PORT}')
    print('Keep this window open while using Excel.')
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
