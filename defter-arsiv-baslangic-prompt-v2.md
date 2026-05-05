# Defter Arşiv Uygulaması — Başlangıç Kurulum Promptu

> Bu prompt, bir Electron + React masaüstü arşiv uygulamasının sağlam altyapısını kurmak için AI agent'a verilecektir.

---

## GÖREV

Sen deneyimli bir Electron + React masaüstü uygulama geliştiricisisin. Aşağıda tanımlanan **"Defter Arşiv Uygulaması"** için production-grade, sağlam ve genişletilebilir bir proje altyapısı kuracaksın. Kod iskeletini, klasör yapısını, veritabanı şemasını, IPC kanallarını ve temel UI bileşenlerini eksiksiz oluştur.

---

## UYGULAMA HAKKINDA

Kullanıcının elinde çok sayıda eski, büyük boy defter bulunmaktadır. Bu defterler sayfa sayfa fotoğraflanarak dijital ortamda arşivlenecektir. Uygulama yalnızca tek bir kişi tarafından, kişisel Windows bilgisayarında kullanılacaktır. Ticari amaç yoktur.

**Temel konsept:**
- Her defterin kaç sayfası varsa o kadar sayfa kaydı sisteme girilir.
- Her sayfa kaydının **iki yüzü** vardır: `A Yüzü` (ön) ve `B Yüzü` (arka / devam).
- Her yüze ayrı bir fotoğraf yüklenebilir.
- Fotoğrafı yüklenmiş yüzler, toplu görünümde görsel olarak işaretli (✓) gösterilir.
- Defterler, sayfalar ve fotoğraflar kolayca aranabilir, görüntülenebilir ve dışa aktarılabilir.
- Uygulamaya giriş, kullanıcı adı ve şifre ile korunmaktadır.

---

## TEKNOLOJİ YIĞINI

```
Runtime:         Electron 30+
UI Framework:    React 18+ (Vite ile)
Styling:         Tailwind CSS 3+
Veritabanı:      better-sqlite3 (senkron, hızlı)
Resim İşleme:    sharp (thumbnail üretimi, format dönüşümü)
PDF Export:      pdfkit
IPC:             Electron contextBridge + ipcMain / ipcRenderer
Paketleme:       electron-builder (.exe üretimi için)
State Yönetimi:  Zustand
Routing:         React Router v6
```

---

## PROJE KLASÖR YAPISI

Aşağıdaki klasör yapısını **tam olarak** bu şekilde oluştur:

```
defter-arsiv/
├── electron/
│   ├── main.js                  # Electron ana süreç
│   ├── preload.js               # Context bridge (güvenli IPC)
│   └── handlers/
│       ├── authHandlers.js      # Giriş / kimlik doğrulama
│       ├── bookHandlers.js      # Defter CRUD işlemleri
│       ├── pageHandlers.js      # Sayfa CRUD işlemleri
│       ├── imageHandlers.js     # Resim yükleme, silme, export
│       ├── pdfHandlers.js       # PDF oluşturma
│       ├── searchHandlers.js    # Arama işlemleri
│       └── settingsHandlers.js  # Ayarlar (depolama klasörü vb.)
├── src/
│   ├── main.jsx                 # React giriş noktası
│   ├── App.jsx                  # Router ve layout (auth guard dahil)
│   ├── store/
│   │   ├── useAuthStore.js      # Oturum state
│   │   ├── useBookStore.js      # Defter state
│   │   ├── usePageStore.js      # Sayfa state
│   │   └── useSettingsStore.js  # Ayarlar state
│   ├── pages/
│   │   ├── Login.jsx            # Giriş ekranı
│   │   ├── Dashboard.jsx        # Ana ekran / defter listesi
│   │   ├── BookDetail.jsx       # Defter detay + sayfa grid'i
│   │   ├── PageViewer.jsx       # Tek sayfa görüntüleme
│   │   ├── Search.jsx           # Arama ekranı
│   │   ├── PdfExport.jsx        # PDF derleme ekranı
│   │   └── Settings.jsx         # Ayarlar ekranı
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   └── TopBar.jsx
│   │   ├── auth/
│   │   │   └── ProtectedRoute.jsx   # Auth guard bileşeni
│   │   ├── books/
│   │   │   ├── BookCard.jsx
│   │   │   ├── BookForm.jsx     # Defter ekle/düzenle modal
│   │   │   └── BookCover.jsx
│   │   ├── pages/
│   │   │   ├── PageGrid.jsx     # Toplu sayfa görünümü
│   │   │   ├── PageCard.jsx     # Tek sayfa kartı (A/B yüzü)
│   │   │   └── PageForm.jsx     # Sayfa ekle/düzenle
│   │   ├── images/
│   │   │   ├── ImageUploader.jsx
│   │   │   ├── ImageViewer.jsx  # Tam ekran görüntüleme
│   │   │   └── ThumbnailGrid.jsx
│   │   └── shared/
│   │       ├── Modal.jsx
│   │       ├── ConfirmDialog.jsx
│   │       ├── SearchBar.jsx
│   │       └── EmptyState.jsx
│   └── utils/
│       ├── ipc.js               # IPC çağrılarını saran yardımcı
│       └── formatters.js        # Tarih, boyut formatları
├── package.json
├── vite.config.js
├── tailwind.config.js
└── electron-builder.yml
```

