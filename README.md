# FydeDrop

FydeDrop enables file transfering in the same network. It is a fork of [Snapdrop](https://github.com/RobinLinus/snapdrop).

FydeDrop is built with:
* Vanilla HTML5 / ES6 / CSS3
* Progressive Web App
* [WebRTC](http://webrtc.org/)
* [WebSockets](http://www.websocket.org/) fallback
* [NodeJS](https://nodejs.org/en/)
* [Material Design](https://material.google.com/)

## Introduction

FydeDrop uses a P2P connection if WebRTC is supported by the browser. WebRTC needs a signaling serve, but it is only used to establish a connection and is not involved in the file transfer.

None of files are ever sent to any server. Files are sent only between peers.

Peers sharing the same public IP will enter the same *room* to transfer files. That makes the transfer only work in the same network.

## Development

### STUN

As a signaling server is required to get the peer's public IP to establish P2P connection, FydeDrop is connecting to a STUN deployed with [STUNTMAN](http://www.stunprotocol.org/). Before that [coturn](https://github.com/coturn/coturn) is used instead which acts as both STUN and TURN server. We do not want relaying as a fallback when P2P connection is unavailable, so STUNTMAN is enough for FydeDrop.

### Frontend

```bash
docker-compose up
```

Now visit http://localhost:6080 in your browser.
    
### Nginx

The client expects the server at http(s)://your.domain/server.

When serving the node server behind a proxy the "X-Forwarded-For" header has to be set by the proxy. Otherwise all clients that are served by the proxy will be mutually visible.

By default the server listens on port 6000.

For the nginx configuration, see nginx/default.conf.

## Deployment

Check docker.sh for more commands.

```bash
./docker.sh start
```

### Caveat

Since FydeDrop is [PWA](https://en.wikipedia.org/wiki/Progressive_web_application), the service worker will cache website resources in local. To deliver the update to users in time, there are 2 lines should been modified in every release.

### service-worker.js

Bump the version in `CACHE_NAME`.

### index.html

Bump the version in CSS and JS resource URL, e.g.

- Bump the version in `<link rel="stylesheet" href="styles.css?version">` to force the browser to fetch CSS.
- Bump the version in `<script src="scripts/ui.js?version"></script>` to force the browser to fetch JS.
