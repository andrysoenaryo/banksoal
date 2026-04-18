# App Soal (Laravel API + React SPA)

Proyek ini adalah aplikasi bank soal dengan fitur:

- CRUD subject (induk materi)
- CRUD bab dan sub bab (opsional bertingkat)
- CRUD soal `multiple_choice` dan `essay`
- Import soal dari file Excel
- Generator paket soal berdasarkan subject/bab/sub bab dengan komposisi `%` atau `jumlah`
- Preview hasil generate + edit detail paket soal
- Export paket soal ke Excel/PDF/Word
- Manajemen user dan role/permission
- Manajemen menu navigasi (CRUD + drag & drop parent/child)
- Pagination + filter detail pada seluruh tabel frontend
- Isolasi data per user login (subject, bab, soal, paket)
- Super-admin dapat melihat data semua user

## Struktur Proyek

- `backend` : Laravel 13 (API)
- `frontend` : React + Vite (SPA)

## Changelog

Riwayat perubahan versi tersedia di file `CHANGELOG.md`.

## Backend (Laravel)

### Dependensi penting

- Sanctum untuk token API
- Spatie Permission untuk role dan permission
- Maatwebsite Excel untuk import Excel
- DomPDF untuk export PDF
- PHPWord untuk export Word

### Endpoint utama

- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `GET /api/dashboard`
- `GET /api/menus/navigation`
- `GET /api/menus/tree`
- `PUT /api/menus/reorder`
- `apiResource /api/menus`
- `apiResource /api/subjects`
- `apiResource /api/chapters`
- `apiResource /api/questions`
- `GET /api/questions/import-template`
- `GET /api/questions/import-template/docx`
- `POST /api/questions/import`
- `POST /api/questions/import-docx/preview`
- `POST /api/questions/import-docx`
- `apiResource /api/roles` (tanpa show)
- `apiResource /api/users`
- `GET /api/question-packages`
- `POST /api/question-packages/generate`
- `GET /api/question-packages/{questionPackage}`
- `PUT /api/question-packages/{questionPackage}`
- `GET /api/question-packages/{questionPackage}/rule-questions`
- `POST /api/question-packages/{questionPackage}/rules`
- `PUT /api/question-packages/{questionPackage}/items`
- `GET /api/question-packages/{questionPackage}/export/excel`
- `GET /api/question-packages/{questionPackage}/export/pdf`
- `GET /api/question-packages/{questionPackage}/export/word`
- `DELETE /api/question-packages/{questionPackage}`

### Seeder akun awal

- Email: `admin@appsoal.local`
- Password: `password`
- Role: `super-admin`

## Frontend (React)

SPA sudah mencakup:

- Login
- Dashboard ringkasan
- Manajemen subject
- Manajemen bab/sub bab
- Manajemen bank soal
- Generator paket soal
- Preview hasil paket + edit detail
- Edit soal per rule langsung di preview (ganti soal, tambah soal, hapus soal)
- Tambah rule baru langsung dari halaman preview paket
- Export paket soal Excel/PDF/Word
- Export PDF/Word dengan pilihan "dengan kunci jawaban" atau "tanpa kunci jawaban"
- Import soal Excel dan Word DOCX
- Manajemen user dan role permission
- Manajemen menu (super-admin)
- Pagination + filter per modul data

## Status Update (18 April 2026)

Status implementasi saat ini:

- Selesai: konsolidasi halaman preview paket menjadi editor per-rule yang interaktif.
- Selesai: aksi tambah/ganti/hapus soal per rule dari satu halaman.
- Selesai: tambah rule baru dari preview paket (dengan validasi subject yang sama).
- Selesai: loading indicator untuk data table dan loading preview paket.
- Selesai: export PDF/Word dengan opsi kunci jawaban.
- Selesai: perbaikan query backend saat tambah rule (menghindari SQL ambiguous order).
- Selesai: pembaruan UI rule card (header lembut, accordion show/hide, compact mode).

Catatan kompatibilitas:

- Tidak ada migrasi database baru untuk perubahan ini.
- Endpoint paket soal mengalami penambahan route untuk editor rule.

Untuk histori update per versi (added/changed/fixed), lihat `CHANGELOG.md`.

