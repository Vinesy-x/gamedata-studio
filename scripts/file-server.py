#!/usr/bin/env python3
"""GameData Studio - 本地文件写入服务
用法: python3 file-server.py
启动后最小化即可，加载项会自动连接。
"""

import os
import json
import base64
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 9876

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
        if parsed.path != '/api/read-file':
            self.send_response(404)
            self._cors()
            self.end_headers()
            return

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

        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length))
        directory = body.get('directory', '')
        fileName = body.get('fileName', '')
        data_b64 = body.get('data', '')

        if not directory or not fileName:
            self.send_response(400)
            self._cors()
            self.end_headers()
            self.wfile.write(b'{"error":"missing params"}')
            return

        os.makedirs(directory, exist_ok=True)
        filepath = os.path.join(directory, fileName)
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(data_b64))

        print(f'  -> {filepath} ({os.path.getsize(filepath)} bytes)')
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def log_message(self, format, *args):
        pass  # 静默日志

if __name__ == '__main__':
    print(f'GameData Studio File Server')
    print(f'Listening on http://localhost:{PORT}')
    print(f'Keep this window open while using the add-in.')
    print()
    server = HTTPServer(('127.0.0.1', PORT), FileHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
