# @ofsdk/net

Mesh networking in the browser via [ofnet](https://github.com/aicacia/rs-ofnet) WASM.

```ts
import { Endpoint } from "@ofsdk/net";

const ep = new Endpoint();
await ep.ready;
console.log(ep.id);

ep.mesh.onMessage((msg) => {
  console.log("got:", new TextDecoder().decode(msg.payload));
});

await ep.mesh.broadcast(new TextEncoder().encode("hello mesh"));
await ep.close();
```

## API

### Endpoint

|                            |                                                  |
| -------------------------- | ------------------------------------------------ |
| `new Endpoint(options?)`   | Create a browser endpoint                        |
| `await ep.ready`           | Wait until connected                             |
| `ep.id`                    | This endpoint's `EndpointId`                     |
| `ep.peers`                 | Peer allowlist (inventory, not live connections) |
| `ep.addPeer(id)`           | Add peer to allowlist                            |
| `ep.removePeer(id)`        | Remove peer from allowlist                       |
| `ep.pairingEnabled = bool` | Toggle pairing mode                              |
| `ep.pair(to, bytes)`       | Send a pairing offer                             |
| `ep.onPairingOffer(fn)`    | Handle incoming pairing offers                   |
| `ep.close()`               | Shut down (idempotent)                           |

### Mesh (`ep.mesh`)

|                               |                               |
| ----------------------------- | ----------------------------- |
| `ep.mesh.broadcast(bytes)`    | Send to all peers in the mesh |
| `ep.mesh.send(peerId, bytes)` | Direct message to one peer    |
| `ep.mesh.onMessage(fn)`       | Listen for incoming messages  |
| `ep.mesh.openStream(peerId)`  | Bidirectional byte `Stream`   |

### Stream

|                           |                          |
| ------------------------- | ------------------------ |
| `stream.write(bytes)`     | Write bytes              |
| `stream.finish()`         | Half-close write side    |
| `stream.read(limit)`      | Read up to `limit` bytes |
| `stream.readToEnd(limit)` | Read all remaining bytes |
| `stream.close()`          | Abort the stream         |

### Errors

- `ClosedError` — operation on a closed endpoint
- `NotReadyError` — access before `ready` resolves

## Types

```ts
type EndpointId = string & { __brand: "EndpointId" };

interface Message {
  source: EndpointId;
  destination: EndpointId | null; // null = broadcast
  payload: Uint8Array;
}

interface PairingOffer {
  remote: EndpointId;
  payload: Uint8Array;
  reply(payload: Uint8Array): Promise<void>;
}
```

## Delivery Semantics

- **Broadcast** (`mesh.broadcast`): Hop-limited flood with deduplication. Every peer in the mesh receives the message exactly once (or not at all if TTL expires). Self-sent broadcasts are delivered to local `onMessage` listeners.

- **Direct message** (`mesh.send`): Requires the destination `EndpointId` to be in the sender's peer allowlist (`endpoint.addPeer`). If the peer is not allowlisted, the call fails with a `not-allowed` error. Messages sent to self are delivered to local `onMessage` listeners.

- **Peer allowlist** (`endpoint.peers`): This is an _inventory_ of trusted peer identities, not a live connection roster. The mesh uses it for routing and access control. Use `onPeersChanged` (future) to observe inventory changes.

## Example

See [`example/`](example) — run `just net-example` for a live two-endpoint demo in the browser.

## License

MIT OR Apache-2.0
