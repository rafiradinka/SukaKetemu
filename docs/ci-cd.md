# CI/CD SukaKetemu (ENV-01)

PIC: Radinka. Dokumen ini menjelaskan cara kerja pipeline dan langkah setup satu kali di GitHub dan Vercel.

## 1. Cara kerja pipeline

File: `.github/workflows/ci-cd.yml`

| Event | Yang terjadi |
| :--- | :--- |
| Pull Request ke `dev` / `main` | CI saja (tanpa deploy, tanpa akses secret). Hanya folder yang berubah yang dicek. |
| Push / merge ke `dev` | CI, lalu deploy **preview** ke Vercel. |
| Push / merge ke `main` | CI, lalu deploy **production** ke Vercel (bisa diberi persetujuan manual). |

Langkah CI per folder:

- `backend/`: `npm ci` → `npm audit` (gagal jika ada celah *high* di dependensi produksi) → `typecheck` → `test` (Vitest + Supertest) → `build`.
- `frontend/`: `npm ci` → `npm audit` → `lint` → `build`. Job ini otomatis dilewati selama folder `frontend/` belum ada di branch.
- `ai-service/`: belum ada CI; ditambahkan saat ENV-05.

Pengamanan yang sudah dipasang:

- Semua action di-*pin* ke commit SHA (bukan tag) agar tidak bisa ditukar diam-diam. Dependabot memperbarui SHA tiap minggu lewat PR ke `dev`.
- `GITHUB_TOKEN` hanya `contents: read`; `actions/checkout` tidak menyimpan kredensial (`persist-credentials: false`).
- Secret Vercel hanya dipakai di job deploy pada event `push` ke `dev`/`main`. PR dari fork tidak pernah bisa membaca secret.
- Auto-deploy bawaan Vercel dimatikan (`"git": { "deploymentEnabled": false }` di `vercel.json`) supaya deploy hanya lewat pipeline yang sudah lolos CI.

**Saklar deploy:** job deploy hanya berjalan jika *repository variable* `VERCEL_DEPLOY_ENABLED` bernilai `true`. Selama akun Vercel belum disiapkan, variabel ini tidak perlu dibuat: CI tetap berjalan dan job deploy dilewati, tidak gagal. Setelah langkah 3.1–3.2 selesai, nyalakan lewat **Settings → Secrets and variables → Actions → Variables → New repository variable** dengan nama `VERCEL_DEPLOY_ENABLED` dan nilai `true`.

## 2. Strategi branch

```
feature/xxx  ──PR──▶  dev  ──PR──▶  main
                     (preview)     (production)
```

- Jangan push langsung ke `dev` atau `main`; selalu lewat Pull Request.
- Nama branch: `feat/...`, `fix/...`, `chore/...`, `docs/...`.

## 3. Setup satu kali

### 3.1 Vercel: buat dua project

Frontend dan backend adalah dua project Vercel terpisah.

1. Install CLI: `npm i -g vercel` lalu `vercel login`.
2. Di folder `backend/`, jalankan `vercel link` → buat project baru `sukaketemu-backend`.
3. Di folder `frontend/` (setelah frontend masuk ke `dev`), jalankan `vercel link` → project `sukaketemu-frontend`.
4. Di dashboard tiap project, **Settings → Build and Deployment**:
   - **Framework Preset**: `Express` (backend) / `Vite` (frontend).
   - **Root Directory**: **biarkan kosong**. Pipeline sudah masuk ke folder masing-masing; jika diisi `backend`, Vercel akan mencari `backend/backend` dan gagal.
   - **Node.js Version**: `22.x`. Node 20 sudah tidak bisa dipakai di Vercel sejak 1 Oktober 2026.
5. Ambil ID dari file `.vercel/project.json` yang dibuat `vercel link` (`orgId` dan `projectId`). Folder `.vercel/` sudah ada di `.gitignore`, jangan di-commit.
6. Buat token di **Vercel → Account Settings → Tokens**. Batasi scope ke team/akun yang dipakai dan beri masa berlaku (misalnya sampai 31 Desember 2026).

### 3.2 GitHub: Environments dan Secrets

Di **Settings → Environments**, buat dua environment:

| Environment | Deployment branches | Proteksi |
| :--- | :--- | :--- |
| `preview` | hanya `dev` | - |
| `production` | hanya `main` | *Required reviewers*: Radinka (dan satu anggota lain) |

Isi secret berikut di **kedua** environment:

| Secret | Isi |
| :--- | :--- |
| `VERCEL_TOKEN` | token dari langkah 3.1.6 |
| `VERCEL_ORG_ID` | `orgId` |
| `VERCEL_PROJECT_ID_BACKEND` | `projectId` project backend |
| `VERCEL_PROJECT_ID_FRONTEND` | `projectId` project frontend |

### 3.3 GitHub: Branch protection

Buat branch `dev` dari `main`, lalu di **Settings → Branches** (atau *Rulesets*) untuk `main` dan `dev`:

- Wajib lewat Pull Request, minimal 1 approval.
- Wajib lolos status check: `Backend - audit, typecheck, test, build` dan `Frontend - audit, lint, build`.
- Larang force push dan penghapusan branch.

Aktifkan juga **Settings → Code security**: *Secret scanning* + *Push protection* dan *Dependabot alerts*.

### 3.4 Environment variable aplikasi

Variabel aplikasi (`DATABASE_URL`, `JWT_SECRET`, kredensial R2, dst.) diisi di **Vercel → Project → Settings → Environment Variables**, bukan di GitHub. Pipeline menariknya lewat `vercel pull`. Daftar lengkapnya ada di `backend/.env.example`.

Untuk backend, minimal isi sekarang:

- `CORS_ORIGINS` = URL frontend (preview dan production), dipisah koma.

## 4. Verifikasi

Setelah merge pertama ke `dev`:

```bash
curl https://<url-preview-backend>/api/health
# {"status":"ok","service":"sukaketemu-backend","region":"sin1",...}
```

`region` harus `sin1` (Singapura). URL deploy juga tampil di ringkasan run GitHub Actions.

## 5. Catatan untuk anggota tim

- **Backend (Rozin, ENV-03):** entrypoint Vercel adalah *default export* di `backend/src/app.ts`. Vercel mendeteksinya dari baris `import express`, jadi jangan pindahkan import itu. `tsconfig` memakai `moduleResolution: "Bundler"` karena builder Express Vercel gagal membaca tipe `helmet` dengan `NodeNext`.
- **Frontend (Bayu):** sebelum `frontend/` masuk ke `dev`:
  1. Tambahkan `frontend/vercel.json`:
     ```json
     {
       "$schema": "https://openapi.vercel.sh/vercel.json",
       "git": { "deploymentEnabled": false },
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```
  2. `npm run lint` saat ini gagal 2 error `react-refresh/only-export-components` di `src/components/ui/badge.tsx` dan `button.tsx` (file bawaan shadcn). Tambahkan override di `eslint.config.js` untuk `src/components/ui/**` yang mematikan aturan tersebut.
  3. Pindahkan `shadcn` dari `dependencies` ke `devDependencies` karena ia CLI, bukan pustaka runtime.
