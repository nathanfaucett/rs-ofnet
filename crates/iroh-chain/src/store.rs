use std::{
    collections::BTreeSet,
    sync::{Arc, RwLock},
};

use iroh::EndpointId;

#[derive(Clone, Default, Debug)]
pub struct EndpointIdStore {
    ids: Arc<RwLock<BTreeSet<EndpointId>>>,
}

impl EndpointIdStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn ids(&self) -> Vec<EndpointId> {
        self.ids
            .read()
            .expect("endpoint store poisoned")
            .iter()
            .copied()
            .collect()
    }

    pub fn contains(&self, id: EndpointId) -> bool {
        self.ids
            .read()
            .expect("endpoint store poisoned")
            .contains(&id)
    }

    pub fn replace(&self, ids: impl IntoIterator<Item = EndpointId>) {
        *self.ids.write().expect("endpoint store poisoned") = ids.into_iter().collect();
    }

    pub fn add(&self, id: EndpointId) -> bool {
        self.ids
            .write()
            .expect("endpoint store poisoned")
            .insert(id)
    }

    pub fn remove(&self, id: EndpointId) -> bool {
        self.ids
            .write()
            .expect("endpoint store poisoned")
            .remove(&id)
    }
}

#[cfg(test)]
mod tests {
    use super::EndpointIdStore;
    use iroh::SecretKey;

    #[test]
    fn shared_store_updates() {
        let first = SecretKey::generate().public();
        let second = SecretKey::generate().public();
        let store = EndpointIdStore::new();
        let shared = store.clone();
        assert!(store.add(first));
        assert!(shared.contains(first));
        shared.replace([second]);
        assert!(!store.contains(first));
        assert_eq!(store.ids(), vec![second]);
        assert!(store.remove(second));
        assert!(shared.ids().is_empty());
    }
}
