/**
 * @ofnet/net - TypeScript wrapper for ofnet WASM (mesh networking in the browser)
 *
 * Provides a typed interface to the ofnet WASM module, which lets browser
 * endpoints join a mesh, exchange broadcasts and direct messages, and
 * participate in pairing — all through relay servers.
 */

// WASM module types (loaded dynamically)
interface WasmModule {
  default(): Promise<void>;
  WebServer: WasmWebServerCtor;
  WebStream: WasmWebStreamCtor;
}

interface WasmWebServerCtor {
  create(
    secretKeyHex: string | null,
    relayUrls: string[],
  ): Promise<WasmWebServer>;
}

interface WasmWebStreamCtor {
  new (): WasmWebStream;
}

interface WasmWebServer {
  endpoint_id(): string;
  broadcast(payload: Uint8Array): Promise<void>;
  send(destinationId: string, payload: Uint8Array): Promise<void>;
  subscribe_messages(
    callback: (
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
    callback: (handle: number, remote: string, payload: Uint8Array) => void,
  ): number;
  send_pairing_offer(
    destinationId: string,
    payload: Uint8Array,
  ): Promise<Uint8Array>;
  reply_to_pairing_offer(handle: number, payload: Uint8Array): Promise<void>;
  open_stream(peerId: string): Promise<WasmWebStream>;
  close(): Promise<void>;
}

interface WasmWebStream {
  write(payload: Uint8Array): Promise<void>;
  finish(): void;
  read_to_end(limit: number): Promise<Uint8Array>;
}

/** Callback for incoming messages. `destination` is null for broadcasts. */
export type MessageCallback = (
  source: string,
  destination: string | null,
  payload: Uint8Array,
) => void;

/** Callback for incoming pairing offers. */
export type PairingOfferCallback = (
  handle: number,
  remote: string,
  payload: Uint8Array,
) => void;

/** Options for creating a WebServer. */
export interface CreateOptions {
  /** Hex-encoded secret key for a stable endpoint identity. Generated if omitted. */
  secretKey?: string;
  /** Relay server URLs. Defaults to public n0 relays if omitted. */
  relayUrls?: string[];
}

let wasmModule: Promise<WasmModule> | undefined;

/** Load and initialize the WASM module once per page. */
async function loadWasm(): Promise<WasmModule> {
  wasmModule ??= import("../pkg/iroh_chain_wasm.js").then(async (module) => {
    await module.default();
    return module as unknown as WasmModule;
  });
  return wasmModule;
}

/** Bidirectional byte stream to a peer. */
export class WebStream {
  private readonly stream: WasmWebStream;

  /** @internal Use WebServer.openStream() instead. */
  constructor(stream: WasmWebStream) {
    this.stream = stream;
  }

  /** Write bytes to the stream. */
  async write(payload: Uint8Array): Promise<void> {
    await this.stream.write(payload);
  }

  /** Signal that no more bytes will be written. */
  finish(): void {
    this.stream.finish();
  }

  /** Read until the stream ends, up to `limit` bytes. */
  async readToEnd(limit: number): Promise<Uint8Array> {
    return await this.stream.read_to_end(limit);
  }
}

/** Browser mesh endpoint. */
export class WebServer {
  private constructor(private readonly server: WasmWebServer) {}

  /** Create a new browser endpoint. */
  static async create(options: CreateOptions = {}): Promise<WebServer> {
    const { WebServer: Ctor } = await loadWasm();
    const server = await Ctor.create(
      options.secretKey ?? null,
      options.relayUrls ?? [],
    );
    return new WebServer(server);
  }

  /** Hex-encoded endpoint ID. */
  get endpointId(): string {
    return this.server.endpoint_id();
  }

  /** Send a broadcast to all peers in the mesh. */
  async broadcast(payload: Uint8Array): Promise<void> {
    await this.server.broadcast(payload);
  }

  /** Send a direct message to a specific endpoint. */
  async send(destinationId: string, payload: Uint8Array): Promise<void> {
    await this.server.send(destinationId, payload);
  }

  /** Subscribe to incoming messages. Returns a handle for unsubscribing. */
  subscribeMessages(callback: MessageCallback): number {
    return this.server.subscribe_messages(callback);
  }

  /** Remove a message subscription. */
  unsubscribeMessages(handle: number): void {
    this.server.unsubscribe_messages(handle);
  }

  /** List allowlisted peer endpoint IDs. */
  peers(): string[] {
    return this.server.peers();
  }

  /** Add a peer to the allowlist. */
  addPeer(id: string): void {
    this.server.add_peer(id);
  }

  /** Remove a peer from the allowlist. */
  removePeer(id: string): void {
    this.server.remove_peer(id);
  }

  /** Enable or disable pairing mode. */
  setPairingEnabled(enabled: boolean): void {
    this.server.set_pairing_enabled(enabled);
  }

  /** Subscribe to incoming pairing offers. Returns a handle. */
  subscribePairingOffers(callback: PairingOfferCallback): number {
    return this.server.subscribe_pairing_offers(callback);
  }

  /** Send a pairing offer to a peer. Resolves with the reply payload. */
  async sendPairingOffer(
    destinationId: string,
    payload: Uint8Array,
  ): Promise<Uint8Array> {
    return await this.server.send_pairing_offer(destinationId, payload);
  }

  /** Reply to a received pairing offer. */
  async replyToPairingOffer(
    handle: number,
    payload: Uint8Array,
  ): Promise<void> {
    await this.server.reply_to_pairing_offer(handle, payload);
  }

  /** Open a bidirectional byte stream to a peer. */
  async openStream(peerId: string): Promise<WebStream> {
    const stream = await this.server.open_stream(peerId);
    return new WebStream(stream);
  }

  /** Shut down the endpoint. */
  async close(): Promise<void> {
    await this.server.close();
  }
}
