#![forbid(unsafe_code)]

mod hooks;
mod mesh;
mod pairing;
mod server;
mod store;

pub use hooks::AllowlistHook;
pub use mesh::{MAX_MESH_PEERS, MESH_ALPN, Message};
pub use pairing::{MAX_PAIRING_PAYLOAD_LENGTH, PairingEvent, PairingOffer};
pub use server::{
    FILE_TRANSFER_ALPN, METADATA_SYNC_ALPN, PAIRING_ALPN, RootAuthorizer, RootId, Server,
};
pub use store::EndpointIdStore;
