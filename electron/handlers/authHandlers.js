import bcrypt from 'bcryptjs'

const getSetting = (db, key) =>
  db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || null

const setSetting = (db, key, value) => {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
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
}
