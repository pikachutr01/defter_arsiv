export default function Help() {
  return (
    <section className="space-y-8 pb-16">
      <div className="border-b border-[var(--border)] pb-6">
        <h2 className="text-3xl font-semibold text-[var(--text-primary)]">Kullanım Rehberi</h2>
        <p className="mt-3 text-[var(--text-muted)] max-w-3xl">
          Cilt Dijital Kayıt Sistemi'nin tüm ekranlarını ve sunduğu özellikleri en ince ayrıntısına kadar öğrenebileceğiniz detaylı dokümantasyon sayfasıdır. Hangi ekranda hangi işlemleri yapabileceğinizi aşağıda bulabilirsiniz.
        </p>
      </div>

      <div className="space-y-8">

        {/* Giriş ve Şifre Kurtarma */}
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="bg-[var(--bg-sidebar)] px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-xl font-medium text-[var(--text-primary)] flex items-center gap-2">
              <span className="bg-[var(--accent-dim)] text-[var(--accent)] p-2 rounded-lg text-sm">1</span>
              Giriş Ekranı ve Şifre Kurtarma
            </h3>
          </div>
          <div className="p-6 space-y-4 text-[var(--text-muted)] text-sm leading-relaxed">
            <p>Sistemi güvenli bir şekilde kullanabilmeniz için giriş ekranı bulunmaktadır.</p>
            <ul className="list-inside list-disc space-y-2 ml-2">
              <li><strong>Giriş Yapma:</strong> Kullanıcı adı ve şifrenizle yerel veritabanınıza güvenli giriş yaparsınız.</li>
              <li><strong>Şifre Kurtarma (Şifremi Unuttum):</strong> Şifrenizi unutursanız endişelenmeyin. Ekranda size cihazınıza özel bir <em>Cihaz Kimliği (Device ID)</em> gösterilecektir. Bu kimliği sistem yöneticisine/destek ekibine ileterek tek kullanımlık bir <strong>Kurtarma Anahtarı (Token)</strong> alabilir ve yeni şifrenizi belirleyebilirsiniz.</li>
            </ul>
          </div>
        </article>

        {/* Ana Sayfa (Ciltler) */}
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="bg-[var(--bg-sidebar)] px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-xl font-medium text-[var(--text-primary)] flex items-center gap-2">
              <span className="bg-[var(--accent-dim)] text-[var(--accent)] p-2 rounded-lg text-sm">2</span>
              Ana Sayfa (Ciltler)
            </h3>
          </div>
          <div className="p-6 space-y-4 text-[var(--text-muted)] text-sm leading-relaxed">
            <p>Sistemin kalbi olan ana ekrandır. Fiziksel defter ve ciltlerinizin dijital klasörleri burada listelenir.</p>
            <ul className="list-inside list-disc space-y-2 ml-2">
              <li><strong>Cilt Listesi ve İlerleme:</strong> Tüm ciltlerinizi bir kart formatında görebilirsiniz. Her kartın üzerinde toplam kaç sayfadan kaçının fotoğraflandığını gösteren ilerleme çubuğu bulunur. Ayrıca o cilde ait toplam görsel sayısı da belirtilir.</li>
              <li><strong>Yeni Cilt Ekleme:</strong> Sağ üstteki butonu kullanarak "Cilt Adı", "Açıklama" ve "Toplam Sayfa Sayısı" girerek yeni cilt oluşturabilirsiniz. Sistem, yazdığınız sayfa sayısı kadar boş kayıt satırını otomatik olarak oluşturur.</li>
              <li><strong>Hızlı Arama:</strong> Ekrandaki arama çubuğu ile cilt isimleri veya açıklamaları arasında anında filtreleme yapabilirsiniz.</li>
              <li><strong>Düzenleme ve Silme:</strong> Cilt kartının üzerindeki menüden cildin ismini/açıklamasını güncelleyebilir veya cildi arşivden tamamen silebilirsiniz.</li>
            </ul>
          </div>
        </article>

        {/* Cilt Detay ve Sayfa Yönetimi */}
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="bg-[var(--bg-sidebar)] px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-xl font-medium text-[var(--text-primary)] flex items-center gap-2">
              <span className="bg-[var(--accent-dim)] text-[var(--accent)] p-2 rounded-lg text-sm">3</span>
              Cilt Detay ve Sayfa Yönetimi
            </h3>
          </div>
          <div className="p-6 space-y-4 text-[var(--text-muted)] text-sm leading-relaxed">
            <p>Ana sayfadan bir cilde tıkladığınızda o cildin içindeki tüm sayfaların durumunu yönettiğiniz ve sayfalarla ilgili tüm işlemleri gerçekleştirdiğiniz ana ekrandır. Başka bir ekrana geçmeden her şeyi doğrudan kartlar üzerinden yapabilirsiniz.</p>
            <ul className="list-inside list-disc space-y-2 ml-2">
              <li><strong>Sayfa Kartları:</strong> Cilde ait tüm sayfalar kartlar halinde listelenir. Hangi sayfaların fotoğrafının çekildiğini, hangilerinin boş olduğunu görebilirsiniz.</li>
              <li><strong>Fotoğraf Yükleme:</strong> Doğrudan bilgisayarınızdan bir fotoğrafı sürükleyip sayfa kartının üzerine bırakarak (Sürükle & Bırak) hızlıca yükleyebilirsiniz. Veya resim yüklenmemiş kartların üzerine tıklayarak dosyalarınızdan seçebilirsiniz.</li>
              <li><strong>Araç Çubuğu (Görsel İşlemleri):</strong> Resim yüklenmiş sayfaların altında özel bir araç çubuğu belirir. Buradan resmi PDF sırasına ekleyebilir, başka bir resimle değiştirebilir, 90 derece sola döndürebilir (rotasyon), silebilir veya tam boyut büyüterek inceleyebilirsiniz.</li>
              <li><strong>Tam Boyut İnceleme (Pan & Zoom):</strong> Resmi büyüttüğünüzde (göz ikonuna basıldığında) <strong>Ctrl + Fare Tekerleği</strong> ile resmi imlecin bulunduğu yöne doğru yakınlaştırıp uzaklaştırabilir, farenizin sol tuşuna basılı tutarak resmi dilediğiniz yöne <strong>sürükleyip (pan)</strong> rahatça inceleyebilirsiniz.</li>
              <li><strong>Sayfa Notları:</strong> Her sayfa için özel notlar ekleyebilirsiniz. Araç çubuğundaki not ikonuna tıklayarak açılan pencereden notunuzu yazabilirsiniz. Kayıtlı notu olan sayfaların not ikonuna fareyle geldiğinizde not içeriği hızlıca gösterilir.</li>
              <li><strong>Filtreleme:</strong> Üst menüden "Tümü", "Fotoğraflı" veya "Eksik" filtrelerini kullanarak yalnızca eksik olan sayfaları hızlıca listeleyebilirsiniz.</li>
              <li><strong>Cilt Notu:</strong> Sadece bu cildi ilgilendiren özel notlar veya özet bilgileri yazıp kaydedebileceğiniz metin kutusu bulunur.</li>
            </ul>
          </div>
        </article>

        {/* Gelişmiş Arama */}
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="bg-[var(--bg-sidebar)] px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-xl font-medium text-[var(--text-primary)] flex items-center gap-2">
              <span className="bg-[var(--accent-dim)] text-[var(--accent)] p-2 rounded-lg text-sm">4</span>
              Arama Ekranı
            </h3>
          </div>
          <div className="p-6 space-y-4 text-[var(--text-muted)] text-sm leading-relaxed">
            <p>Arşiviniz büyüdüğünde aradığınız bir notu bulmanızı sağlayan global arama motorudur.</p>
            <ul className="list-inside list-disc space-y-2 ml-2">
              <li>Ciltlerin isimlerinde, açıklamalarında, cilt notlarında ve sayfalara düşülen tüm "Sol/Sağ Sayfa Notları"nda aynı anda kelime araması yapar.</li>
              <li>Bulunan sonuçlar "Cilt" ve "Sayfa" olarak iki kategoride gösterilir.</li>
              <li>Sonuca tıklayarak doğrudan o cilde veya ilgili sayfanın düzenleme ekranına ışınlanırsınız.</li>
            </ul>
          </div>
        </article>

        {/* PDF Oluştur */}
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="bg-[var(--bg-sidebar)] px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-xl font-medium text-[var(--text-primary)] flex items-center gap-2">
              <span className="bg-[var(--accent-dim)] text-[var(--accent)] p-2 rounded-lg text-sm">5</span>
              PDF Oluştur
            </h3>
          </div>
          <div className="p-6 space-y-4 text-[var(--text-muted)] text-sm leading-relaxed">
            <p>Seçtiğiniz sayfaları birleştirerek tek bir PDF dokümanı elde etmenizi sağlar.</p>
            <ul className="list-inside list-disc space-y-2 ml-2">
              <li><strong>Kuyruk Yönetimi:</strong> Sayfa Görüntüleme ekranında "PDF Sırasına Ekle" dediğiniz tüm görseller burada listelenir. Çıktıda görünmesini istemediklerinizi listeden silebilirsiniz veya "Tümünü Temizle" diyebilirsiniz.</li>
              <li><strong>Çizim Düzenleyicisi:</strong> Kuyruğa eklediğiniz resimlerin üzerine not yazmak veya belirli alanları vurgulamak/kapatmak için kartın üzerindeki kalem ikonuna (✏️) tıklayabilirsiniz. Çizim ekranında daha hassas çalışabilmek için <strong>Ctrl + Fare Tekerleği</strong> kombinasyonuyla imlecin bulunduğu noktaya <strong>yakınlaştırma (zoom)</strong> yapabilirsiniz. İşlemler orijinal çözünürlük üzerinden kayıpsız (%98) kaliteyle kaydedilir.</li>
              <li><strong>PDF Çıktısı Alma:</strong> Liste hazır olduğunda "PDF Oluştur" diyerek dokümanı bilgisayarınızda istediğiniz klasöre kaydedebilirsiniz. Görüntüler A4 boyutunda dikey olarak sayfaya hizalanır.</li>
            </ul>
          </div>
        </article>

        {/* Ayarlar */}
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="bg-[var(--bg-sidebar)] px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-xl font-medium text-[var(--text-primary)] flex items-center gap-2">
              <span className="bg-[var(--accent-dim)] text-[var(--accent)] p-2 rounded-lg text-sm">6</span>
              Ayarlar ve Yedekleme
            </h3>
          </div>
          <div className="p-6 space-y-4 text-[var(--text-muted)] text-sm leading-relaxed">
            <p>Veri güvenliği ve kullanıcı tercihlerinin yönetildiği ekrandır.</p>
            <ul className="list-inside list-disc space-y-2 ml-2">
              <li><strong>Kullanıcı Bilgileri:</strong> Mevcut şifrenizi girerek kullanıcı adınızı ve giriş şifrenizi değiştirebilirsiniz.</li>
              <li><strong>Veri Depolama Konumu:</strong> Sistem yerel çalıştığı için tüm veri belirlediğiniz bir ana klasörde toplanır. Klasörü "Değiştir" diyerek arşivinizin diskte kaplayacağı alanı farklı bir sürücüye (ör: D: sürücüsüne) veya taşınabilir bir diske taşıyabilirsiniz.</li>
              <li><strong>Tam Yedek Alma:</strong> "Sistemi Yedekle" butonu veritabanı dosyanızın bir kopyasını almanızı sağlar. Olası çökme veya sistem değişimlerinde kullanmak için düzenli aralıklarla yedek almanız şiddetle tavsiye edilir.</li>
              <li><strong>Yedekten Geri Yükleme:</strong> Daha önceden alınmış yedeği "Geri Yükle" ile sisteme tekrar tanımlayabilirsiniz. Dikkat: Bu işlem mevcut verilerinizin üzerine yazabilir.</li>
            </ul>
          </div>
        </article>

      </div>

      <div className="mt-16 text-center text-sm text-[var(--text-muted)] pt-8 border-t border-[var(--border)]">
        <p className="mb-2">Sistemle ilgili teknik destek almak veya sorun bildirmek için iletişime geçebilirsiniz:</p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="mailto:abdullahkaya544@gmail.com?subject=Cilt Dijital Kayıt Sistemi Destek Talebi"
            className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2 rounded-lg text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
            E-Posta Gönder
          </a>
          <a
            href="https://github.com/pikachutr01/defter_arsiv"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2 rounded-lg text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
            GitHub Projesi
          </a>
        </div>
      </div>
    </section>
  )
}
