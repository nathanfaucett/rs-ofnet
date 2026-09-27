# Endpoint Mesh

This context describes communication among endpoints connected through a peer mesh.

## Participants and topology

**Endpoint**:
A uniquely identified participant in the network that can communicate with other endpoints.
_Avoid_: Node, server (when referring to the participant rather than its hosting process)

**Peer**:
An endpoint known to another endpoint as a possible mesh neighbor.
_Avoid_: Connection (a peer is an identity; a connection is a relationship between peers)

**Mesh**:
The network of peer relationships through which endpoints communicate, including communication relayed by intermediate endpoints.
_Avoid_: Overlay network (unless discussing the underlying networking concept)

## Communication

**Broadcast**:
A message intended for every endpoint in the mesh.
_Avoid_: Multicast (when the intended audience is the whole mesh)

**Direct message**:
A message intended for one identified endpoint, whether reached directly or through relays.
_Avoid_: Point-to-point (can imply a direct connection)

**Byte stream**:
An ordered flow of bytes between two endpoints, without message-level interpretation by the mesh.
_Avoid_: Message stream
