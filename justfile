set shell := ["bash", "-cu"]

# Default task when invoking `just` with no arguments.
default: help

help:
    @printf "Available recipes:\n"
    @printf "  build          Build all workspace crates\n"
    @printf "  build-release  Build all workspace crates in release mode\n"
    @printf "  check          Check all workspace crates\n"
    @printf "  test           Run workspace tests\n"
    @printf "  clippy         Run clippy for all targets and workspace crates\n"
    @printf "  clippy-fix     Run clippy with --fix for all targets and workspace crates\n"

    @printf "  fmt            Format all workspace crates\n"
    @printf "  fmt-check      Check formatting for all workspace crates\n"
    @printf "  clean          Remove build artifacts\n"
    @printf "  doc            Build workspace documentation\n"
    @printf "  build-wasm     Build the WASM crate for wasm32-unknown-unknown\n"
    @printf "  test-wasm      Run browser tests for the WASM crate in headless Chrome\n"
    @printf "  npm-install    Install npm workspace dependencies (pnpm install)\n"
    @printf "  npm-build      Build the npm workspace (wasm-pack + tsc)\n"
    @printf "  npm-test       Run npm workspace tests\n"
    @printf "  npm-lint       Lint npm workspace with biome\n"

build:
    cargo build --workspace

build-release:
    cargo build --workspace --release

check:
    cargo check --workspace

test:
    cargo test --workspace --all-targets

clippy:
    cargo clippy --workspace --all-targets -- -D warnings

clippy-fix:
    cargo clippy --workspace --all-targets --fix --allow-dirty --broken-code -- -D warnings

cov:
    RUST_MIN_STACK=67108864 cargo llvm-cov --workspace --open

fmt:
    cargo fmt --all

fmt-check:
    cargo fmt --all -- --check

clean:
    cargo clean

doc:
    cargo doc --workspace --no-deps

build-wasm:
    cargo build -p iroh-chain-wasm --target wasm32-unknown-unknown

test-wasm:
    wasm-pack test --headless --chrome crates/iroh-chain-wasm

npm-install:
    pnpm install

npm-build:
    pnpm --filter @ofnet/iroh-chain-wasm run build

npm-test:
    pnpm --filter @ofnet/iroh-chain-wasm run test

npm-lint:
    pnpm --filter @ofnet/iroh-chain-wasm run lint
