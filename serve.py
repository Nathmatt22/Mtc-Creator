#!/usr/bin/env python3
"""Sert MTC creator en local avec les en-têtes cross-origin isolation.

    python3 serve.py [port]        # http://127.0.0.1:3000

Le jeu Luanti tourne dans une iframe : sans COOP/COEP, le moteur WASM
multi-thread ne démarre pas (« Cette page n'est pas cross-origin isolated »).
Un `python3 -m http.server` classique n'envoie pas ces en-têtes.
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent

HEADERS = (
    ("Cross-Origin-Opener-Policy", "same-origin"),
    ("Cross-Origin-Embedder-Policy", "require-corp"),
    ("Cross-Origin-Resource-Policy", "same-origin"),
    ("Cache-Control", "no-store"),
)


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".json": "application/json",
        ".zip": "application/zip",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        for name, value in HEADERS:
            self.send_header(name, value)
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print("MTC creator : http://127.0.0.1:%d (COOP/COEP actifs)" % port, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
