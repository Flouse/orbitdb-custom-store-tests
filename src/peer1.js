import { logger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { createOrbitDB } from '@orbitdb/core'
import { Voyager } from '@orbitdb/voyager'
import fs from 'fs'
import { initIPFSInstance } from './config/libp2p.js'

const log = logger('peer1')

const PEER1_MULTIADDR_FILE = 'peer1.multiaddr'
const PEER1_DB_ADDRESS_FILE = 'peer1.dbaddress'

const run = async () => {
  const ipfs1 = await initIPFSInstance('./data/ipfs11')
  const directory = `./data/orbitdb-${Date.now()}`
  const orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'peer1', directory })

  // connect to voyager
  const voyagerAddress = process.env.VOYAGER_ADDRESS
  let voyager = undefined
  if (!voyagerAddress) {
    log.error("Error: VOYAGER_ADDRESS environment variable not set.")
  } else {
    log('Dialing voyager multiaddr:', voyagerAddress)
    voyager = await Voyager({ orbitdb: orbitdb1, address: multiaddr(voyagerAddress) })
  }

  // create a db and add it to voyager
  const db1 = await orbitdb1.open('peer1-db-2025')
  // add the address to voyager (can also pass an array of addresses)
  voyagerAddress != null && await voyager.add(db1.address)

  // Write the peer's multiaddrs to a file
  const multiaddrs = ipfs1.libp2p.getMultiaddrs()
    .map(ma => ma.toString())
    .filter(ma => !ma.includes('/ip4/127.0.0.1'))
  fs.writeFileSync(PEER1_MULTIADDR_FILE, multiaddrs.join('\n'))
  log(`Multiaddrs written to ${PEER1_MULTIADDR_FILE}`)

  // Write the database address to a file
  fs.writeFileSync(PEER1_DB_ADDRESS_FILE, db1.address.toString())
  log(`Database address written to ${PEER1_DB_ADDRESS_FILE}`)

  // Add some data after a delay
  setTimeout(async () => {
    await db1.add('hello world from peer 1 - 1')
    await db1.add('hello world from peer 1 - 2')
    log('Added data to database')
  }, 3000) // 3 seconds

  log('Peer 1 is active and ready for connections...')

  // Keep the process running for 10 seconds, then close
  setTimeout(async () => {
    log('Closing database and stopping services...')
    await db1.close()
    await orbitdb1.stop()
    await ipfs1.stop()
    log('Done.')
    process.exit(0)
  }, 50000)
}

run().catch((e) => {
  log.error(e)
  process.exit(1)
})
