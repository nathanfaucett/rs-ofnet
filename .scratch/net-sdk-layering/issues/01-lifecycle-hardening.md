# 01: Lifecycle hardening in the TS SDK

**What to build:** The browser SDK must be safe to use at any point in its lifecycle. Calling `onMessage`, `addPeer`, `removePeer`, or setting `pairingEnabled` before `ready` resolves no longer crashes with a `TypeError` — registrations buffer and flush when `ready` resolves. The `peers` getter before `ready` throws a clear "await ready" error instead. `close()` becomes idempotent, and every method called after close throws a clear "endpoint is closed" error. A failed WASM load resets the cached module promise, so constructing a new `Endpoint` retries the import instead of reusing the rejection forever. All changes are TypeScript-side only; the WASM binding is untouched.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `onMessage` / `addPeer` / `removePeer` / `pairingEnabled=` called before `ready` work once `ready` resolves (verified in the browser example)
- [ ] `peers` before `ready` throws a clear not-ready error, not a `TypeError` on undefined
- [ ] Double `close()` resolves; any method called after `close()` throws a clear closed error
- [ ] A failed WASM import can be retried by constructing a new `Endpoint`
- [ ] Failed init does not produce an unhandled promise rejection
- [ ] Package typecheck (`pnpm check`) and biome lint pass
