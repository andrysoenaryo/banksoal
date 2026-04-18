# Changelog

Semua perubahan penting pada proyek ini dicatat di dokumen ini.

## [1.3.0] - 2026-04-18

### Added

- Endpoint editor rule paket:
  - `GET /api/question-packages/{id}/rule-questions`
  - `POST /api/question-packages/{id}/rules`
  - `PUT /api/question-packages/{id}/items`
- Opsi export PDF/Word dengan parameter `include_answer_key`.
- Dialog pilihan export (dengan/ tanpa kunci jawaban) di frontend.
- Loading state untuk datatable dan loading preview paket soal.
- Fitur tambah rule langsung dari halaman preview hasil generate.
- Accordion show/hide per rule pada editor paket soal.
- Compact mode untuk daftar soal per rule.

### Changed

- Halaman preview paket soal menjadi pusat edit rule (replace/add/remove soal tanpa pindah halaman).
- Styling header rule diperbarui dengan palet warna lembut agar nyaman di mata.
- Area Tambah Rule diselaraskan dengan visual style header rule.
- Pilihan chapter pada tambah rule difilter:
  - hanya chapter dalam subject paket yang sama
  - hanya chapter yang belum dipilih sebagai rule.

### Fixed

- Perbaikan query backend tambah rule untuk menghindari SQL ambiguous order (`order by id` saat join).
- Perbaikan data option chapter di frontend agar list bab muncul benar pada tambah rule.

### Notes

- Tidak ada perubahan migrasi/skema tabel pada versi ini.
- Perubahan memanfaatkan tabel existing: `question_packages`, `question_package_rules`, `question_package_items`.
