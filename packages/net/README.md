# @ofnet/net

TypeScript wrapper for [ofnet](https://github.com/aicacia/rs-ofnet) WASM — mesh networking in the browser.

Run ofnet endpoints directly in the browser. Connect through relay servers, exchange broadcasts and direct messages, and participate in pairing.

## Install

```sh
npm install @ofnet/net
```

## Usage

```ts
import { WebServer } from "@ofnet/net";

const server = await WebServer.create({
  relayUrls: ["https://relay.n0.iroh.link"], // optional
});

console.log("Endpoint ID:", server.endpointId);

server.subscribeMessages((source, destination, payload) => {
  console.log("Received:", new TextDecoder().decode(payload));
});

await server.broadcast(new TextEncoder().encode("Hello mesh!"));

await server.close();
```

See [`example/`](./example) for a full Vite + Svelte demo.

## API

| Method | Description |
|--------|-------------|
| `WebServer.create(options)` | Create a browser endpoint |
| `endpointId` | Hex-encoded endpoint ID |
| `broadcast(payload)` | Send to all peers |
| `send(peerId, payload)` | Send to a specific peer |
| `subscribeMessages(cb)` / `unsubscribeMessages(handle)` | Incoming messages |
| `peers()` / `addPeer(id)` / `removePeer(id)` | Peer allowlist |
| `setPairingEnabled(bool)` | Toggle pairing mode |
| `sendPairingOffer(peerId, payload)` | Send a pairing offer |
| `subscribePairingOffers(cb)` / `replyToPairingOffer(handle, payload)` | Handle pairing offers |
| `openStream(peerId)` | Bidirectional byte stream |
| `close()` | Shut down |

## License

MIT OR Apache-2.0