Konfigurasi API ada di file `frontend/.env.example`.

## Aturan Akses Data

- User non-super-admin: hanya melihat/mengelola data miliknya sendiri pada subject, bab/sub bab, soal, dan paket soal.
- Super-admin: dapat melihat/mengelola seluruh data user lain pada modul yang sama.

## Format Import Soal

Fitur import soal menerima file `xlsx`, `xls`, atau `docx`.
Kolom template minimal yang wajib tersedia:

- `chapter_id` atau `chapter_name` (minimal salah satu harus valid)
- `type` (`multiple_choice` atau `essay`)
- `question_text`
- `answer_key`

Kolom opsional:

- `difficulty_level` (`mudah`, `sedang`, `sulit`) - default `sedang`
- `points` - default `1`
- `option_a` sampai `option_e` (untuk `multiple_choice`)
- `correct_option_key` (untuk `multiple_choice`, harus cocok dengan opsi yang diisi)

Catatan:

- Untuk user non-super-admin, `chapter_id/chapter_name` hanya bisa memakai bab miliknya sendiri.
- Template Excel tersedia untuk mode `chapter_name/chapter_id`.
- Template Word DOCX menggunakan blok `[SOAL] ... [/SOAL]` dan format `key: value` per baris.
- Import DOCX mendukung ekstraksi gambar pertama di dalam tiap blok soal.

## Menjalankan Aplikasi

### 1. Backend

```bash
cd backend
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm.cmd install
npm.cmd run dev
```

## Deploy Hosting (banksoal.appsdraft.com)

Model deploy yang direkomendasikan:

- Satu domain untuk frontend + backend (`https://banksoal.appsdraft.com`).
- API tetap di prefix `/api`.
- Hasil build React diletakkan di `backend/public`.

### Checklist Deploy Cepat (10 Poin)

1. Domain `banksoal.appsdraft.com` aktif dan SSL valid.
2. Document root mengarah ke `backend/public`.
3. File `.env` backend sudah mode production (`APP_ENV=production`, `APP_DEBUG=false`).
4. Koneksi database production valid (`DB_*`).
5. `composer install --no-dev --optimize-autoloader` sudah sukses.
6. `php artisan key:generate` dan `php artisan migrate --force` sudah dijalankan.
7. Frontend sudah dibuild dengan `npm.cmd run build:hosting`.
8. File `backend/public/index.html` dan folder `backend/public/assets` tersedia.
9. Permission folder `storage` dan `bootstrap/cache` sudah writable.
10. Tes login + refresh route SPA + upload gambar soal sukses.

### 1. Persiapan Domain & SSL

- Tambahkan domain `banksoal.appsdraft.com` di panel hosting.
- Set document root domain ke folder `backend/public`.
- Aktifkan SSL (AutoSSL/Lets Encrypt) sampai domain dapat diakses via HTTPS.

### 2. Konfigurasi Backend Laravel (Production)

Upload source code backend lalu jalankan:

```bash
cd backend
cp .env.example .env
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Isi `.env` backend minimal:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://banksoal.appsdraft.com
DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
```

Catatan:

- Folder `storage` dan `bootstrap/cache` harus writable.
- Jika ada perubahan `.env`, jalankan `php artisan optimize:clear` lalu cache ulang.

### 3. Build Frontend Untuk Hosting

Di lokal (atau server yang punya Node.js), jalankan:

```bash
cd frontend
cp .env.production.example .env.production
npm.cmd install
npm.cmd run build:hosting
```

Script `build:hosting` akan menghasilkan file SPA langsung ke `backend/public`.

Nilai API production ada di file:

- `frontend/.env.production` -> `VITE_API_BASE_URL=https://banksoal.appsdraft.com/api`

### 4. Upload Hasil Build

- Upload seluruh folder backend ke hosting (termasuk hasil build frontend di `backend/public`).
- Pastikan file berikut ada di server:
	- `backend/public/index.php` (entry Laravel)
	- `backend/public/index.html` (entry SPA React)
	- `backend/public/assets/*` (asset hasil build frontend)

### 5. Verifikasi Setelah Live

