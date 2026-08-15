# MedQueue Tashkent

Bemor klinikaga kelishdan oldin onlayn navbat oladi, navbatini real vaqtda kuzatadi va tahlil natijalarini bitta joyda ko'radi.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Socket.IO client (`/web`)
- **Backend:** Node.js + Express + TypeScript + Prisma + SQLite + JWT + Socket.IO (`/backend`)
- **Telegram bot:** Telegraf, running inside the same backend process (`/backend/src/telegram`) — same Express API, same Prisma database, same notification events as the website. No separate service, no separate database.

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

- **Onlayn navbat** — klinika → shifokor → sana/vaqt, 3 bosqichda navbat olish (website va bot ikkalasida ham)
- **Smart Queue** — "Mening navbatim" sahifasida real vaqtda (Socket.IO) navbat kamayib boradi; botda "🔄 Yangilash" bilan
- **Bildirishnoma** — navbat olindi/yaqinlashdi/keldi/bekor qilindi va tahlil tayyor bo'lganda avtomatik bildirishnoma (website notification center + Telegram, bitta backend eventidan)
- **Tahlillar** — jarayondagi va tayyor tahlil natijalari
- **Telegram bot** (@MedquequeTashbot) — website bilan bitta backend/bitta bazani ishlatadi: kimdir botda navbat olsa, saytda ko'rinadi va aksincha

### Telegram botni hisobga bog'lash
Profil sahifasida "Bog'lash kodini olish" tugmasini bosing, chiqqan kodni bot ichida `/link 123456` shaklida yuboring (yoki "Botni ochish" tugmasi orqali avtomatik bog'lanadi). Bog'langandan so'ng bot va sayt bir xil bemor ma'lumotini ko'rsatadi.

## Demo ma'lumotlar

Seed skripti (`backend/prisma/seed.ts`) 3 klinika, 6 shifokor, 11 bemor (jumladan demo hisob), faol navbatlar, tahlil natijalari va bildirishnomalarni avtomatik yaratadi.

## Deploy

- Backend: Render Web Service (`/backend`, SQLite fayl bazasi bilan)
- Frontend: Render Static Site (`/web`, `VITE_API_URL` orqali backend'ga ulanadi)

> **Eslatma:** Demo/hackathon uchun SQLite ishlatilgan — Render'ning bepul rejasida disk vaqtinchalik bo'lgani uchun har qayta deploy/restart'da baza qayta seed qilinadi.
