import { WebServer } from "@ofnet/net";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const logEl = document.getElementById("log")!;
function log(msg: string) {
  logEl.textContent += msg + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

async function main() {
  log("Creating Alice and Bob...");
  const alice = await WebServer.create();
  const bob = await WebServer.create();

  document.getElementById("alice-id")!.textContent = alice.endpointId;
  document.getElementById("bob-id")!.textContent = bob.endpointId;
  log(`Alice: ${alice.endpointId}`);
  log(`Bob:   ${bob.endpointId}`);

  alice.addPeer(bob.endpointId);
  bob.addPeer(alice.endpointId);
  log("Peers added.");

  bob.subscribeMessages((source, destination, payload) => {
    const kind = destination === null ? "broadcast" : "direct";
    log(`Bob ← ${kind} from ${source.slice(0, 12)}…: ${decoder.decode(payload)}`);
  });

  alice.subscribeMessages((source, destination, payload) => {
    const kind = destination === null ? "broadcast" : "direct";
    log(`Alice ← ${kind} from ${source.slice(0, 12)}…: ${decoder.decode(payload)}`);
  });

  document.getElementById("alice-broadcast")!.addEventListener("click", () => {
    alice.broadcast(encoder.encode("Hello from Alice!"));
  });

  document.getElementById("bob-send")!.addEventListener("click", () => {
    bob.send(alice.endpointId, encoder.encode("Direct reply from Bob!"));
  });

  log("Ready. Click the buttons to send messages.");
}

main().catch((err) => log(`Error: ${err}`));
