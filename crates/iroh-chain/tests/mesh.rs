use std::{io::Error, time::Duration};

use iroh::{
    Endpoint, EndpointId,
    address_lookup::MemoryLookup,
    endpoint::{Connection, presets},
    protocol::{AcceptError, ProtocolHandler},
};
use iroh_chain::{EndpointIdStore, RootAuthorizer, RootId, Server};

#[derive(Clone, Debug)]
struct Echo;

impl ProtocolHandler for Echo {
    async fn accept(&self, connection: Connection) -> Result<(), AcceptError> {
        let (mut send, mut recv) = connection.accept_bi().await?;
        let bytes = recv.read_to_end(1024).await.map_err(Error::other)?;
        send.write_all(&bytes).await.map_err(Error::other)?;
        send.finish().map_err(Error::other)?;
        tokio::time::sleep(Duration::from_millis(100)).await;
        Ok(())
    }
}

#[derive(Clone)]
struct Allow;

impl RootAuthorizer for Allow {
    async fn authorize(&self, _: RootId, _: EndpointId, _: EndpointId, _: &[u8]) -> bool {
        true
    }
}

#[tokio::test]
async fn mesh_routes_and_direct_streams() {
    tokio::time::timeout(Duration::from_secs(45), async {
        let lookup = MemoryLookup::new();
        let mut servers = Vec::new();
        let mut routers = Vec::new();
        for _ in 0..9 {
            let endpoint = Endpoint::builder(presets::Minimal)
                .address_lookup(lookup.clone())
                .bind()
                .await
                .unwrap();
            lookup.add_endpoint_info(endpoint.addr());
            let peers = EndpointIdStore::new();
            let server = Server::new(endpoint, peers, Allow);
            routers.push(server.router(Echo, Echo));
            servers.push(server);
        }
        let ids: Vec<_> = servers
            .iter()
            .map(|server| server.endpoint().id())
            .collect();
        for (server, id) in servers.iter().zip(&ids) {
            server
                .peers()
                .replace(ids.iter().copied().filter(|other| other != id));
        }
        let mut subscriptions: Vec<_> = servers.iter().map(Server::subscribe_messages).collect();
        tokio::time::sleep(Duration::from_secs(3)).await;
        servers[0].broadcast(b"hello").await.unwrap();
        for (index, subscription) in subscriptions.iter_mut().enumerate() {
            let message = tokio::time::timeout(Duration::from_secs(5), subscription.recv())
                .await
                .unwrap_or_else(|_| panic!("broadcast missing at {index}"))
                .unwrap();
            assert_eq!(message.source, ids[0]);
            assert_eq!(message.payload, b"hello");
        }
        servers[0].send(ids[4], b"private").await.unwrap();
        let message = tokio::time::timeout(Duration::from_secs(5), subscriptions[4].recv())
            .await
            .expect("direct message missing")
            .unwrap();
        assert_eq!(message.destination, Some(ids[4]));
        assert_eq!(message.payload, b"private");
        let (_, mut send, mut recv) = servers[0].open_stream(ids[4]).await.unwrap();
        send.write_all(b"bytes").await.unwrap();
        send.finish().unwrap();
        assert_eq!(recv.read_to_end(1024).await.unwrap(), b"bytes");
        for server in &servers {
            server.close().await;
        }
        drop(routers);
    })
    .await
    .expect("mesh timed out");
}