---

## VERİTABANI ŞEMASI

`better-sqlite3` ile SQLite kullanılacak. Veritabanı dosyası uygulama veri klasöründe (`userData`) saklanacak. Aşağıdaki tabloları ve index'leri **eksiksiz** oluştur:

```sql
-- Ayarlar tablosu
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Defterler
CREATE TABLE IF NOT EXISTS books (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
    total_pages     INTEGER NOT NULL DEFAULT 0,
    cover_image     TEXT,           -- Kapak resmi dosya yolu
    storage_folder  TEXT,           -- Bu deftere ait özel klasör (opsiyonel)
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sayfalar
CREATE TABLE IF NOT EXISTS pages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id         INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    page_number     INTEGER NOT NULL,
    -- A Yüzü
    side_a_image    TEXT,           -- Dosya yolu
    side_a_notes    TEXT,
    side_a_uploaded INTEGER DEFAULT 0,  -- Boolean: 0 / 1
    -- B Yüzü
    side_b_image    TEXT,
    side_b_notes    TEXT,
    side_b_uploaded INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(book_id, page_number)
);

-- Tam metin arama (FTS5) — notlar üzerinde hızlı arama
CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
    side_a_notes,
    side_b_notes,
    content='pages',
    content_rowid='id'
);

-- FTS trigger'ları
CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
    INSERT INTO pages_fts(rowid, side_a_notes, side_b_notes)
    VALUES (new.id, new.side_a_notes, new.side_b_notes);
END;

CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages BEGIN
    INSERT INTO pages_fts(pages_fts, rowid, side_a_notes, side_b_notes)
    VALUES ('delete', old.id, old.side_a_notes, old.side_b_notes);
    INSERT INTO pages_fts(rowid, side_a_notes, side_b_notes)
    VALUES (new.id, new.side_a_notes, new.side_b_notes);
END;

CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
    INSERT INTO pages_fts(pages_fts, rowid, side_a_notes, side_b_notes)
    VALUES ('delete', old.id, old.side_a_notes, old.side_b_notes);
END;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_pages_book_id ON pages(book_id);
CREATE INDEX IF NOT EXISTS idx_pages_book_page ON pages(book_id, page_number);
```

**Kimlik bilgileri `settings` tablosunda saklanır.** Uygulama ilk kez başlatıldığında aşağıdaki varsayılan değerler yoksa otomatik olarak eklenir:

```sql
INSERT OR IGNORE INTO settings (key, value) VALUES ('auth_username', 'admin');
INSERT OR IGNORE INTO settings (key, value) VALUES ('auth_password_hash', '<bcrypt_hash_of_1234>');
```

Şifre düz metin olarak **asla** saklanmaz; `bcryptjs` ile hash'lenerek `settings` tablosuna yazılır.

---

## KİMLİK DOĞRULAMA (AUTH) SİSTEMİ

### Genel Yaklaşım

- Uygulama açıldığında React Router önce `/login` rotasına yönlendirir.
- Kullanıcı adı + şifre doğrulandıktan sonra Zustand `useAuthStore`'da `isAuthenticated: true` set edilir ve `/` rotasına yönlendirme yapılır.
- Oturum yalnızca uygulama açık olduğu süre boyunca geçerlidir (bellek tabanlı); uygulama kapanınca sıfırlanır. `localStorage` veya disk kalıcılığı **kullanılmaz**.
- Tüm korunan rotalar `ProtectedRoute` bileşeni ile sarılır; `isAuthenticated` false ise `/login`'e yönlendirme yapılır.

### Bağımlılık

`bcryptjs` paketi kurulacak (native addon gerektirmez, saf JS):

