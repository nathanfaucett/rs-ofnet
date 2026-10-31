# 03: Extend TS API with peer management, pairing, and byte streams

**What to build:** The `WebServer` TS API covers the full endpoint lifecycle — allowlist management, pairing flow, and raw byte streams.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] `peers() -> Vec<String>` — list allowlisted peer IDs
- [ ] `add_peer(id: String)` / `remove_peer(id: String)` — manage allowlist
- [ ] `set_pairing_enabled(enabled: bool)` — toggle pairing mode
- [ ] `subscribe_pairing_offers(callback) -> u32` — register JS callback for incoming pairing offers
- [ ] `reply_to_pairing_offer(offer_handle, payload: Uint8Array)` — respond to a pairing offer
- [ ] `open_stream(peer_id: String) -> WebStream` — open a byte stream to a peer
