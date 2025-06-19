import { logger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { createOrbitDB } from '@orbitdb/core'
import fs from 'fs'
import { initIPFSInstance } from './config/libp2p.js'

// Setup logger
const log = logger('peer2')

// const PEER1_MULTIADDR_FILE = 'peer1.multiaddr'
const PEER1_DB_ADDRESS_FILE = 'peer1.dbaddress'

const run = async () => {
  const peer1DbAddress = fs.readFileSync(PEER1_DB_ADDRESS_FILE, 'utf8').trim()
  log('Read peer1 db address from %s: %s', PEER1_DB_ADDRESS_FILE, peer1DbAddress)

  const ipfs2 = await initIPFSInstance('./data/ipfs12')
  const directory = `./data/orbitdb-${peer1DbAddress.slice(-8)}`
  const orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'peer2', directory })

  log('Opening OrbitDB...')
  const db2 = await orbitdb2.open(peer1DbAddress).catch(async (e) => {
    log('Error opening database:', e)

    const libp2p = ipfs2.libp2p

    // only connect to voyager if necessary
    const voyagerAddress = process.env.VOYAGER_ADDRESS
    if (!voyagerAddress) {
      log.error('Error: VOYAGER_ADDRESS environment variable not set.')
      return undefined
    }
    const voyagerMultiaddr = multiaddr(voyagerAddress)

    log('Dialing voyager multiaddr: %s', voyagerAddress)
    const connection = await libp2p.dial(voyagerMultiaddr).catch((e) => {
      log('Error dialing voyager:', e)
      throw new Error('Voyager connection Failed')
    })
    log('Connected to voyager:', connection)

    log('Connected to voyager, retrying to open database...')
    return orbitdb2.open(peer1DbAddress)

  }).finally(() => {
    log('Finished Opening OrbitDB');
  });

  if (!db2) {
    log.error('Failed to open database')
    log.error('Please make sure peer1 is running or the voyager storage service is available.')
    process.exit(1)
  }
  log('Database opened:', db2.address.toString())

  let db2Updated = false
  db2.events.on('update', async (entry) => {
    db2Updated = true
    log('Database updated', entry)
  })

  // log all libp2p connections
  const connections = ipfs2.libp2p.getConnections()
  log('Libp2p connections:', connections.map((c) => c.remotePeer.toString()))

  let checkInterval = undefined
  // Wait for the database to update, with a timeout
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(async () => {
      reject(new Error('timeout'))
    }, 20000)

    checkInterval = setInterval(() => {
      if (db2Updated) {
        clearTimeout(timeout)
        clearInterval(checkInterval)
        log('Replication successful!')
        resolve()
      }
    }, 1000)
  }).catch((e) => {
    log.error('Error during replication:', e)
    if (e.message === 'timeout') {
      log.error('Replication timed out. Please ensure peer1 or voyager is running and reachable.')
    }
  }).finally(async () => {
    clearInterval(checkInterval)
    log('Stopping update check...')

    // Print out all records
    log('Retrieving all records from Peer2...')
    const allRecords = await db2.all()
    log('All records:', allRecords)

    log('Peer 2 is shutting down gracefully...')
    await db2.close()
    await orbitdb2.stop()
    await ipfs2.stop()
  })
}

run().catch((e) => {
  log.error(e)
  process.exit(1)
})