```bash
npm install bcryptjs
```

### `electron/handlers/authHandlers.js`

```javascript
// auth:login  →  { username, password }  →  { success, error? }
// auth:changeCredentials  →  { currentPassword, newUsername, newPassword }  →  { success, error? }
```

- `auth:login`: `settings` tablosundan `auth_username` ve `auth_password_hash` değerlerini çek; bcrypt ile karşılaştır; eşleşirse `{ success: true }`, eşleşmezse `{ success: false, error: 'Kullanıcı adı veya şifre hatalı.' }` döndür.
- `auth:changeCredentials`: Önce `currentPassword` ile mevcut şifreyi doğrula; geçerliyse yeni kullanıcı adı ve yeni şifrenin hash'ini `settings` tablosuna yaz.

### `src/store/useAuthStore.js`

```javascript
// state: { isAuthenticated: false }
// actions: login(), logout()
```

### `src/pages/Login.jsx`

- Tam ekran merkezi giriş formu
- Uygulama logosu / adı üstte
- Kullanıcı adı ve şifre input alanları
- "Giriş Yap" butonu — IPC üzerinden `auth:login` çağrısı
- Hata mesajı alanı (yanlış giriş durumunda)
- Tasarım: Temaya uygun premium lacivert/siyah, ince çerçeveli giriş kartı, accent renkli buton

### `src/components/auth/ProtectedRoute.jsx`

```jsx
// useAuthStore'dan isAuthenticated oku
// false ise <Navigate to="/login" replace />
// true ise <Outlet />
```

### `src/App.jsx` — Rota Yapısı

```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<Layout />}>
      <Route index element={<Dashboard />} />
      <Route path="books/:id" element={<BookDetail />} />
      <Route path="books/:id/pages/:pageId" element={<PageViewer />} />
      <Route path="search" element={<Search />} />
      <Route path="pdf-export" element={<PdfExport />} />
      <Route path="settings" element={<Settings />} />
    </Route>
  </Route>
</Routes>
```

---

## ELECTRON ANA SÜREÇ (main.js)

`electron/main.js` dosyası şu sorumlulukları taşımalı:

- `app.getPath('userData')` altında `defter-arsiv/` klasörü oluştur, veritabanı burada saklanacak
- `settings` tablosundan `storage_path` değerini oku; yoksa `userData/images/` olarak ata ve kaydet
- İlk çalıştırmada `auth_username` ve `auth_password_hash` varsayılan değerlerini `settings` tablosuna ekle (yoksa)
- Uygulama penceresi: `1280x800`, minimum `1024x600`, başlık çubuğu özelleştirilebilir
- `preload.js` ile `contextBridge` aracılığıyla güvenli IPC kanalları aç
- `handlers/` klasöründeki tüm handler dosyalarını (`authHandlers` dahil) import edip `ipcMain.handle()` ile kaydet
- Dev modunda `http://localhost:5173`, production'da `dist/index.html` yükle

---

## PRELOAD / IPC KANALLARI

`electron/preload.js` içinde `contextBridge.exposeInMainWorld('electronAPI', {...})` ile şu kanalları aç:

```javascript
// Kimlik Doğrulama
auth: {
    login: (credentials)          => ipcRenderer.invoke('auth:login', credentials),
    changeCredentials: (payload)  => ipcRenderer.invoke('auth:changeCredentials', payload),
}

// Defterler
books: {
    getAll: ()           => ipcRenderer.invoke('books:getAll'),
    getById: (id)        => ipcRenderer.invoke('books:getById', id),
    create: (data)       => ipcRenderer.invoke('books:create', data),
    update: (id, data)   => ipcRenderer.invoke('books:update', id, data),
    delete: (id)         => ipcRenderer.invoke('books:delete', id),
    setCover: (id, path) => ipcRenderer.invoke('books:setCover', id, path),
}

// Sayfalar
pages: {
    getByBook: (bookId)         => ipcRenderer.invoke('pages:getByBook', bookId),
    getById: (id)               => ipcRenderer.invoke('pages:getById', id),
    create: (data)              => ipcRenderer.invoke('pages:create', data),
    bulkCreate: (bookId, count) => ipcRenderer.invoke('pages:bulkCreate', bookId, count),
    update: (id, data)          => ipcRenderer.invoke('pages:update', id, data),
    delete: (id)                => ipcRenderer.invoke('pages:delete', id),
}

// Resimler
images: {
    upload: (pageId, side, sourcePath) => ipcRenderer.invoke('images:upload', pageId, side, sourcePath),
    uploadFromDialog: (pageId, side)   => ipcRenderer.invoke('images:uploadFromDialog', pageId, side),
    delete: (pageId, side)             => ipcRenderer.invoke('images:delete', pageId, side),
    export: (imagePaths, destFolder)   => ipcRenderer.invoke('images:export', imagePaths, destFolder),
    getThumbnail: (imagePath)          => ipcRenderer.invoke('images:getThumbnail', imagePath),
}

// Arama
search: {
    query: (text, bookId?)  => ipcRenderer.invoke('search:query', text, bookId),
}

// PDF
pdf: {
    generate: (selections)  => ipcRenderer.invoke('pdf:generate', selections),
    // selections: [{ bookId, bookName, pageNumber, side, imagePath }, ...]
}

// Ayarlar
settings: {
    get: (key)           => ipcRenderer.invoke('settings:get', key),
    set: (key, value)    => ipcRenderer.invoke('settings:set', key, value),
    getStoragePath: ()   => ipcRenderer.invoke('settings:getStoragePath'),
    setStoragePath: (p)  => ipcRenderer.invoke('settings:setStoragePath', p),
}

// Import / Export
archive: {
    exportFull: ()  => ipcRenderer.invoke('archive:exportFull'),   // ZIP + JSON
    importFull: ()  => ipcRenderer.invoke('archive:importFull'),   // ZIP içe aktar
}
```

