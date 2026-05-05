import fs from 'fs'

const args = process.argv.slice(2)
const getArg = (name) => {
  const index = args.indexOf(name)
  if (index === -1) return null
  return args[index + 1] || null
}

const sourcePath = getArg('--from')
const outputPath = getArg('--out') || 'electron/recoveryKeys.js'

if (!sourcePath) {
  console.error(
    'Usage: node scripts/embed-recovery-public-key.mjs --from <recovery-public.pem> [--out electron/recoveryKeys.js]'
  )
  process.exit(1)
}

const publicKeyPem = fs.readFileSync(sourcePath, 'utf8').trim()
const fileContent = `export const RECOVERY_PUBLIC_KEY =
  process.env.RECOVERY_PUBLIC_KEY ||
  ${JSON.stringify(publicKeyPem)}
`

fs.writeFileSync(outputPath, fileContent)

console.log(`Embedded public key into ${outputPath}`)
