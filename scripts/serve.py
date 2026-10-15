#!/usr/bin/env python3
"""Local dev server that never lets the browser cache files, so edits show on reload."""
import http.server, socket, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

class DualStack(http.server.ThreadingHTTPServer):
    # listen on IPv6 and IPv4 so "localhost" always reaches this server
    address_family = socket.AF_INET6
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
print(f'GRVTY site on http://localhost:{port}', flush=True)
DualStack(('::', port), NoCache).serve_forever()
