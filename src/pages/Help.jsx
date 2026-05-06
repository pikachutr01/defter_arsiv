export default function Help() {
  return (
    <section className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-semibold">Kullanım Rehberi</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Cilt Dijital Kayıt Sistemi'ni en verimli şekilde kullanabilmeniz için hazırlanan temel bilgilendirme dokümanı.
        </p>
      </div>

      <div className="space-y-6">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Sisteme Giriş ve Hesap Ayarları</h3>
          <div className="mt-3 space-y-3 text-sm text-[var(--text-muted)]">
            <p>
              Uygulamaya giriş yaptıktan sonra <strong>Ayarlar</strong> menüsüne giderek mevcut kullanıcı adı ve şifrenizi güvenliğiniz için güncelleyebilirsiniz.
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Uygulama her cihaz için özel bir kimlik üretir, böylece verileriniz dış müdahalelere karşı korunur.</li>
              <li>Ayarlar kısmından kişisel bilgilerinizi dilediğiniz zaman değiştirebilirsiniz.</li>
            </ul>
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Cilt ve Sayfa Yönetimi</h3>
          <div className="mt-3 space-y-3 text-sm text-[var(--text-muted)]">
            <p>
              Fiziksel ciltlerinizi dijital ortama aktarmak için <strong>Ana Sayfa (Ciltler)</strong> ekranından yeni kayıtlar oluşturabilirsiniz.
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Oluşturduğunuz her bir cilt için istediğiniz sayıda sayfa ekleyebilirsiniz.</li>
              <li>Sayfaların hem <strong>Sol</strong> hem de <strong>Sağ</strong> yüzleri için ayrı ayrı fotoğraflar yükleyebilir ve bu sayfalara özel notlar düşebilirsiniz.</li>
            </ul>
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Gelişmiş Arama ve PDF Dışa Aktarımı</h3>
          <div className="mt-3 space-y-3 text-sm text-[var(--text-muted)]">
            <p>
              Sistem içerisindeki tüm veriler (cilt adları, açıklamalar ve sayfalara düşülen özel notlar) akıllı arama altyapısına dâhildir. Arama çubuğunu kullanarak aradığınız belgelere saniyeler içinde ulaşabilirsiniz.
            </p>
            <p>
              Arşivinizden belirli sayfaları veya ciltleri bilgisayarınıza indirmek için <strong>PDF Oluştur</strong> ekranını kullanabilirsiniz. Çıktı almak istediğiniz sayfaları sıraya ekleyip tek bir PDF dosyası hâlinde dışa aktarabilirsiniz.
            </p>
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Depolama ve Yedekleme</h3>
          <div className="mt-3 space-y-3 text-sm text-[var(--text-muted)]">
            <p>
              Tüm verileriniz tamamen yerel bilgisayarınızda tutulur ve bulut sunuculara aktarılmaz. Bu sebeple veri güvenliğiniz için yedekleme adımlarını uygulamanız tavsiye edilir.
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li><strong>Ayarlar</strong> bölümünden verilerinizin bilgisayarınızda kaydedileceği ana klasörü dilediğiniz gibi değiştirebilirsiniz.</li>
              <li>Veri kaybı yaşamamak adına belirli aralıklarla "Tam Yedek Al" butonu ile arşivinizin yedeğini indirebilirsiniz.</li>
              <li>Gerektiğinde indirdiğiniz bu yedeği "Yedekten Geri Yükle" seçeneğiyle sisteme yeniden yükleyebilirsiniz.</li>
            </ul>
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Şifre Kurtarma Süreci</h3>
          <div className="mt-3 space-y-3 text-sm text-[var(--text-muted)]">
            <p>
              Giriş şifrenizi unutmanız durumunda endişelenmenize gerek yoktur. Şifrenizi güvenli bir şekilde sıfırlamak için aşağıdaki adımları izleyebilirsiniz:
            </p>
            <ul className="list-inside list-decimal space-y-2">
              <li>Giriş ekranında yer alan <strong>"Şifremi Unuttum"</strong> seçeneğine tıklayınız.</li>
              <li>Açılan ekranda cihazınıza özel olarak üretilen <strong>Cihaz Kimliği (Device ID)</strong> bilgisini göreceksiniz.</li>
              <li>Bu kimliği kopyalayarak destek ekibine iletiniz.</li>
              <li>Destek ekibi tarafından size özel, 24 saat geçerliliği olan bir <strong>Kurtarma Anahtarı (Token)</strong> iletilecektir.</li>
              <li>Size iletilen bu anahtarı aynı ekrandaki alana yapıştırıp yeni şifrenizi belirleyerek sisteme yeniden giriş yapabilirsiniz.</li>
            </ul>
          </div>
        </article>
      </div>

      <div className="mt-12 text-center text-xs text-[var(--text-muted)]">
        <p>Sistemle ilgili teknik destek almak için iletişime geçebilirsiniz:</p>
        <a 
          href="mailto:abdullahkaya544@gmail.com?subject=Cilt Dijital Kayıt Sistemi" 
          className="mt-1 inline-block text-[var(--accent)] transition hover:text-[var(--accent-hover)] hover:underline"
        >
          abdullahkaya544@gmail.com
        </a>
      </div>
    </section>
  )
}
