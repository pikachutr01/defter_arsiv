export default function Help() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl">Yardım</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Uygulamayı hızlıca kullanmak ve yönetmek için temel rehber.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg">Başlangıç</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Sisteme varsayılan kullanıcı bilgileriyle giriş yapıp ayarlar ekranından
          kullanıcı adı ve şifrenizi değiştirebilirsiniz. Uygulama ilk açılışta bu
          kurulum için benzersiz bir cihaz kimliği üretir.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg">Ciltler ve Sayfalar</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Ciltler ekranından yeni kayıt açabilir, her cilt içinde sayfalar oluşturabilir
          ve A/B yüzleri için görsel yükleyebilirsiniz.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg">Arama ve PDF</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Not alanlarında tuttuğunuz içerikler aramada kullanılır. PDF ekranından seçili
          cilt ve sayfaları dışa aktarabilirsiniz.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg">Ayarlar ve Yedekleme</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Ayarlar ekranından depolama klasörünü değiştirebilir, tam arşiv yedeği dışa
          aktarabilir ve geri yükleyebilirsiniz.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg">Şifre Kurtarma</h3>
        <div className="mt-2 space-y-3 text-sm text-[var(--text-muted)]">
          <p>
            Şifre unutulduğunda giriş ekranındaki <strong>Şifremi Unuttum</strong> akışı
            kullanılır. Bu akış yalnızca şifre sıfırlama içindir; oturum açma amaçlı
            kullanılmaz.
          </p>
          <p>
            Destek süreci: kullanıcı giriş ekranında görünen cihaz kimliğini destek
            ekibiyle paylaşır. Destek ekibi bu cihaz kimliği için en fazla 24 saat
            geçerlilikli bir kurtarma tokeni üretir.
          </p>
          <p>Token üretimi için komutlar:</p>
          <pre className="overflow-x-auto rounded-xl bg-[var(--bg-elevated)] p-3 text-xs text-[var(--text-primary)]">
{`node scripts/generate-recovery-keys.mjs
node scripts/embed-recovery-public-key.mjs --from recovery-public.pem
node scripts/generate-recovery-token.mjs --device <CIHAZ_ID> --privateKey recovery-private.pem --ttlHours 24`}
          </pre>
          <p>
            Kullanıcı bu tokeni giriş ekranındaki forma yapıştırıp yeni şifresini
            belirler. Token süresi dolarsa yeni token üretilmelidir.
          </p>
        </div>
      </div>
    </section>
  )
}
