import { Endpoint } from "@ofnet/net";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const logEl = document.getElementById("log")!;
function log(msg: string) {
  logEl.textContent += msg + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

async function main() {
  log("Creating Alice and Bob...");
  const alice = await Endpoint.create();
  const bob = await Endpoint.create();

  document.getElementById("alice-id")!.textContent = alice.id;
  document.getElementById("bob-id")!.textContent = bob.id;
  log(`Alice: ${alice.id}`);
  log(`Bob:   ${bob.id}`);

  alice.addPeer(bob.id);
  bob.addPeer(alice.id);
  log("Peers added.");

  bob.onMessage((msg) => {
    const kind = msg.destination === null ? "broadcast" : "direct";
    log(
      `Bob ← ${kind} from ${msg.source.slice(0, 12)}…: ${decoder.decode(msg.payload)}`,
    );
  });

  alice.onMessage((msg) => {
    const kind = msg.destination === null ? "broadcast" : "direct";
    log(
      `Alice ← ${kind} from ${msg.source.slice(0, 12)}…: ${decoder.decode(msg.payload)}`,
    );
  });

  document.getElementById("alice-broadcast")!.addEventListener("click", () => {
    alice.broadcast(encoder.encode("Hello from Alice!"));
  });

  document.getElementById("bob-send")!.addEventListener("click", () => {
    bob.send(alice.id, encoder.encode("Direct reply from Bob!"));
  });

  log("Ready. Click the buttons to send messages.");
}

main().catch((err) => log(`Error: ${err}`));
