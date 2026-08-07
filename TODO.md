# TODO — UI Monitoring Backend (Opsi C)

## Backend (Express)
- [x] `backend/src/routes/admin.js` — Route API agregat monitoring seluruh user + verifikasi admin
- [x] `backend/src/app.js` — Daftarkan route `/api/admin`
- [x] Hari ini: hapus monitoring backend terpisah (`monitorRoutes`, `/monitor`, `/api/monitor`, `src/routes/monitor.js`) — karena sudah ada halaman admin di frontend (`/admin`), monitoring backend tidak lagi diperlukan

## Fitur Data Pengguna / "Lihat Password" (Opsi alternatif — aman)
- [x] Backend `admin.js` — Endpoint `/api/admin/monitor` mengembalikan statistik global + daftar akun pengguna (`users.list`, `users.registered`, `users.txCountByUser`)
- [x] Data tiap akun: email, nama profil, tanggal daftar, login terakhir, jumlah transaksi, status aktif/diblokir
- [x] Password **tidak** ditampilkan (hanya hash bcrypt di Supabase Auth — tidak mungkin dibaca)
- [x] Frontend `adminclient.js` — Tabel "AKUN PENGGUNA TERDAFTAR" di halaman `/admin`

## Frontend (Next.js)
- [x] `frontend/src/services/index.js` — Tambah `adminService`
- [x] `frontend/src/client/adminclient.js` — UI admin monitoring (stat cards, charts recharts)
- [x] `frontend/src/app/admin/page.js` — Halaman `/admin` + metadata
- [x] `frontend/src/components/Navbars.js` — Link ADMIN (tampil, konten admin-only)

## Konfigurasi
- [x] `ADMIN_EMAILS=ammarsetiawan970@gmail.com` dan `MONITOR_PASSWORD=setiawan 05` — default sudah di-hardcode di kode (bisa di-override lewat `.env`)

## Uji
- [x] Syntax check backend lulus (node --check) setelah monitor dihapus
- [ ] Jalankan backend + frontend → buka `/admin` (semua monitoring lewat dashboard admin frontend)

