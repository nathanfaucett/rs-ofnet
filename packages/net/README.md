# @ofsdk/net

Mesh networking in the browser via [ofnet](https://github.com/aicacia/rs-ofnet) WASM.

```ts
import { Endpoint } from "@ofsdk/net";

const ep = new Endpoint();
await ep.ready;
console.log(ep.id);

ep.onMessage((msg) => {
  console.log("got:", new TextDecoder().decode(msg.payload));
});

await ep.broadcast(new TextEncoder().encode("hello mesh"));
await ep.close();
```

## API

|                                               |                              |
| --------------------------------------------- | ---------------------------- |
| `new Endpoint(options?)` + `await ep.ready`   | Create a browser endpoint    |
| `ep.id`                                       | This endpoint's `EndpointId` |
| `ep.broadcast(bytes)`                         | Send to all peers            |
| `ep.send(peerId, bytes)`                      | Direct message to one peer   |
| `ep.onMessage(fn)` → `unsub`                  | Listen for incoming messages |
| `ep.peers` / `addPeer(id)` / `removePeer(id)` | Peer allowlist               |
| `ep.pairingEnabled = bool`                    | Toggle pairing mode          |
| `ep.pair(to, bytes)` → reply                  | Send a pairing offer         |
| `ep.onPairingOffer(fn)` → `unsub`             | Handle incoming offers       |
| `ep.openStream(peerId)`                       | Bidirectional byte `Stream`  |
| `ep.close()`                                  | Shut down                    |

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

## Example

See [`example/`](example) — run `just net-example` for a live two-endpoint demo in the browser.

## License

MIT OR Apache-2.0
