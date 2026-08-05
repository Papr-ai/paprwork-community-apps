import http.server, socketserver, os

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        '.html': 'text/html', '.js': 'application/javascript',
        '.json': 'application/json', '.jsonp': 'application/javascript',
        '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
        '.png': 'image/png', '.css': 'text/css',
        '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
        '': 'application/octet-stream',
    }
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    def log_message(self, format, *args): pass

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pitch_deck'))
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", 18899), Handler) as httpd:
    httpd.serve_forever()
