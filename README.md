# Good Ways

Website client Good Ways dengan desain minimalis modern.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Supabase

## Setup Database

1. Buka Supabase Dashboard di https://supabase.com
2. Pilih project Anda
3. Buka **SQL Editor**
4. Copy dan paste isi file `supabase-setup.sql`
5. Klik **Run** untuk menjalankan script

Script akan membuat:
- Tabel `users` dengan kolom id, username, pin, role
- User admin dengan PIN: **123456**
- Index untuk performance
- Row Level Security policies

## Cara Menjalankan

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev

# Build untuk production
npm run build

# Preview production build
npm run preview
```

## Login

Untuk login, masukkan PIN:
- **Admin**: 123456

## Struktur Project

```
Good Ways/
├── src/
│   ├── lib/
│   │   └── supabase.ts      # Supabase client
│   ├── pages/
│   │   └── Login.tsx        # Halaman login
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Tailwind CSS
├── .env                     # Environment variables
├── index.html               # HTML template
├── tailwind.config.js       # Tailwind config
└── vite.config.ts           # Vite config
```

## Desain

Tema minimalis modern dengan palet warna:
- Hitam (#000000)
- Putih (#FFFFFF)
- Merah (#FF0000) - Aksen

Inspirasi desain: Apple
