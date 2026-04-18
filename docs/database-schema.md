# Database Schema (MySQL)

Dokumen changelog versi tersedia di `../CHANGELOG.md`.

## Ringkasan Tabel

### 1. users

- `id` BIGINT PK
- `name` VARCHAR
- `email` VARCHAR UNIQUE
- `password` VARCHAR
- `is_active` BOOLEAN
- `email_verified_at` TIMESTAMP NULL
- `remember_token` VARCHAR NULL
- `created_at`, `updated_at`

### 2. personal_access_tokens (Sanctum)

- `id` BIGINT PK
- `tokenable_type`, `tokenable_id`
- `name`
- `token` UNIQUE
- `abilities` TEXT NULL
- `last_used_at` TIMESTAMP NULL
- `expires_at` TIMESTAMP NULL
- `created_at`, `updated_at`

### 3. roles / permissions / model_has_roles / model_has_permissions / role_has_permissions (Spatie)

- Tabel standar package untuk RBAC.

### 4. menus

- `id` BIGINT PK
- `key` VARCHAR UNIQUE
- `parent_id` BIGINT FK -> `menus.id` NULL
- `label` VARCHAR
- `icon` VARCHAR NULL
- `permission` VARCHAR NULL
- `sort_order` INT UNSIGNED
- `is_active` BOOLEAN
- `created_at`, `updated_at`

Catatan:

- Relasi `parent_id` dipakai untuk hierarchy menu parent/child.
- `permission` berisi nama permission Spatie (`permissions.name`) untuk kontrol visibilitas menu.
- Daftar icon dipilih dari module `react-icons/fi` di frontend.

### 5. subjects

- `id` BIGINT PK
- `name` VARCHAR
- `description` TEXT NULL
- `sort_order` INT UNSIGNED
- `is_active` BOOLEAN
- `created_by` BIGINT FK -> `users.id` NULL
- `created_at`, `updated_at`

### 6. chapters

- `id` BIGINT PK
- `parent_id` BIGINT FK -> `chapters.id` NULL
- `subject_id` BIGINT FK -> `subjects.id` NULL
- `name` VARCHAR
- `description` TEXT NULL
- `sort_order` INT UNSIGNED
- `is_active` BOOLEAN
- `created_by` BIGINT FK -> `users.id` NULL
- `created_at`, `updated_at`

Catatan:

- Jika `parent_id` NULL, data adalah bab utama.
- Jika `parent_id` terisi, data adalah sub bab.
- Bab/sub bab wajib terhubung ke subject di level aplikasi (validasi API).

### 7. questions

- `id` BIGINT PK
- `chapter_id` BIGINT FK -> `chapters.id`
- `created_by` BIGINT FK -> `users.id`
- `type` ENUM('multiple_choice', 'essay')
- `question_text` LONGTEXT
- `question_image_path` VARCHAR NULL
- `answer_key` LONGTEXT
- `explanation` LONGTEXT NULL
- `points` SMALLINT UNSIGNED
- `difficulty_level` ENUM('mudah', 'sedang', 'sulit')
- `metadata` JSON NULL
- `created_at`, `updated_at`

### 8. question_options

- `id` BIGINT PK
- `question_id` BIGINT FK -> `questions.id`
- `option_key` VARCHAR(5)
- `option_text` LONGTEXT
- `is_correct` BOOLEAN
- `sort_order` INT UNSIGNED
- `created_at`, `updated_at`

Catatan:

- Digunakan khusus untuk soal `multiple_choice`.
- Soal `essay` tidak membutuhkan baris opsi.

### 9. question_packages

- `id` BIGINT PK
- `title` VARCHAR
- `description` TEXT NULL
- `total_questions` INT UNSIGNED
- `generated_by` BIGINT FK -> `users.id`
- `generated_at` TIMESTAMP
- `created_at`, `updated_at`

### 10. question_package_rules

- `id` BIGINT PK
- `question_package_id` BIGINT FK -> `question_packages.id`
- `chapter_id` BIGINT FK -> `chapters.id`
- `composition_type` ENUM('percentage', 'quantity')
- `composition_value` INT UNSIGNED
- `generated_question_count` INT UNSIGNED
- `created_at`, `updated_at`

### 11. question_package_items

- `id` BIGINT PK
- `question_package_id` BIGINT FK -> `question_packages.id`
- `question_id` BIGINT FK -> `questions.id`
- `position` INT UNSIGNED
- `created_at`, `updated_at`
- UNIQUE (`question_package_id`, `question_id`)

