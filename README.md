# ofnet

[![License](https://img.shields.io/badge/license-MIT%2FApache--2.0-blue)](LICENSE-MIT)
![Test Status](https://github.com/aicacia/rs-ofnet/actions/workflows/ci.yml/badge.svg)

Offline-first peer-to-peer mesh networking built on [iroh](https://iroh.computer).

## What it does

`ofnet` lets endpoints form a resilient mesh where messages reach peers directly or through relays — no central server required. It includes secure pairing for trusting new devices and works in both native Rust and the browser via WASM.

## Crates

| Crate                                       | Description                                |
| ------------------------------------------- | ------------------------------------------ |
| [`iroh-chain`](crates/iroh-chain)           | Core mesh, pairing, and server logic       |
| [`iroh-chain-wasm`](crates/iroh-chain-wasm) | Browser (WASM) bindings                    |
| [`@ofsdk/net`](packages/net)                | TypeScript SDK for browser mesh networking |

## Features

- **Mesh messaging** — broadcast to all peers or send direct messages with hop-limited forwarding
- **Pairing** — challenge/response handshake to establish trust between endpoints
- **Allowlist hooks** — control which peers and protocols can connect
- **Browser support** — full WASM build with TypeScript SDK

## Quick start

```rust
use iroh::endpoint::presets;
use iroh_chain::{EndpointIdStore, Server};

let server = Server::bind(presets::N0, EndpointIdStore::new()).await?;
server.broadcast(b"hello mesh").await?;
```

See [`packages/net/README.md`](packages/net/README.md) for the browser/TypeScript API.

## License

MIT OR Apache-2.0
