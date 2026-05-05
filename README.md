# Cilt Dijital Kayıt Sistemi

Electron + React tabanlı yerel arşiv uygulaması.

## Geliştirme

```bash
npm run dev
```

## Üretim Build

```bash
npm run build
```

## Şifre Kurtarma Akışı

Uygulama her kurulum için rastgele bir `install_id` üretir. Bu değer giriş ekranında görünür ve şifre unutma durumunda destek ekibine iletilir.

Kurtarma tokeni yalnızca parola sıfırlama için geçerlidir ve varsayılan olarak 24 saat sürer.

### 1. Anahtar çifti üret

```bash
node scripts/generate-recovery-keys.mjs
```

Bu komut `recovery-public.pem` ve `recovery-private.pem` dosyalarını üretir.

### 2. Public key'i uygulamaya göm

```bash
node scripts/embed-recovery-public-key.mjs --from recovery-public.pem
```

Bu komut `electron/recoveryKeys.js` dosyasını günceller. Build alınacak uygulamada token doğrulaması bu public key ile yapılır.

### 3. Cihaza özel token üret

```bash
node scripts/generate-recovery-token.mjs --device <CIHAZ_ID> --privateKey recovery-private.pem --ttlHours 24
```

Komut cihaza özel imzalı bir token üretir. Kullanıcı bu tokeni giriş ekranındaki "Şifremi Unuttum" formuna yapıştırarak yeni şifresini belirler.
