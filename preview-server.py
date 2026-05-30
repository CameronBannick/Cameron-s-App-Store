"""Minimal dependency-free static file server for previewing the store locally.
Avoids Python's http.server (broken in some Anaconda installs). Run:  python preview-server.py
Then open http://localhost:8080 in a browser. Ctrl+C to stop."""
import socket, os, mimetypes, threading
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.abspath(__file__))
HOST, PORT = "0.0.0.0", 8080
mimetypes.add_type("application/vnd.android.package-archive", ".apk")
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("image/svg+xml", ".svg")


def handle(conn):
    try:
        data = conn.recv(65536).decode("latin-1")
        if not data:
            return
        line = data.split("\r\n", 1)[0]
        parts = line.split(" ")
        if len(parts) < 2:
            return
        path = unquote(parts[1].split("?", 1)[0])
        if path == "/" or path == "":
            path = "/index.html"
        fs = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
        if not fs.startswith(ROOT) or not os.path.isfile(fs):
            body = b"404 Not Found"
            conn.sendall(b"HTTP/1.1 404 Not Found\r\nContent-Length: %d\r\n\r\n%s" % (len(body), body))
            return
        ctype = mimetypes.guess_type(fs)[0] or "application/octet-stream"
        with open(fs, "rb") as f:
            body = f.read()
        headers = (
            "HTTP/1.1 200 OK\r\n"
            f"Content-Type: {ctype}\r\n"
            f"Content-Length: {len(body)}\r\n"
            "Cache-Control: no-store\r\n"
            "Connection: close\r\n\r\n"
        ).encode("latin-1")
        conn.sendall(headers + body)
    except Exception:
        pass
    finally:
        conn.close()


def main():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((HOST, PORT))
    srv.listen(16)
    print(f"Cameron's App Store preview running at http://localhost:{PORT}  (Ctrl+C to stop)")
    while True:
        conn, _ = srv.accept()
        threading.Thread(target=handle, args=(conn,), daemon=True).start()


if __name__ == "__main__":
    main()