---

## RESİM DEPOLAMA STRATEJİSİ

```
[storage_path]/              ← Ayarlardan okunur, varsayılan: userData/images/
├── covers/
│   └── book_{id}.jpg        ← Defter kapakları
└── books/
    └── book_{id}/
        ├── page_{number}_A.jpg        ← A yüzü orijinal
        ├── page_{number}_B.jpg        ← B yüzü orijinal
        ├── page_{number}_A_thumb.jpg  ← 300px thumbnail (sharp ile)
        └── page_{number}_B_thumb.jpg
```

**Kurallar:**
- Orijinal resim her zaman saklanır, üzerine yazılmaz; eskisi silinir.
- Thumbnail'lar `sharp` ile otomatik üretilir (max 300px genişlik, kalite 80).
- Veritabanında yalnızca `storage_path`'e göre **göreli yol** saklanır (taşınabilirlik için).

---

## EKRANLAR VE ÖZELLİKLER

### 0. Login (Giriş Ekranı)

- Tam ekran, merkezi konumlandırılmış giriş kartı
- Üstte uygulama adı / logosu (tema accent rengiyle)
- Kullanıcı adı ve şifre input alanları (şifre alanında göster/gizle toggle)
- "Giriş Yap" butonu — yüklenme durumunda spinner
- Hatalı giriş sonrasında kırmızı hata mesajı
- Enter tuşuyla form gönderimi

### 1. Dashboard (Ana Ekran)
- Tüm defterlerin kart görünümü (kapak resmi, isim, toplam sayfa, yüklenen fotoğraf sayısı / yüzdesi)
- Defter ekle butonu → `BookForm` modal açılır
- Her karta sağ tık menüsü: Düzenle / Sil / Klasörde Aç

### 2. BookDetail (Defter Detay)
- Üstte defter bilgileri (isim, açıklama, kapak, istatistik)
- Alt kısımda **PageGrid**: Her sayfa için bir kart
- Her sayfa kartı:
  - Sayfa numarası
  - A Yüzü ve B Yüzü alanı
  - Fotoğraf varsa: thumbnail göster + yeşil ✓ işareti
  - Fotoğraf yoksa: gri boş alan + upload ikonu
  - Üzerine tıklayınca `PageViewer` açılır
- Filtre: Tümü / Fotoğraflı / Eksik

### 3. PageViewer (Sayfa Görüntüleyici)
- A ve B yüzünü yan yana büyük görüntüle
- Önceki / Sonraki sayfa navigasyonu
- Fotoğraf yükleme / değiştirme / silme
- Not ekleme alanı (her yüz için ayrı)
- Tam ekran modu

### 4. Search (Arama)
- Tüm defterlerde veya belirli bir defterde arama
- Arama alanları: not metni (FTS5), defter adı, sayfa numarası
- Sonuçlar: thumbnail + defter adı + sayfa no + eşleşen metin
- Sonuca tıklayınca ilgili `PageViewer` açılır

