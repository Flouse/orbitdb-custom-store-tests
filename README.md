# OrbitDB Replication Examples with Helia

This project contains various examples and test scripts demonstrating the use of [OrbitDB](https://github.com/orbitdb/orbitdb), a peer-to-peer database built on top of IPFS. These examples utilize [Helia](https://github.com/ipfs-shipyard/helia) as the underlying IPFS implementation and showcase different aspects of OrbitDB, particularly data replication and persistence.

## Overview

The scripts included cover scenarios such as:

* Basic database creation, data addition, and retrieval.
* Replication between two peers initialized within the same process.
* Replication between two peers running as separate processes, simulating a more realistic P2P interaction.
* Loading and persisting a larger dataset into an OrbitDB `documents` store.
* Interaction with the [OrbitDB Voyager](https://github.com/orbitdb/voyager) service for peer discovery and DB address sharing.
* Custom Libp2p configurations for enhanced connectivity.

# TODOs

- [x] reuse the example database of https://github.com/lucaong/minisearch
  - https://github.com/lucaong/minisearch/tree/d46245015f34932058861ebeb1eb7fdf97ebaaae/examples

* [ ] Run a Voyager on fly.io

* [ ] Document database address sharing mechanisms more explicitly (manual sharing, Voyager, other discovery methods).

- [ ] Implement integration with an external pinning service to ensure database persistence.

- [ ] Run peer1.js and peer2.js in diff github actions jobs
  multi-peer-replication-test: Simulate a more realistic scenario where two peers run independently and discover each other over a simulated network. This tests peer discovery and replication in a less controlled setup.

- [ ] Add comprehensive tests covering more methods from the OrbitDB API (referencing [official tests](https://github.com/orbitdb/orbitdb/tree/main/test)).

- [ ] Adapt examples or create new ones demonstrating OrbitDB usage in a browser environment.
