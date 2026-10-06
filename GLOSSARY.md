# Endpoint Mesh

This context describes communication among endpoints connected through a peer mesh.

## Endpoint

An Endpoint is a uniquely identified participant in the network that can communicate with other endpoints. Prefer this term over node or server when referring to the participant rather than its hosting process.

## Peer

A Peer is an endpoint known to another endpoint as a possible mesh neighbor. A peer is an identity; a connection is a relationship between peers.

## Mesh

The Mesh is the network of peer relationships through which endpoints communicate, including communication relayed by intermediate endpoints. Prefer this term over overlay network unless discussing the underlying networking concept.

## Broadcast

A Broadcast is a message intended for every endpoint in the mesh. Prefer this term over multicast when the intended audience is the whole mesh.

## Direct Message

A Direct Message is a message intended for one identified endpoint, whether reached directly or through relays. Prefer this term over point-to-point, which can imply a direct connection.

## Byte Stream

A Byte Stream is an ordered flow of bytes between two endpoints, without message-level interpretation by the mesh. Prefer this term over message stream.
