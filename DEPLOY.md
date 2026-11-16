# WidBer — Deployment

Bu proje Vite + React SPA'dır. Hosting tarafında tüm yolların `index.html`'e
dönmesi gerekir; aksi hâlde `/admin/...` gibi sayfalar doğrudan açıldığında 404 verir.

## Önerilen: Cloudflare Pages

- GitHub deposunu bağla
- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`
- Node sürümü: **22**
- Ortam değişkenlerini Cloudflare Pages → Settings → Environment variables
  bölümüne ekle (`.env` dosyasındaki tüm `VITE_*` anahtarları)
- İlk deploy'dan sonra ücretsiz adres: `https://<proje>.pages.dev`

SPA yönlendirmesi `public/_redirects`, önbellek/header ayarları `public/_headers`
dosyalarıyla otomatik gelir.

## Alternatif: Netlify

- GitHub deposunu bağla
- Build command: `npm run build`
- Publish directory: `dist`
- Node sürümü: 22
- Ortam değişkenlerini Site settings → Environment variables bölümüne ekle
- Ücretsiz adres: `https://<proje>.netlify.app`

SPA yönlendirmesi kök dizindeki `netlify.toml` ile hazır.

## Ortam değişkenleri

`.env` dosyasını repoya koymayın. Hosting panelinde şu anahtarları tanımlayın:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`
- `VITE_STAFF_EMAIL`
- `VITE_STAFF_PASSWORD`

Not: `VITE_*` değişkenleri istemci paketine gömülür; gizli anahtar olarak
kullanılmamalıdır.

## Domain

Ücretsiz `*.pages.dev` / `*.netlify.app` adresi yeterliyse ek işlem gerekmez.
Kendi alan adınızı kullanacaksanız hosting panelindeki **Custom domains**
bölümünden DNS kaydını ekleyin; SSL otomatik verilir.

## Supabase notu

Hosting değişikliği Supabase sorgu gecikmesini değiştirmez. Proje hâlâ
Northeast Asia (Seoul) bölgesinde; Türkiye için daha yakın bir bölge (Frankfurt)
uzun vadede daha hızlı olur.
