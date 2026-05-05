import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { RECOVERY_PUBLIC_KEY } from '../recoveryKeys.js'

const getSetting = (db, key) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || null

const setSetting = (db, key, value) => {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
}

const decodeBase64Url = (value) => Buffer.from(value, 'base64url')

const verifyRecoveryToken = (token, deviceId) => {
  if (!RECOVERY_PUBLIC_KEY || RECOVERY_PUBLIC_KEY === 'REPLACE_WITH_PUBLIC_KEY_PEM') {
    return { valid: false, error: 'Kurtarma anahtari tanimli degil.' }
  }

  const parts = String(token || '').split('.')
  if (parts.length !== 2) {
    return { valid: false, error: 'Gecersiz token formatı.' }
  }

  const [payloadB64, signatureB64] = parts
  let payload

  try {
    payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8'))
  } catch {
    return { valid: false, error: 'Token okunamadi.' }
  }

  if (!payload?.deviceId || !payload?.exp) {
    return { valid: false, error: 'Token eksik bilgi iceriyor.' }
  }

  if (payload.purpose !== 'password_reset') {
    return { valid: false, error: 'Token amaci gecersiz.' }
  }

  if (payload.deviceId !== deviceId) {
    return { valid: false, error: 'Token bu cihaz icin degil.' }
  }

  if (Date.now() > Number(payload.exp)) {
    return { valid: false, error: 'Token suresi dolmus.' }
  }

  const signature = decodeBase64Url(signatureB64)
  const isValid = crypto.verify(null, Buffer.from(payloadB64), RECOVERY_PUBLIC_KEY, signature)

  if (!isValid) {
    return { valid: false, error: 'Token dogrulanamadi.' }
  }

  return { valid: true }
}

export const registerAuthHandlers = ({ ipcMain, db }) => {
  ipcMain.handle('auth:login', async (_event, { username, password }) => {
    try {
      const storedUsername = getSetting(db, 'auth_username')
      const storedHash = getSetting(db, 'auth_password_hash')
      if (!storedUsername || !storedHash) {
        return { success: false, error: 'Kimlik bilgileri bulunamadı.' }
      }

      const isMatch =
        username === storedUsername && (await bcrypt.compare(password, storedHash))
      if (!isMatch) {
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
        return { success: false, error: 'Sifre en az 4 karakter olmali.' }
      }

      const installId = getSetting(db, 'install_id')
      if (!installId) {
        return { success: false, error: 'Cihaz kimligi bulunamadi.' }
      }

      const validation = verifyRecoveryToken(token, installId)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      const newHash = await bcrypt.hash(newPassword, 10)
      setSetting(db, 'auth_password_hash', newHash)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
