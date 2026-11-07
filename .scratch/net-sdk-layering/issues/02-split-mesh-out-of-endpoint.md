# 02: Split `Mesh` out of `Endpoint` and document delivery semantics

**What to build:** The SDK's public API follows the glossary: `Endpoint` keeps identity and lifecycle (`ready`, `id`, `close()`), the peer allowlist (`peers`, `addPeer`, `removePeer`), and pairing (`pairingEnabled`, `pair`, `onPairingOffer`). A `Mesh` handle exposed from the endpoint (`endpoint.mesh`) carries mesh communication: `broadcast`, `send`, `onMessage`, and `openStream`. The example app and README are updated to the new shape. JSDoc and README state the delivery semantics: `send` requires the destination to be in the allowlist, `peers` is the allowlist inventory (not live connection state), broadcast is a hop-limited flood with dedup, and messages sent to self are delivered to local listeners. This is a breaking API change — rewrite, do not keep the old methods as aliases.

**Blocked by:** 01 (lifecycle hardening), so the moved methods keep their ready/closed guards.

**Status:** ready-for-agent

- [ ] `endpoint.mesh.broadcast` / `send` / `onMessage` / `openStream` work end-to-end in the browser example
- [ ] `Endpoint` no longer exposes mesh messaging methods directly
- [ ] Example app and README API table use the new `Mesh` API
- [ ] JSDoc/README document: `send` needs an allowlisted destination, `peers` = inventory not connections, broadcast = dedup'd flood, self-messages delivered locally
- [ ] Package typecheck (`pnpm check`) and biome lint pass
