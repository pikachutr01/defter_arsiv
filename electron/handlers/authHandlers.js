import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { RECOVERY_PUBLIC_KEY } from '../recoveryKeys.js'
import { grantDeveloperResetAccess } from '../developerReset.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Sık erişilen auth ayarları için basit in-memory cache.
 * setSetting çağrıldığında ilgili key invalidate edilir.
 */
const _settingsCache = new Map()

const getSetting = (db, key) => {
  if (_settingsCache.has(key)) return _settingsCache.get(key)
  const value =
    db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null
  _settingsCache.set(key, value)
  return value
}

const setSetting = (db, key, value) => {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
  _settingsCache.set(key, value) // cache'i güncelle
}

const decodeBase64Url = (value) => Buffer.from(value, 'base64url')

const verifySignedToken = (token, deviceId, expectedPurpose) => {
  if (!RECOVERY_PUBLIC_KEY || RECOVERY_PUBLIC_KEY === 'REPLACE_WITH_PUBLIC_KEY_PEM') {
    return { valid: false, error: 'Kurtarma anahtarı tanımlı değil.' }
  }

  const parts = String(token || '').split('.')
  if (parts.length !== 2) {
    return { valid: false, error: 'Geçersiz token formatı.' }
  }

  const [payloadB64, signatureB64] = parts
  let payload

  try {
    payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8'))
  } catch {
    return { valid: false, error: 'Token okunamadı.' }
  }

  if (!payload?.deviceId || !payload?.exp) {
    return { valid: false, error: 'Token eksik bilgi içeriyor.' }
  }

  if (payload.purpose !== expectedPurpose) {
    return { valid: false, error: 'Token amacı geçersiz.' }
  }

  if (payload.deviceId !== deviceId) {
    return { valid: false, error: 'Token bu cihaz için değil.' }
  }

  if (Date.now() > Number(payload.exp)) {
    return { valid: false, error: 'Token süresi dolmuş.' }
  }

  const signature = decodeBase64Url(signatureB64)
  const isValid = crypto.verify(
    null,
    Buffer.from(payloadB64),
    RECOVERY_PUBLIC_KEY,
    signature
  )

  if (!isValid) {
    return { valid: false, error: 'Token doğrulanamadı.' }
  }

  return { valid: true, payload }
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────

export const registerAuthHandlers = ({ ipcMain, db }) => {

  ipcMain.handle('auth:login', async (_event, { username, password }) => {
    try {
      const storedUsername = getSetting(db, 'auth_username')
      const storedHash = getSetting(db, 'auth_password_hash')

      if (!storedUsername || !storedHash) {
        return { success: false, error: 'Kimlik bilgileri bulunamadı.' }
      }

      // Kullanıcı adını sabit zamanlı karşılaştır (timing attack'a karşı)
      const usernameBuffer = Buffer.from(String(username ?? ''))
      const storedUsernameBuffer = Buffer.from(String(storedUsername ?? ''))
      const usernameMatch =
        usernameBuffer.length === storedUsernameBuffer.length &&
        crypto.timingSafeEqual(usernameBuffer, storedUsernameBuffer)
      const passwordMatch = await bcrypt.compare(password, storedHash)

      if (!usernameMatch || !passwordMatch) {
        return { success: false, error: 'Kullanıcı adı veya şifre hatalı.' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(
    'auth:changeCredentials',
    async (_event, { currentPassword, newUsername, newPassword }) => {
      try {
        const storedHash = getSetting(db, 'auth_password_hash')
        if (!storedHash) {
          return { success: false, error: 'Kimlik bilgileri bulunamadı.' }
        }

        const matches = await bcrypt.compare(currentPassword, storedHash)
        if (!matches) {
          return { success: false, error: 'Mevcut şifre hatalı.' }
        }

        // hash ve setSetting paralel değil — hash önce bitmeli
        const newHash = await bcrypt.hash(newPassword, 10)
        setSetting(db, 'auth_username', newUsername)
        setSetting(db, 'auth_password_hash', newHash)

        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('auth:resetWithToken', async (_event, { token, newPassword }) => {
    try {
      if (!newPassword || newPassword.length < 4) {
        return { success: false, error: 'Şifre en az 4 karakter olmalı.' }
      }

      const installId = getSetting(db, 'install_id')
      if (!installId) {
        return { success: false, error: 'Cihaz kimliği bulunamadı.' }
      }

      const validation = verifySignedToken(token, installId, 'password_reset')
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      const newHash = await bcrypt.hash(newPassword, 10)
      setSetting(db, 'auth_password_hash', newHash)

      const currentUsername = getSetting(db, 'auth_username') || 'admin'
      return { success: true, username: currentUsername }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:authorizeDeveloperReset', async (_event, { token }) => {
    try {
      const installId = getSetting(db, 'install_id')
      if (!installId) {
        return { success: false, error: 'Cihaz kimliÄŸi bulunamadÄ±.' }
      }

      const validation = verifySignedToken(token, installId, 'developer_reset')
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      grantDeveloperResetAccess(validation.payload.exp)
      return {
        success: true,
        data: {
          expiresAt: validation.payload.exp,
        },
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