## Relasi Inti

- `users` 1..n `subjects` (`subjects.created_by`)
- `menus` 1..n `menus` (self relation parent/child via `menus.parent_id`)
- `subjects` 1..n `chapters`
- `users` 1..n `questions` (`questions.created_by`)
- `chapters` 1..n `questions`
- `chapters` 1..n `chapters` (self relation parent/sub bab)
- `questions` 1..n `question_options`
- `users` 1..n `question_packages`
- `question_packages` 1..n `question_package_rules`
- `question_packages` 1..n `question_package_items`
- `questions` 1..n `question_package_items`

## Aturan Visibilitas Data

- User non-super-admin hanya dapat melihat/mengelola subject, bab/sub bab, soal, dan paket soal miliknya sendiri.
- Role `super-admin` dapat melihat/mengelola seluruh data user lain untuk modul subject, bab/sub bab, soal, dan paket soal.
- Menu navigasi disaring berdasarkan `menus.is_active` dan permission user login. Jika child menu terlihat, parent menu otomatis ikut ditampilkan.

## Tabel Infrastruktur Laravel

- `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs` (queue/cache bawaan Laravel)
- `migrations` (riwayat migrasi)

## Alur Generator Paket

- User menentukan `total_questions`.
- User membuat beberapa rule berdasarkan bab/sub bab (yang berada di bawah subject tertentu).
- Rule bisa mode persentase atau jumlah tetap.
- Sistem mengambil soal acak sesuai rule, lalu menyimpan hasil ke:
  - `question_packages`
  - `question_package_rules`
  - `question_package_items`

## Format Import Soal (Excel / DOCX)

Kolom minimal yang didukung endpoint import:

- `chapter_id` atau `chapter_name`
- `type` (`multiple_choice` atau `essay`)
- `question_text`
- `answer_key`

Untuk mode DOCX, format field yang didukung per blok `[SOAL] ... [/SOAL]`:

- `chapter_id` atau `chapter_name`
- `type`
- `question_text`
- `answer_key`
- `explanation` (opsional)
- `difficulty_level` (opsional)
- `points` (opsional)
- `option_a` sampai `option_e` (untuk `multiple_choice`)
- `correct_option_key` (untuk `multiple_choice`)

Catatan DOCX:

- Gambar soal dapat disisipkan di dalam blok soal dan akan disimpan sebagai `question_image_path`.

Kolom opsional:

- `explanation`
- `difficulty_level` (`mudah`, `sedang`, `sulit`)
- `points`

Khusus `multiple_choice`:

- `option_a` ... `option_e`
- `correct_option_key` (A/B/C/D/E)

## Endpoint Export Paket

- `GET /api/question-packages/{id}/export/excel`
- `GET /api/question-packages/{id}/export/pdf`
- `GET /api/question-packages/{id}/export/word`

Catatan export terbaru:

- Endpoint PDF/Word mendukung query parameter `include_answer_key` (`1` atau `0`).
- Jika `include_answer_key=1`, hasil export menampilkan kunci jawaban.
- Jika `include_answer_key=0` (default), hasil export tetap seperti sebelumnya.

## Endpoint Editor Rule Paket (Terbaru)

- `GET /api/question-packages/{id}/rule-questions`
- `POST /api/question-packages/{id}/rules`
- `PUT /api/question-packages/{id}/items`

Catatan endpoint editor:

- `POST /rules` menambahkan rule baru ke paket berdasarkan `chapter_id`.
- Chapter yang dipilih harus dalam subject yang sama dengan rule paket yang sudah ada.
- `PUT /items` menyimpan daftar soal final per rule sekaligus menyelaraskan `total_questions`.

## Status Perubahan Terakhir (18 April 2026)

- UI preview paket menjadi pusat edit per-rule (replace/add/remove soal tanpa pindah halaman).
- Ditambahkan dukungan tambah rule langsung dari halaman preview paket.
- Ditambahkan loading state untuk tabel data dan proses buka preview paket.
- Ditambahkan opsi export PDF/Word dengan/ tanpa kunci jawaban.
- Dilakukan perbaikan query backend tambah rule untuk menghindari SQL ambiguous order by.

Catatan skema database:

- Tidak ada perubahan struktur tabel baru pada update ini.
- Seluruh perubahan menggunakan tabel existing (`question_package_rules`, `question_package_items`, `question_packages`).