import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { quic } from '@chainsafe/libp2p-quic'
import { yamux } from '@chainsafe/libp2p-yamux'
import { autoNAT } from '@libp2p/autonat'
import { bootstrap } from '@libp2p/bootstrap'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { dcutr } from '@libp2p/dcutr'
import { identify } from '@libp2p/identify'
import { kadDHT } from '@libp2p/kad-dht'
import { prefixLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { ping } from '@libp2p/ping'
import { tcp } from '@libp2p/tcp'
import { uPnPNAT } from '@libp2p/upnp-nat'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { LevelBlockstore } from 'blockstore-level'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'

/**
 * See also libp2pDefaults
 * https://github.com/ipfs/helia/blob/main/packages/helia/src/utils/libp2p-defaults.ts
 */
export const Libp2pOptions = {
  logger: prefixLogger('relay'),
  peerDiscovery: [
    bootstrap({
      list: [
        // IPFS_OFFICIAL_BOOTSTRAPS: Amino DHT Bootstrappers
        // https://docs.ipfs.tech/concepts/public-utilities/#amino-dht-bootstrappers
        "/dnsaddr/sg1.bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
        "/dnsaddr/sv15.bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
        "/dnsaddr/am6.bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
        "/dnsaddr/ny5.bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
        // js-libp2p-amino-dht-bootstrapper
        "/dnsaddr/va1.bootstrap.libp2p.io/p2p/12D3KooWKnDdG3iXw9eTFijk3EWSunZcFi54Zka4wmtqtt6rPxc8",

        // LIBP2P_BOOTSTRAP: https://github.com/ipfs/kubo/blob/master/config/bootstrap_peers.go
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa", // rust-libp2p-server
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',

        // PUBLIC_BOOTSTRAP: mars.i.ipfs.io
        "/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
        "/ip4/104.131.131.82/udp/4001/quic-v1/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",

        // Other public IPFS nodes
        "/ip4/35.220.212.56/tcp/4001/p2p/12D3KooWJ6MTkNM8Bu8DzNiRm1GY3Wqh8U8Pp1zRWap6xY3MvsNw",
      ]
    })
  ],
  addresses: {
    listen: [
      '/ip4/0.0.0.0/tcp/0', '/ip4/0.0.0.0/tcp/0/ws', '/ip4/0.0.0.0/udp/0/webrtc-direct',
      '/ip6/::/tcp/0', '/ip6/::/tcp/0/ws', '/ip6/::/udp/0/webrtc-direct',
      // Discover a relay using the routing
      //
      // libp2p node will search the network for one relay with a free reservation slot.
      // When it has found one and negotiated a relay reservation, the relayed address will appear
      // in the output of `libp2p.getMultiaddrs()`.
      //
      // See https://github.com/libp2p/js-libp2p/blob/e4f603f51603810440d4/doc/CONFIGURATION.md#L414
      '/p2p-circuit'
    ]
  },
  transports: [
    // allows libp2p to function as a Circuit Relay server. This will not work in browsers.
    circuitRelayTransport(),
    webSockets(), // ws needed to connect to relay
    tcp(),
    webRTC(),
    webRTCDirect(),
    quic()
  ],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: {
    identify: identify(),
    pubsub: gossipsub({ allowPublishToZeroTopicPeers: true }),
    aminoDHT: kadDHT({
      protocol: '/ipfs/kad/1.0.0',
      // peerInfoMapper: removePrivateAddressesMapper
    }),
    ping: ping(),
    autoNAT: autoNAT(),
    // attempts to configure NAT hole punching via UPnP
    upnpNAT: uPnPNAT(),
    // Direct Connection Upgrade through Relay (DCUtR)
    // allows two nodes to connect to each other who would otherwise be prevented doing so due to
    // being behind NATed connections or firewalls.
    dcutr: dcutr(),
    // TODO: allows libp2p to function as a Circuit Relay server. This will not work in browsers
    // See https://github.com/libp2p/js-libp2p/blob/e4f603f51603810440d43e92718e666f164571bb/packages/transport-circuit-relay-v2/README.md#example---use-as-a-server
    // circuitRelay: circuitRelayServer(),
  }
}

/**
 * Initializes an IPFS instance with a given directory and peer ID.
 * If no peer ID is provided, a new one is generated.
 *
 * @param {*} dir
 * @param {*} peerId
 *
 * @returns {Promise<Helia>} The initialized Helia instance.
 */
export const initIPFSInstance = async (dir, peerId) => {
  // TODO: check the default value of createLibp2p's options.privateKey
  // see https://github.com/libp2p/js-libp2p/blob/e4f603f51603810440d43e92718e666f164571bb/packages/libp2p/src/index.ts#L199-L201
  if (peerId == null) {
    const keyPair = await generateKeyPair('Ed25519')
    peerId = await peerIdFromPrivateKey(keyPair)
    console.log(`Generated PeerId: ${peerId.toString()}`)
  }

  const blockstore = new LevelBlockstore(dir)
  const libp2pConfig = { ...Libp2pOptions, peerId }
  const libp2p = await createLibp2p(libp2pConfig)

  // Used to debug connections
  // https://github.com/libp2p/js-libp2p/blob/main/doc/PEER_DISCOVERY.md
  // libp2p.addEventListener('peer:discovery', (evt) => {
  //   console.log('Discovered %s', evt.detail.id.toString()) // Log discovered peer
  // })
  // libp2p.addEventListener('peer:connect', (evt) => {
  //   console.log('Connected to %s', evt.detail.toString()) // Log connected peer
  // })
  // libp2p.addEventListener('peer:disconnect', (evt) => {
  //   console.log('Disconnected from %s', evt.detail.toString()) // Log disconnected peer
  // })

  return createHelia({ libp2p, blockstore })
}
