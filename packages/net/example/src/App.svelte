<script lang="ts">
    import { Endpoint, type Message } from "@ofsdk/net";

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let alice: Endpoint | undefined = $state();
    let bob: Endpoint | undefined = $state();
    let aliceId = $state("connecting…");
    let bobId = $state("connecting…");
    let logs: string[] = $state([]);

    function log(msg: string) {
        logs = [...logs, msg];
    }

    function handleMessage(name: string) {
        return (msg: Message) => {
            const kind = msg.destination === null ? "broadcast" : "direct";
            log(
                `${name} ← ${kind} from ${msg.source.slice(0, 12)}…: ${decoder.decode(msg.payload)}`,
            );
        };
    }

    async function init() {
        log("Creating Alice and Bob...");
        const a = new Endpoint();
        const b = new Endpoint();
        await Promise.all([a.ready, b.ready]);

        alice = a;
        bob = b;
        aliceId = a.id;
        bobId = b.id;
        log(`Alice: ${a.id}`);
        log(`Bob:   ${b.id}`);

        a.addPeer(b.id);
        b.addPeer(a.id);
        log("Peers added.");

        b.mesh.onMessage(handleMessage("Bob"));
        a.mesh.onMessage(handleMessage("Alice"));

        log("Ready. Click the buttons to send messages.");
    }

    let sending = $state(false);

    async function send(fn: () => Promise<void>, label: string) {
        sending = true;
        try {
            await fn();
            log(`${label} sent.`);
        } catch (err) {
            log(`Error sending ${label}: ${err}`);
        } finally {
            sending = false;
        }
    }

    function broadcast() {
        const ep = alice;
        if (!ep) return;
        void send(
            () => ep.mesh.broadcast(encoder.encode("Hello from Alice!")),
            "broadcast",
        );
    }

    function sendDirect() {
        const a = alice;
        const b = bob;
        if (!a || !b) return;
        void send(
            () => b.mesh.send(a.id, encoder.encode("Direct reply from Bob!")),
            "direct",
        );
    }

    init().catch((err) => log(`Error: ${err}`));
</script>

<main class="mx-auto max-w-2xl px-4 py-12 font-sans text-base leading-relaxed">
    <h1 class="mb-4 text-2xl font-bold">@ofsdk/net — Two browser endpoints</h1>
    <p class="mb-8 text-gray-600">
        Both endpoints connect through public n0 relays. Alice broadcasts; Bob
        replies directly.
    </p>

    <div class="mb-6 grid gap-4 sm:grid-cols-2">
        <div class="rounded-lg border border-gray-300 p-4">
            <h2 class="mb-2 text-lg font-semibold text-blue-700">Alice</h2>
            <p class="mb-3 break-all font-mono text-xs text-gray-500">
                {aliceId}
            </p>
            <button
                onclick={broadcast}
                disabled={sending || !alice}
                class="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
            >
                {sending ? "Sending…" : 'Broadcast "Hello from Alice!"'}
            </button>
        </div>

        <div class="rounded-lg border border-gray-300 p-4">
            <h2 class="mb-2 text-lg font-semibold text-green-700">Bob</h2>
            <p class="mb-3 break-all font-mono text-xs text-gray-500">
                {bobId}
            </p>
            <button
                onclick={sendDirect}
                disabled={sending || !alice || !bob}
                class="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 disabled:opacity-50"
            >
                {sending ? "Sending…" : "Send direct to Alice"}
            </button>
        </div>
    </div>

    <h2 class="mb-2 text-lg font-semibold">Message log</h2>
    <div
        class="max-h-72 overflow-y-auto rounded-lg border border-gray-300 bg-gray-50 p-4 font-mono text-sm whitespace-pre-wrap"
    >
        {#each logs as line, i (i)}
            <div>{line}</div>
        {/each}
    </div>
</main>
