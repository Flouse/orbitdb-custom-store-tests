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
  const directory = `./data/orbitdb-${Date.now()}`
  const orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'peer2', directory })

  log('Opening OrbitDB...')
  const db2 = await orbitdb2.open(peer1DbAddress).catch((e) => {
    log.error('Error opening database:', e)

    // connect to voyager
    const voyagerAddress = process.env.VOYAGER_ADDRESS
    if (!voyagerAddress) {
      log.error('Error: VOYAGER_ADDRESS environment variable not set.')
    } else {
      log('Dialing voyager multiaddr: %s', voyagerAddress)
      ipfs2.libp2p.dial(multiaddr(voyagerAddress))
    }
    log('Retrying to open database...')
    return orbitdb2.open(peer1DbAddress)
  })

  if (!db2) {
    log.error('Failed to open database')
    log.error('Please make sure peer1 is running or the voyager storage service is available.')
    process.exit(1)
  }

  let db2Updated = false
  db2.events.on('update', async (entry) => {
    db2Updated = true
    log('Database updated', entry)
  })

  // Wait for the database to update, with a timeout
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('timeout'))
    }, 60000)

    const checkInterval = setInterval(() => {
      if (db2Updated) {
        clearTimeout(timeout)
        clearInterval(checkInterval)
        resolve()
      }
    }, 1000)
  })

  // Print out the above records.
  log('Retrieving all records from Peer2...')
  const allRecords = await db2.all()
  log('All records:', allRecords)

  log('Replication successful!')
  process.exit(0)
}

run().catch((e) => {
  log.error(e)
  process.exit(1)
})