### 5. PdfExport (PDF Derleme)
- Sol panel: Defter ve sayfa seçimi (checkbox ile)
- Seçilen sayfaları sağ panelde önizle (sıralı liste)
- Sırayı sürükle-bırak ile değiştir
- Her sayfada: defter adı + sayfa no + A/B yüzü etiketi
- "PDF Oluştur" → kayıt konumu seç → `pdfkit` ile oluştur
- PDF'de her resmin altında: `[DeftterAdı] — Sayfa X — A Yüzü` bilgisi

### 6. Settings (Ayarlar)
- Resim depolama klasörü: mevcut yolu göster + "Değiştir" butonu
- **Kimlik bilgileri bölümü:**
  - Mevcut kullanıcı adını göster
  - "Kullanıcı Adı / Şifre Değiştir" formu: mevcut şifre + yeni kullanıcı adı + yeni şifre + yeni şifre tekrar
  - Doğrulama: yeni şifreler eşleşmeli, minimum 4 karakter
  - Başarı / hata mesajı göster
- Tam yedek al (export): ZIP dosyası oluştur (DB + tüm resimler + manifest.json)
- Yedekten geri yükle (import): ZIP dosyası seç, içe aktar
- Uygulama hakkında bilgileri

---

## IMPORT / EXPORT FORMATI

Taşınabilirlik için ZIP tabanlı arşiv:

```
defter-arsiv-backup-YYYY-MM-DD.zip
├── manifest.json        # Versiyon, tarih, özet bilgi
├── database.sqlite      # Tam veritabanı dosyası
└── images/              # Tüm resim dosyaları (orijinal yapıyla)
    ├── covers/
    └── books/
```

`manifest.json` örneği:
```json
{
    "version": "1.0",
    "exported_at": "2025-01-15T10:30:00Z",
    "book_count": 5,
    "page_count": 342,
    "image_count": 589
}
```

Import sırasında:
1. Mevcut veriler yedeklenir (otomatik)
2. ZIP açılır
3. `database.sqlite` yerine kopyalanır
4. Resimler `storage_path`'e kopyalanır
5. Göreli yollar güncellenir

---

## UI / TASARIM REHBERİ

- **Tema:** Koyu (dark), premium lacivert-siyah tonları — şık ve profesyonel bir arşiv arayüzü hissi
- **Font:** Başlıklar için serifli (örn. `Playfair Display`), gövde için temiz sans-serif (örn. `Inter` veya `Source Sans 3`)
- **Sidebar:** Sabit sol panel — Dashboard, Arama, PDF Export, Ayarlar navigasyonu
- **Renk Paleti (CSS değişkenleri):**
  ```css
  --bg-primary:    #080c14;   /* En derin arka plan — neredeyse siyah lacivert */
  --bg-secondary:  #0d1422;   /* Panel ve sidebar arka planı */
  --bg-card:       #111827;   /* Kart ve modal arka planı */
  --bg-elevated:   #1a2235;   /* Hover / aktif kart, dropdown */
  --accent:        #4f8ef7;   /* Birincil accent — elektrik mavisi */
  --accent-hover:  #6aa3ff;   /* Accent hover durumu */
  --accent-dim:    #1e3a6e;   /* Accent arka plan tonu (badge, seçili durum) */
  --text-primary:  #e8edf5;   /* Ana metin — soğuk beyaz */
  --text-muted:    #5a6a85;   /* İkincil metin, placeholder */
  --success:       #34c97a;   /* Yükleme tamamlandı, onay */
  --danger:        #e05252;   /* Hata, silme uyarısı */
  --border:        #1e2d45;   /* Kart ve panel kenarlıkları */
  --border-subtle: #131f32;   /* Çok ince ayırıcı çizgiler */
  ```
- **Giriş ekranı:** Koyu arka plan üzerinde ortalanmış cam efekti kart (`backdrop-filter: blur`), accent renkli logo / başlık, ince kenarlıklı input'lar
- **Sayfa kartları:** Izgara düzeni; fotoğrafı yüklenmiş yüzler `--accent` renkli kenarlık ve ✓ rozet, eksik yüzler `--border` renkli soluk çerçeve
- **Animasyonlar:** Sade, işlevsel — modal açılış, hover durumları, giriş ekranı fade-in
- **Butonlar:** Birincil eylemler `--accent` renk dolgusu, ikincil eylemler `--bg-elevated` şeffaf; köşeler `rounded-lg`

---

## PACKAGE.JSON BAĞIMLILIKLARI

