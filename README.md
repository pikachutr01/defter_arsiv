# Cilt Dijital Kayıt Sistemi

Cilt Dijital Kayıt Sistemi, fiziksel defterleri ve ciltleri dijital ortama aktarmak, organize etmek, üzerine notlar/çizimler almak ve PDF çıktıları üretmek için geliştirilmiş **çevrimdışı çalışan (offline-first)**, güvenli bir arşivleme uygulamasıdır. 

Modern web teknolojileri ile masaüstü gücünün (Electron) bir araya getirildiği bu sistem, binlerce görsel ve kaydı performans kaybı yaşamadan yerel diskinizde muhafaza eder.

---

## 🌟 Temel Özellikler

- **Yerel ve Güvenli Depolama:** İnternet bağlantısı gerektirmez. Tüm veriler (`.sqlite`) ve görseller yerel diskinizde belirlediğiniz bir klasörde tutulur.
- **Kayıpsız Görüntü Düzenleme:** Yüklenen defter sayfaları üzerinde döndürme (rotasyon), yakınlaştırma (fare odaklı zoom ve sürükleme) işlemleri yapılabilir.
- **Çizim Düzenleyicisi (Annotation Canvas):** Sayfa resimlerinin üzerine yüksek kaliteden ödün vermeden (%98 JPG) notlar yazılabilir ve vurgulamalar yapılabilir.
- **Performanslı Gelişmiş Arama:** On binlerce kayıt arasında hızlı kelime araması. `UNION ALL` mantığıyla çalışan, 50'şer sonuçluk sayfalama (pagination) sistemine sahip gelişmiş SQL altyapısı.
- **Dinamik PDF Üretimi:** Seçilen sayfalar sıraya dizilebilir, üzerlerindeki notlar ve çizimler korunarak A4 dikey formatında yüksek kaliteli PDF dosyalarına dönüştürülebilir.
- **Sistem Yedekleme:** Tek tıkla veritabanının yedeğini alma ve geri yükleme imkanı.

---

## 🛠 Teknik Mimari

Proje, frontend ve backend mantığının `IPC (Inter-Process Communication)` köprüsü ile ayrıldığı, güvenlik ve performans odaklı bir Electron mimarisi kullanır.

- **Frontend:** React, Vite, TailwindCSS
- **Durum Yönetimi (State):** Zustand
- **Backend / Masaüstü Entegrasyonu:** Electron (Node.js)
- **Veritabanı:** `better-sqlite3` (Yerel, hızlı ve senkron SQLite erişimi)
- **Güvenlik:** Context Isolation ve IPC Preload scriptleri aktiftir. Şifreler `bcrypt` ile hashlenir.

### Dizin Yapısı (Özet)

- `electron/`: Arka uç kodları.
  - `main.js`: Electron uygulama döngüsü ve pencere yönetimi.
  - `preload.js`: Güvenli IPC köprüsü (Renderer -> Main aktarımı).
  - `db/`: Veritabanı şemaları ve bağlantı ayarları.
  - `handlers/`: Veritabanı okuma/yazma, arama, PDF oluşturma ve dosya sistemi (FS) işlemleri.
- `src/`: React ön yüz (Renderer) kodları.
  - `pages/`: Uygulama ekranları (Ciltler, Arama, PDF Dışa Aktar, Ayarlar, vb.).
  - `components/`: Tekrar kullanılabilen UI bileşenleri ve Çizim Canvas'ı.
  - `store/`: Zustand durum yönetim dosyaları.
  - `utils/`: Yardımcı fonksiyonlar ve IPC çağrı sarmalayıcıları.

---

## 💻 Geliştirme Ortamı Kurulumu

### Gereksinimler
- Node.js (v18 veya üzeri önerilir)
- NPM veya Yarn

### 1. Bağımlılıkları Yükleme
```bash
npm install
```

### 2. Geliştirici Modunda Başlatma
```bash
npm run dev
```
*Bu komut hem Vite sunucusunu (React için) hem de Electron uygulamasını aynı anda ayağa kaldırır.*

### 3. Üretim (Production) Sürümü Alma
```bash
npm run build
```
*Platforma uygun (Windows `.exe` vb.) çalıştırılabilir dağıtım dosyasını oluşturur.*

---

## 🔐 Şifre Kurtarma Akışı (Asimetrik Şifreleme)

Uygulama tamamen yerel olduğu için şifre sıfırlama işlemi kriptografik tokenler ile sağlanır. Kurulum aşamasında sistem benzersiz bir `install_id` oluşturur. Şifresini unutan kullanıcıya destek ekibi tarafından geçici ve imzalı bir "Kurtarma Anahtarı" iletilir.

### 1. Anahtar çifti üret (Sistem Yöneticisi İçin)
```bash
node scripts/generate-recovery-keys.mjs
```
Bu komut `recovery-public.pem` ve `recovery-private.pem` dosyalarını üretir.

### 2. Public Key'i uygulamaya göm
```bash
node scripts/embed-recovery-public-key.mjs --from recovery-public.pem
```
Bu komut `electron/recoveryKeys.js` dosyasını günceller. Build alınacak uygulamada token doğrulaması bu public key ile yapılır.

### 3. Cihaza özel token üret
```bash
node scripts/generate-recovery-token.mjs --device <CIHAZ_ID> --privateKey recovery-private.pem --ttlHours 24
```
Komut, `CIHAZ_ID`'sine sahip kullanıcı için 24 saat geçerli imzalı bir token üretir. Kullanıcı bu tokeni uygulamanın "Şifremi Unuttum" bölümüne yapıştırarak şifresini güvenle sıfırlayabilir.
