/**
 * @ofsdk/net — mesh networking in the browser via ofnet WASM.
 *
 * ```ts
 * import { Endpoint } from "@ofsdk/net";
 *
 * const ep = new Endpoint();
 * await ep.ready;
 * ep.onMessage((msg) => console.log(new TextDecoder().decode(msg.payload)));
 * await ep.broadcast(new TextEncoder().encode("hi"));
 * ```
 */

// ── WASM bindings (internal) ──────────────────────────────────────────────

interface WasmModule {
  default(): Promise<void>;
  WebServer: {
    create(
      secretKeyHex: string | null,
      relayUrls: string[],
    ): Promise<WasmWebServer>;
  };
}

interface WasmWebServer {
  endpoint_id(): string;
  broadcast(payload: Uint8Array): Promise<void>;
  send(destinationId: string, payload: Uint8Array): Promise<void>;
  subscribe_messages(
    cb: (
      source: string,
      destination: string | null,
      payload: Uint8Array,
    ) => void,
  ): number;
  unsubscribe_messages(handle: number): void;
  peers(): string[];
  add_peer(id: string): void;
  remove_peer(id: string): void;
  set_pairing_enabled(enabled: boolean): void;
  subscribe_pairing_offers(
    cb: (handle: number, remote: string, payload: Uint8Array) => void,
  ): number;
  unsubscribe_pairing_offers(handle: number): void;
  send_pairing_offer(dest: string, payload: Uint8Array): Promise<Uint8Array>;
  reply_to_pairing_offer(handle: number, payload: Uint8Array): Promise<void>;
  open_stream(peerId: string): Promise<WasmWebStream>;
  close(): Promise<void>;
}

interface WasmWebStream {
  write(payload: Uint8Array): Promise<void>;
  finish(): void;
  read_to_end(limit: number): Promise<Uint8Array>;
}

let wasmModule: Promise<WasmModule> | undefined;

async function loadWasm(): Promise<WasmModule> {
  wasmModule ??= import("../pkg/iroh_chain_wasm.js").then(async (m) => {
    await m.default();
    return m as unknown as WasmModule;
  });
  return wasmModule;
}

// ── Public types ──────────────────────────────────────────────────────────

/** Branded endpoint identifier (hex-encoded public key). */
export type EndpointId = string & { readonly __brand: "EndpointId" };

/** An incoming mesh message. `destination` is null for broadcasts. */
export interface Message {
  readonly source: EndpointId;
  readonly destination: EndpointId | null;
  readonly payload: Uint8Array;
}

/** An incoming pairing offer. Call `reply()` to respond. */
export interface PairingOffer {
  readonly remote: EndpointId;
  readonly payload: Uint8Array;
  reply(payload: Uint8Array): Promise<void>;
}

export interface EndpointOptions {
  /** Hex secret key for a stable identity. Random if omitted. */
  secretKey?: string;
  /** Relay URLs. Defaults to public n0 relays. */
  relayUrls?: string[];
}

/** Returns an unsubscribe function. */
export type Unsubscribe = () => void;

// ── Stream ────────────────────────────────────────────────────────────────

/** Bidirectional byte stream to a peer. */
export class Stream {
  private readonly inner: WasmWebStream;

  /** @internal Use Endpoint.openStream() instead. */
  constructor(inner: WasmWebStream) {
    this.inner = inner;
  }

  write(payload: Uint8Array): Promise<void> {
    return this.inner.write(payload);
  }

  /** Half-close the write side. */
  finish(): void {
    this.inner.finish();
  }

  /** Read everything until the peer finishes, up to `limit` bytes. */
  readToEnd(limit: number): Promise<Uint8Array> {
    return this.inner.read_to_end(limit);
  }
}

// ── Endpoint ──────────────────────────────────────────────────────────────

/** A browser mesh endpoint. */
export class Endpoint {
  /** Resolves when the endpoint is connected and ready. */
  readonly ready: Promise<void>;

  private server!: WasmWebServer;

  constructor(options: EndpointOptions = {}) {
    this.ready = this.init(options);
  }

  private async init(options: EndpointOptions): Promise<void> {
    const { WebServer } = await loadWasm();
    this.server = await WebServer.create(
      options.secretKey ?? null,
      options.relayUrls ?? [],
    );
  }

  /** This endpoint's ID. Await `ready` first. */
  get id(): EndpointId {
    return this.server.endpoint_id() as EndpointId;
  }

  // messaging ──────────────────────────────────────────────────────────────

  /** Broadcast to all peers in the mesh. */
  async broadcast(payload: Uint8Array): Promise<void> {
    await this.ready;
    await this.server.broadcast(payload);
  }

  /** Send a direct message to one peer. */
  async send(to: EndpointId, payload: Uint8Array): Promise<void> {
    await this.ready;
    await this.server.send(to, payload);
  }

  /** Listen for incoming messages. Returns an unsubscribe function. */
  onMessage(listener: (msg: Message) => void): Unsubscribe {
    const handle = this.server.subscribe_messages(
      (source, destination, payload) => {
        listener({
          source: source as EndpointId,
          destination:
            destination === null ? null : (destination as EndpointId),
          payload,
        });
      },
    );
    return () => this.server.unsubscribe_messages(handle);
  }

  // peers ──────────────────────────────────────────────────────────────────

  /** Allowlisted peer IDs. Await `ready` first. */
  get peers(): EndpointId[] {
    return this.server.peers() as EndpointId[];
  }

  addPeer(id: EndpointId): void {
    this.server.add_peer(id);
  }

  removePeer(id: EndpointId): void {
    this.server.remove_peer(id);
  }

  // pairing ────────────────────────────────────────────────────────────────

  /** Enable or disable accepting pairing offers. */
  set pairingEnabled(enabled: boolean) {
    this.server.set_pairing_enabled(enabled);
  }

  /** Send a pairing offer. Resolves with the peer's reply. */
  async pair(to: EndpointId, payload: Uint8Array): Promise<Uint8Array> {
    await this.ready;
    return this.server.send_pairing_offer(to, payload);
  }

  /** Listen for incoming pairing offers. Returns an unsubscribe function. */
  onPairingOffer(listener: (offer: PairingOffer) => void): Unsubscribe {
    const handle = this.server.subscribe_pairing_offers(
      (offerHandle, remote, payload) => {
        listener({
          remote: remote as EndpointId,
          payload,
          reply: (replyPayload) =>
            this.server.reply_to_pairing_offer(offerHandle, replyPayload),
        });
      },
    );
    return () => this.server.unsubscribe_pairing_offers(handle);
  }

  // streams ────────────────────────────────────────────────────────────────

  /** Open a bidirectional byte stream to a peer. */
  async openStream(to: EndpointId): Promise<Stream> {
    await this.ready;
    return new Stream(await this.server.open_stream(to));
  }

  // lifecycle ──────────────────────────────────────────────────────────────

  async close(): Promise<void> {
    await this.ready;
    await this.server.close();
  }
}
