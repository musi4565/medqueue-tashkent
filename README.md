# MedQueue Tashkent

Bemor klinikaga kelishdan oldin onlayn navbat oladi, navbatini real vaqtda kuzatadi va tahlil natijalarini bitta joyda ko'radi.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Socket.IO client (`/web`)
- **Backend:** Node.js + Express + TypeScript + Prisma + SQLite + JWT + Socket.IO (`/backend`)

## Ishga tushirish (local)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run seed
npm run dev   # http://localhost:4000
```

### Frontend

```bash
cd web
cp .env.example .env
npm install
npm run dev   # http://localhost:5173
```

Frontend ochilganda avtomatik demo bemor (`demo@medqueue.uz`) sifatida kiradi — alohida login qilish shart emas.

## Asosiy funksiyalar

- **Onlayn navbat** — klinika → shifokor → sana/vaqt, 3 bosqichda navbat olish
- **Smart Queue** — "Mening navbatim" sahifasida real vaqtda (Socket.IO) navbat kamayib boradi
- **Bildirishnoma** — navbat yaqinlashganda / kelganda va tahlil tayyor bo'lganda avtomatik bildirishnoma
- **Tahlillar** — jarayondagi va tayyor tahlil natijalari

## Demo ma'lumotlar

Seed skripti (`backend/prisma/seed.ts`) 3 klinika, 6 shifokor, 11 bemor (jumladan demo hisob), faol navbatlar, tahlil natijalari va bildirishnomalarni avtomatik yaratadi.

## Deploy

- Backend: Render Web Service (`/backend`, SQLite fayl bazasi bilan)
- Frontend: Render Static Site (`/web`, `VITE_API_URL` orqali backend'ga ulanadi)

> **Eslatma:** Demo/hackathon uchun SQLite ishlatilgan — Render'ning bepul rejasida disk vaqtinchalik bo'lgani uchun har qayta deploy/restart'da baza qayta seed qilinadi.
