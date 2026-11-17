# WidBer — Berber Randevu Sistemi

Tek işletmeli berber randevu uygulaması: müşteri tarafında hızlı randevu,
yönetim tarafında personel ve patron panelleri. Sunucu yok; tüm veri Supabase'de.

## Teknolojiler

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Supabase (Postgres, Auth, Storage)
- react-router-dom, framer-motion, recharts, date-fns

## Kurulum

```bash
npm install
cp .env.example .env   # değerleri doldur
npm run dev
```

Gerekli ortam değişkenleri `.env.example` içinde listeli. `VITE_*` değişkenleri
tarayıcı paketine gömülür, gizli anahtar olarak kullanılmamalıdır.

## Veritabanı

Yeni bir Supabase projesi için `supabase-setup.sql` dosyasını SQL Editor'de
çalıştırın. Sonrasında sırayla:

1. `supabase-site-settings.sql`
2. `supabase-staff-panel.sql`
3. `supabase-performance-indexes.sql`
4. `supabase-slot-only-booking.sql`
5. `supabase-security-performance-fixes.sql`
6. `supabase-slot-visibility-fix.sql`
7. `supabase-cancel-link.sql`

Patron e-postası `supabase-setup.sql` içindeki `is_owner()` fonksiyonunda ve
`.env` içindeki `VITE_ADMIN_EMAIL` değerinde **aynı** olmalıdır.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Tip kontrolü + üretim derlemesi |
| `npm run lint` | oxlint |
| `npm run preview` | Derlemeyi yerelde önizleme |
| `npm run db:*` | Uzak Supabase'e SQL dosyası uygulama (bkz. `package.json`) |

## Sayfalar

- `/` — ana sayfa, hızlı randevu widget'ı
- `/booking` — 5 adımlı randevu sihirbazı
- `/admin/login` — personel girişi (PIN)
- `/admin/login/staff` — patron girişi (e-posta/şifre)
- `/admin/appointments/:date` — günlük randevular
- `/admin/calendar`, `/admin/reports` — personel + patron
- `/admin/services`, `/admin/barbers`, `/admin/availability`, `/admin/settings` — patron

## Yayınlama

`DEPLOY.md` dosyasına bakın (Cloudflare Pages, Netlify, Vercel, GitHub Pages).