- Buka `https://banksoal.appsdraft.com` -> halaman login tampil.
- Cek login berhasil dan request ke `/api/login` tidak error.
- Refresh di halaman internal SPA (misalnya `/subjects`) tidak 404.
- Tes upload gambar soal dan pastikan file tersimpan dengan benar.

### 6. Troubleshooting Cepat

- Jika API error CORS/401, cek `VITE_API_BASE_URL` harus tepat ke domain HTTPS yang sama.
- Jika route SPA 404 saat refresh, pastikan document root benar di `backend/public` dan file `backend/routes/web.php` sudah memakai fallback SPA.
- Jika perubahan frontend tidak terlihat, bersihkan cache browser dan upload ulang `backend/public/assets`.

### 7. Contoh `.htaccess` Hardening (Apache/cPanel)

Gunakan sebagai referensi tambahan di `backend/public/.htaccess` (sesuaikan dengan konfigurasi hosting):

```apache
<IfModule mod_rewrite.c>
	<IfModule mod_negotiation.c>
		Options -MultiViews -Indexes
	</IfModule>

	RewriteEngine On

	# Block access to hidden files except .well-known (SSL validation)
	RewriteRule "(^|/)\." - [F]
	RewriteRule "^\.well-known/" - [L]

	# Preserve Authorization header
	RewriteCond %{HTTP:Authorization} .
	RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

	# Preserve X-XSRF-Token header
	RewriteCond %{HTTP:x-xsrf-token} .
	RewriteRule .* - [E=HTTP_X_XSRF_TOKEN:%{HTTP:X-XSRF-Token}]

	# Remove trailing slash if not a directory
	RewriteCond %{REQUEST_FILENAME} !-d
	RewriteCond %{REQUEST_URI} (.+)/$
	RewriteRule ^ %1 [L,R=301]

	# Send all non-file requests to Laravel front controller
	RewriteCond %{REQUEST_FILENAME} !-d
	RewriteCond %{REQUEST_FILENAME} !-f
	RewriteRule ^ index.php [L]
</IfModule>

<IfModule mod_headers.c>
	Header always set X-Content-Type-Options "nosniff"
	Header always set X-Frame-Options "SAMEORIGIN"
	Header always set Referrer-Policy "strict-origin-when-cross-origin"
	Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>

# Prevent exposing env and lock files
<FilesMatch "^(\.env|composer\.(json|lock)|package\.(json|lock)|vite\.config\.js|artisan)$">
	Require all denied
</FilesMatch>
```

Catatan penting:

- Backup file `.htaccess` lama sebelum mengganti.
- Jika hosting tidak mengizinkan beberapa directive (`Header`, `Options`, `FilesMatch`), hapus bagian yang ditolak lalu uji ulang.

## Struktur Database

Lihat detail struktur tabel dan relasi di `docs/database-schema.md`.

## Komponen Frontend: Dropdown Searchable

Proyek ini menyediakan dua komponen dropdown yang dapat diketik untuk mencari.

### SearchableSelect

Untuk data statis atau data yang sudah dimuat seluruhnya dari API.
Menampilkan maksimal 10 item (default, dapat dikonfigurasi via prop `limit`).
Mendukung navigasi keyboard penuh (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).

**Props:**

| Prop | Type | Default | Keterangan |
|---|---|---|---|
| `value` | `string` | — | Nilai terpilih saat ini |
| `onChange` | `(value) => void` | — | Dipanggil saat pilihan berubah |
| `options` | `Array<{value, label, selectedLabel?, searchText?}>` | — | Daftar pilihan. `label` boleh string atau ReactNode |
| `placeholder` | `string` | `'Pilih opsi'` | Teks ketika belum ada yang dipilih |
| `searchPlaceholder` | `string` | `'Ketik untuk mencari...'` | Placeholder input pencarian |
| `noOptionsText` | `string` | `'Data tidak ditemukan.'` | Teks ketika hasil pencarian kosong |
| `disabled` | `boolean` | `false` | Nonaktifkan dropdown |
| `required` | `boolean` | `false` | Validasi native form |
| `limit` | `number` | `10` | Jumlah item maksimal yang ditampilkan |
| `className` | `string` | `''` | CSS class tambahan |

**Contoh penggunaan:**

