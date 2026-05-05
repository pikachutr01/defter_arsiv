import fs from 'fs'
import crypto from 'crypto'

const args = process.argv.slice(2)
const getArg = (name) => {
  const index = args.indexOf(name)
  if (index === -1) return null
  return args[index + 1] || null
}

const deviceId = getArg('--device')
const privateKeyPath = getArg('--privateKey')
const ttlHours = Number(getArg('--ttlHours') || 24)

if (!deviceId || !privateKeyPath) {
  console.error('Usage: node scripts/generate-recovery-token.mjs --device <id> --privateKey <path> [--ttlHours 24]')
  process.exit(1)
}

if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
  console.error('ttlHours pozitif bir sayi olmali.')
  process.exit(1)
}

const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8')
const now = Date.now()
const exp = now + ttlHours * 60 * 60 * 1000
const payload = {
  purpose: 'password_reset',
  deviceId,
  iat: now,
  exp,
}
const payloadJson = JSON.stringify(payload)
const payloadB64 = Buffer.from(payloadJson).toString('base64url')

const signature = crypto.sign(null, Buffer.from(payloadB64), privateKeyPem)
const signatureB64 = Buffer.from(signature).toString('base64url')

console.log(`${payloadB64}.${signatureB64}`)
