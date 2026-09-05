"""Run unmodified Glances behind a fail-closed ASGI peer-address gate.

The peer is taken from the socket, never forwarded headers. Tailscale supplies
encrypted, authenticated transport; an explicit inventory supplies authorization.
"""
import ipaddress
import json
import pathlib
import sys


class PeerGate:
    def __init__(self, app, allowed):
        self.app = app
        self.allowed = {str(ipaddress.ip_address(value)) for value in allowed}

    async def __call__(self, scope, receive, send):
        if scope['type'] not in ('http', 'websocket'):
            return await self.app(scope, receive, send)
        peer = (scope.get('client') or ('', 0))[0]
        if peer not in self.allowed:
            if scope['type'] == 'websocket':
                return await send({'type': 'websocket.close', 'code': 1008})
            await send({'type': 'http.response.start', 'status': 403,
                        'headers': [(b'content-type', b'text/plain')]})
            return await send({'type': 'http.response.body', 'body': b'Forbidden'})
        return await self.app(scope, receive, send)


def main():
    import fastapi
    from starlette.middleware import Middleware
    settings = json.loads(pathlib.Path(__file__).with_name('access.json').read_text())
    original = fastapi.FastAPI.__init__

    def guarded(self, *args, **kwargs):
        kwargs['middleware'] = [Middleware(PeerGate, allowed=settings['allowed'])] + list(kwargs.get('middleware') or [])
        return original(self, *args, **kwargs)

    fastapi.FastAPI.__init__ = guarded
    # Uvicorn must not turn untrusted forwarding headers into socket identity.
    import uvicorn
    original_config = uvicorn.Config.__init__

    def config(self, *args, **kwargs):
        kwargs['proxy_headers'] = False
        return original_config(self, *args, **kwargs)

    uvicorn.Config.__init__ = config
    from glances import main as glances_main
    glances_main()


if __name__ == '__main__':
    main()
