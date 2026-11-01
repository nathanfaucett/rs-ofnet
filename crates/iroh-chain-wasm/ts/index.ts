import {
    WebServer as WasmWebServer,
    WebStream as WasmWebStream,
} from "../pkg/iroh_chain_wasm.js";

export type MessageCallback = (
    source: string,
    destination: string | null,
    payload: Uint8Array,
) => void;

export type PairingOfferCallback = (
    handle: number,
    remote: string,
    payload: Uint8Array,
) => void;

export interface CreateOptions {
    secretKey?: string;
    relayUrls?: string[];
}

export class WebStream {
    private _stream: WasmWebStream;

    constructor(stream: WasmWebStream) {
        this._stream = stream;
    }

    async write(payload: Uint8Array): Promise<void> {
        await this._stream.write(payload);
    }

    finish(): void {
        this._stream.finish();
    }

    async readToEnd(limit: number): Promise<Uint8Array> {
        return await this._stream.read_to_end(limit);
    }
}

export class WebServer {
    private _server: WasmWebServer;
    private _messageCallbacks: Map<number, MessageCallback> = new Map();
    private _pairingCallbacks: Map<number, PairingOfferCallback> = new Map();
    private _nextCallbackId = 1;

    private constructor(server: WasmWebServer) {
        this._server = server;
    }

    static async create(options: CreateOptions = {}): Promise<WebServer> {
        const server = await WasmWebServer.create(
            options.secretKey ?? null,
            options.relayUrls ?? [],
        );
        return new WebServer(server);
    }

    get endpointId(): string {
        return this._server.endpoint_id();
    }

    async broadcast(payload: Uint8Array): Promise<void> {
        await this._server.broadcast(payload);
    }

    async send(destinationId: string, payload: Uint8Array): Promise<void> {
        await this._server.send(destinationId, payload);
    }

    subscribeMessages(callback: MessageCallback): number {
        const handle = this._nextCallbackId++;
        this._messageCallbacks.set(handle, callback);
        this._server.subscribe_messages(
            (
                source: string,
                destination: string | null,
                payload: Uint8Array,
            ) => {
                const cb = this._messageCallbacks.get(handle);
                if (cb) cb(source, destination, payload);
            },
        );
        return handle;
    }

    unsubscribeMessages(handle: number): void {
        this._messageCallbacks.delete(handle);
        this._server.unsubscribe_messages(handle);
    }

    peers(): string[] {
        return this._server.peers();
    }

    addPeer(id: string): void {
        this._server.add_peer(id);
    }

    removePeer(id: string): void {
        this._server.remove_peer(id);
    }

    setPairingEnabled(enabled: boolean): void {
        this._server.set_pairing_enabled(enabled);
    }

    subscribePairingOffers(callback: PairingOfferCallback): number {
        const handle = this._nextCallbackId++;
        this._pairingCallbacks.set(handle, callback);
        this._server.subscribe_pairing_offers(
            (handle: number, remote: string, payload: Uint8Array) => {
                const cb = this._pairingCallbacks.get(handle);
                if (cb) cb(handle, remote, payload);
            },
        );
        return handle;
    }

    async sendPairingOffer(
        destinationId: string,
        payload: Uint8Array,
    ): Promise<Uint8Array> {
        return await this._server.send_pairing_offer(destinationId, payload);
    }

    async replyToPairingOffer(
        handle: number,
        payload: Uint8Array,
    ): Promise<void> {
        await this._server.reply_to_pairing_offer(handle, payload);
    }

    async openStream(peerId: string): Promise<WebStream> {
        const stream = await this._server.open_stream(peerId);
        return new WebStream(stream);
    }

    async close(): Promise<void> {
        await this._server.close();
    }
}

export { WasmWebServer, WasmWebStream };
