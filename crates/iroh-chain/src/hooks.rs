use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};

use iroh::endpoint::{
    AfterHandshakeOutcome, BeforeConnectOutcome, Connection, EndpointHooks, VarInt,
};

use crate::{EndpointIdStore, PAIRING_ALPN};

pub struct AllowlistHook {
    allowed: EndpointIdStore,
    pairing_enabled: Arc<AtomicBool>,
}

impl AllowlistHook {
    pub(crate) fn new(allowed: EndpointIdStore, pairing_enabled: Arc<AtomicBool>) -> Self {
        Self {
            allowed,
            pairing_enabled,
        }
    }
}

impl std::fmt::Debug for AllowlistHook {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("AllowlistHook")
            .finish_non_exhaustive()
    }
}

impl EndpointHooks for AllowlistHook {
    async fn before_connect<'a>(
        &'a self,
        remote_addr: &'a iroh::EndpointAddr,
        alpn: &'a [u8],
    ) -> BeforeConnectOutcome {
        if self.allowed.contains(remote_addr.id)
            || (alpn == PAIRING_ALPN && self.pairing_enabled.load(Ordering::Acquire))
        {
            BeforeConnectOutcome::Accept
        } else {
            BeforeConnectOutcome::Reject
        }
    }

    async fn after_handshake<'a>(&'a self, conn: &'a Connection) -> AfterHandshakeOutcome {
        let allowed = self.allowed.contains(conn.remote_id());
        let pairing = conn.alpn() == PAIRING_ALPN && self.pairing_enabled.load(Ordering::Acquire);
        if allowed || pairing {
            AfterHandshakeOutcome::Accept
        } else {
            AfterHandshakeOutcome::Reject {
                error_code: VarInt::from_u32(0x100),
                reason: b"endpoint is not allowlisted".to_vec(),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use std::{
        collections::BTreeSet,
        sync::{Arc, atomic::AtomicBool},
    };

    use iroh::{
        EndpointAddr, SecretKey,
        endpoint::{BeforeConnectOutcome, EndpointHooks},
    };

    use super::AllowlistHook;
    use crate::{EndpointIdStore, PAIRING_ALPN};

    #[tokio::test]
    async fn allows_only_trusted_or_open_pairing_connections() {
        let allowed = EndpointIdStore::new();
        let trusted = SecretKey::generate().public();
        let untrusted = SecretKey::generate().public();
        allowed.replace([trusted]);
        let pairing_enabled = Arc::new(AtomicBool::new(false));
        let hook = AllowlistHook::new(allowed, Arc::clone(&pairing_enabled));
        let trusted_addr = EndpointAddr {
            id: trusted,
            addrs: BTreeSet::new(),
        };
        let untrusted_addr = EndpointAddr {
            id: untrusted,
            addrs: BTreeSet::new(),
        };

        assert!(matches!(
            hook.before_connect(&trusted_addr, crate::METADATA_ALPN)
                .await,
            BeforeConnectOutcome::Accept
        ));
        assert!(matches!(
            hook.before_connect(&untrusted_addr, crate::METADATA_ALPN)
                .await,
            BeforeConnectOutcome::Reject
        ));
        assert!(matches!(
            hook.before_connect(&untrusted_addr, PAIRING_ALPN).await,
            BeforeConnectOutcome::Reject
        ));

        pairing_enabled.store(true, std::sync::atomic::Ordering::Release);
        assert!(matches!(
            hook.before_connect(&untrusted_addr, PAIRING_ALPN).await,
            BeforeConnectOutcome::Accept
        ));
    }
}