```jsx
import SearchableSelect from '../components/SearchableSelect';

<SearchableSelect
	value={form.chapter_id}
	onChange={(value) => setForm((c) => ({ ...c, chapter_id: value }))}
	options={flatChapters.map((c) => ({ value: String(c.id), label: c.name }))}
	placeholder="Pilih bab"
	searchPlaceholder="Cari bab/sub bab..."
	required
/>

// Contoh penggunaan label kustom + search text (dipakai pada dropdown icon menu)
<SearchableSelect
	value={form.icon}
	onChange={(value) => setForm((c) => ({ ...c, icon: value }))}
	options={iconOptions.map((name) => ({
		value: name,
		searchText: name,
		selectedLabel: name,
		label: <span><IconComponent /> {name}</span>,
	}))}
	placeholder="Pilih icon"
	searchPlaceholder="Cari icon..."
/>
```

Catatan:

- Sumber daftar icon menu berasal dari `react-icons/fi` (frontend), bukan dari response API `menus`.

---

### AsyncSearchableSelect

Untuk data yang besar/banyak dan perlu diambil dari server secara on-demand.
Mendukung debounce 300 ms, race condition protection, loading state, dan navigasi keyboard penuh.

**Props:**

| Prop | Type | Default | Keterangan |
|---|---|---|---|
| `value` | `string` | — | Nilai terpilih saat ini |
| `onChange` | `(value) => void` | — | Dipanggil saat pilihan berubah |
| `loadOptions` | `async (term: string) => Array<{value, label}>` | — | Fungsi async yang memanggil API. Dipanggil saat dropdown terbuka dan setiap kali teks pencarian berubah |
| `displayLabel` | `string` | `''` | Label teks untuk nilai saat ini, digunakan sebelum `loadOptions` selesai (penting saat edit form yang sudah pre-filled) |
| `placeholder` | `string` | `'Pilih opsi'` | Teks ketika belum ada yang dipilih |
| `searchPlaceholder` | `string` | `'Ketik untuk mencari...'` | Placeholder input pencarian |
| `noOptionsText` | `string` | `'Data tidak ditemukan.'` | Teks ketika hasil pencarian kosong |
| `disabled` | `boolean` | `false` | Nonaktifkan dropdown |
| `required` | `boolean` | `false` | Validasi native form |
| `className` | `string` | `''` | CSS class tambahan |

**Contoh penggunaan:**

```jsx
import AsyncSearchableSelect from '../components/AsyncSearchableSelect';

// Contoh: dropdown bab/sub bab yang datanya diambil dari server
<AsyncSearchableSelect
	value={form.chapter_id}
	displayLabel={form.chapter_name ?? ''}
	onChange={(value) => setForm((c) => ({ ...c, chapter_id: value }))}
	loadOptions={async (term) => {
		const res = await client.get('/chapters', {
			params: { search: term, per_page: 10 },
		});
		return res.data.data.map((c) => ({ value: String(c.id), label: c.name }));
	}}
	placeholder="Pilih bab"
	searchPlaceholder="Cari bab/sub bab..."
	required
/>
```

**Penting:** fungsi `loadOptions` harus stabil reference-nya (bungkus dengan `useCallback` atau definisikan diluar komponen) agar tidak menyebabkan refetch berulang.

```jsx
// Cara yang benar: stabil dengan useCallback
const loadChapters = useCallback(async (term) => {
	const res = await client.get('/chapters', { params: { search: term, per_page: 10 } });
	return res.data.data.map((c) => ({ value: String(c.id), label: c.name }));
}, [client]);

<AsyncSearchableSelect value={form.chapter_id} loadOptions={loadChapters} ... />
```

## Changelog Dokumentasi

- 2026-04-17: Menambahkan dokumentasi modul menu (endpoint, struktur data, dan aturan visibilitas).
- 2026-04-17: Menyesuaikan dokumentasi dropdown icon menu agar sumber icon berasal dari `react-icons/fi` di frontend.
- 2026-04-17: Mengoreksi format import soal: `difficulty_level` dan `points` bersifat opsional dengan default.
- 2026-04-17: Menambahkan mode import Word DOCX (template resmi, preview validasi, dan ekstraksi gambar per blok soal).