```json
{
  "dependencies": {
    "bcryptjs": "^2.x",
    "better-sqlite3": "^9.x",
    "sharp": "^0.33.x",
    "pdfkit": "^0.15.x",
    "archiver": "^7.x",
    "unzipper": "^0.12.x",
    "zustand": "^4.x",
    "react-router-dom": "^6.x",
    "react": "^18.x",
    "react-dom": "^18.x"
  },
  "devDependencies": {
    "electron": "^30.x",
    "electron-builder": "^24.x",
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

---

## ELECTRON-BUILDER YAPISILANDIRMASI

```yaml
# electron-builder.yml
appId: com.personal.defter-arsiv
productName: Defter Arşiv
win:
  target: nsis
  icon: assets/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
files:
  - dist/**/*
  - electron/**/*
  - node_modules/**/*
extraResources:
  - from: assets/
    to: assets/
```

---

## GELİŞTİRME ORTAMI KURULUM ADIMLARI

Agent şu adımları sırayla çalıştırmalı:

```bash
# 1. Proje oluştur
npm create vite@latest defter-arsiv -- --template react
cd defter-arsiv

# 2. Bağımlılıkları kur
npm install bcryptjs better-sqlite3 sharp pdfkit archiver unzipper zustand react-router-dom
npm install -D electron electron-builder tailwindcss autoprefixer postcss @vitejs/plugin-react

# 3. Tailwind başlat
npx tailwindcss init -p

# 4. Klasör yapısını oluştur (yukarıdaki yapıya göre)

# 5. Dev script'leri package.json'a ekle:
# "dev": "concurrently \"vite\" \"electron .\"",
# "build": "vite build && electron-builder"
```

---

## KURULUM SONRASI KONTROL LİSTESİ

Agent aşağıdakilerin tamamının çalışır durumda olduğunu doğrulamalıdır:

- [ ] `npm run dev` ile uygulama açılıyor
- [ ] Uygulama açılışta `/login` ekranına yönlendiriyor
- [ ] Varsayılan kimlik bilgileriyle (`admin` / `1234`) giriş yapılabiliyor
- [ ] Hatalı girişte hata mesajı görünüyor
- [ ] Başarılı girişte Dashboard'a yönlendirme yapılıyor
- [ ] Korunan rotalara giriş yapmadan erişilemiyor
- [ ] Veritabanı dosyası `userData` klasöründe oluşturuluyor
- [ ] `settings` tablosunda `auth_username` ve `auth_password_hash` kayıtları var
- [ ] Tüm IPC kanalları `preload.js` üzerinden erişilebilir
- [ ] Resim depolama klasörü otomatik oluşturuluyor
- [ ] Dashboard'da boş defter listesi görünüyor
- [ ] Defter ekleme modal'ı açılıyor ve formu çalışıyor
- [ ] Sayfa grid'i render ediliyor
- [ ] Arama sayfası render ediliyor
- [ ] Ayarlar sayfasında depolama yolu ve kimlik bilgisi değiştirme formu görünüyor
- [ ] Kimlik bilgileri değiştirme formu çalışıyor (mevcut şifre doğrulaması dahil)

---

## ÖNEMLİ NOTLAR

1. **Güvenlik:** `nodeIntegration: false`, `contextIsolation: true` — tüm Node erişimi yalnızca `contextBridge` üzerinden
2. **Şifre Güvenliği:** Şifreler düz metin olarak hiçbir yerde saklanmaz; `bcryptjs` ile hash'lenerek `settings` tablosuna yazılır. Hash karşılaştırması her zaman `bcrypt.compare()` ile yapılır.
3. **Oturum Yönetimi:** Oturum durumu yalnızca Zustand belleğinde tutulur; uygulama kapanınca sıfırlanır. `localStorage` veya harici token mekanizması kullanılmaz.
4. **Hata Yönetimi:** Her IPC handler `try/catch` ile sarılmalı, hatalar `{ success: false, error: message }` formatında dönmeli
5. **Thumbnail Önbellekleme:** Thumbnail'lar diske yazıldıktan sonra yeniden üretilmemeli; dosya varlığı kontrol edilmeli
6. **Silme İşlemleri:** Defter silinince cascade ile sayfalar silinmeli, resim dosyaları da diskten kaldırılmalı
7. **Sayfa Oluşturma:** Deftere sayfa sayısı girilince o kadar sayfa kaydı otomatik toplu oluşturulmalı (`bulkCreate`)
8. **Resim Yolları:** Veritabanında mutlak yol değil, `storage_path`'e göre göreli yol sakla

---

*Bu prompt ile oluşturulan altyapı üzerine özellikler iteratif olarak eklenebilir.*
