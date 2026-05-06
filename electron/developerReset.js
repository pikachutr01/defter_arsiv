import fs from 'fs'
import path from 'path'

const RESET_REQUEST_FILE = 'developer-reset-request.json'
const INTERNAL_DATA_DIR = 'cilt-dijital-kayit-sistemi'

let developerResetAuthorizedUntil = 0

const safeRemove = (targetPath) => {
  if (!targetPath || !fs.existsSync(targetPath)) return
  fs.rmSync(targetPath, {
    recursive: true,
    force: true,
    maxRetries: 4,
    retryDelay: 150,
  })
}

const isSafeResetTarget = (targetPath) => {
  if (!targetPath) return false

  const resolved = path.resolve(targetPath)
  const { root } = path.parse(resolved)
  return resolved !== root && resolved.length > root.length + 1
}

export const getDeveloperResetRequestPath = (userDataBasePath) =>
  path.join(userDataBasePath, RESET_REQUEST_FILE)

export const getInternalDataPath = (userDataBasePath) =>
  path.join(userDataBasePath, INTERNAL_DATA_DIR)

export const grantDeveloperResetAccess = (expiresAt) => {
  developerResetAuthorizedUntil = Number(expiresAt) || 0
}

export const clearDeveloperResetAccess = () => {
  developerResetAuthorizedUntil = 0
}

export const hasDeveloperResetAccess = () =>
  developerResetAuthorizedUntil > Date.now()

export const writeDeveloperResetRequest = (userDataBasePath, payload) => {
  fs.mkdirSync(userDataBasePath, { recursive: true })
  fs.writeFileSync(
    getDeveloperResetRequestPath(userDataBasePath),
    JSON.stringify(payload, null, 2),
    'utf8'
  )
}

export const runPendingDeveloperReset = (userDataBasePath) => {
  const requestPath = getDeveloperResetRequestPath(userDataBasePath)
  if (!fs.existsSync(requestPath)) {
    return { performed: false }
  }

  const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'))
  const internalDataPath = getInternalDataPath(userDataBasePath)

  if (request.resetDatabase) {
    safeRemove(internalDataPath)
  }

  if (request.clearStorage && isSafeResetTarget(request.storagePath)) {
    safeRemove(request.storagePath)
  }

  fs.rmSync(requestPath, { force: true })
  clearDeveloperResetAccess()

  return {
    performed: true,
    request,
  }
}
