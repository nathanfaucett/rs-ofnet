import { WebServer } from "../esm/index.js";
// Run with: pnpm build && node --experimental-strip-types examples/basic-usage.ts

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function main() {
    console.log("Creating two browser endpoints...");

    const alice = await WebServer.create({
        secretKey:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        relayUrls: ["https://relay.n0.iroh.link"],
    });

    const bob = await WebServer.create({
        secretKey:
            "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
        relayUrls: ["https://relay.n0.iroh.link"],
    });

    console.log("Alice endpoint ID:", alice.endpointId);
    console.log("Bob endpoint ID:", bob.endpointId);

    alice.addPeer(bob.endpointId);
    bob.addPeer(alice.endpointId);

    const bobReceived = new Promise<void>((resolve) => {
        bob.subscribeMessages((source, destination, payload) => {
            console.log(
                `Bob received from ${source}: ${decoder.decode(payload)}`,
            );
            resolve();
        });
    });

    await alice.broadcast(encoder.encode("Hello from Alice!"));
    await bobReceived;

    const aliceReceived = new Promise<void>((resolve) => {
        alice.subscribeMessages((source, destination, payload) => {
            console.log(
                `Alice received direct from ${source}: ${decoder.decode(payload)}`,
            );
            resolve();
        });
    });

    await bob.send(alice.endpointId, encoder.encode("Direct reply from Bob!"));
    await aliceReceived;

    console.log("Pairing test...");
    const pairingReceived = new Promise<number>((resolve) => {
        alice.subscribePairingOffers((handle, remote, payload) => {
            console.log(`Alice received pairing offer from ${remote}`);
            resolve(handle);
        });
    });

    bob.setPairingEnabled(true);
    const pairReply = await bob.sendPairingOffer(
        alice.endpointId,
        encoder.encode("Pair with me?"),
    );
    console.log("Pairing reply:", decoder.decode(pairReply));

    const handle = await pairingReceived;
    await alice.replyToPairingOffer(handle, encoder.encode("Accepted!"));
    console.log("Pairing complete!");

    await alice.close();
    await bob.close();
    console.log("Done!");
}

main().catch(console.error);
