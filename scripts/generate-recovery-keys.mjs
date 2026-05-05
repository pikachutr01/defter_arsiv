import fs from 'fs'
import crypto from 'crypto'

const args = process.argv.slice(2)
const getArg = (name) => {
  const index = args.indexOf(name)
  if (index === -1) return null
  return args[index + 1] || null
}

const publicOut = getArg('--public') || 'recovery-public.pem'
const privateOut = getArg('--private') || 'recovery-private.pem'

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')

fs.writeFileSync(publicOut, publicKey.export({ type: 'spki', format: 'pem' }))
fs.writeFileSync(privateOut, privateKey.export({ type: 'pkcs8', format: 'pem' }))

console.log(`Public key: ${publicOut}`)
console.log(`Private key: ${privateOut}`)
