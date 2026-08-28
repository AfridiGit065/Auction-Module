# DPL 2026 Live Football Player Auction — Next.js 14 + Supabase + Vercel

Production-ready live auction platform built with **Next.js 14 (App Router)**, **Supabase PostgreSQL**, **Supabase Storage**, **Supabase Realtime**, and styled with **Vanilla CSS**.

---

## 🚀 Setup Instructions

### 1. Create a Supabase Project
1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon / public key`
   - `service_role key` (keep secret!)

### 2. Database & Realtime Setup
1. In Supabase Dashboard, go to **SQL Editor**.
2. Run the script in `supabase/migrations/001_initial.sql`.
3. Run the script in `supabase/migrations/002_seed.sql` to populate initial teams and players.

### 3. Storage Bucket Setup
1. In Supabase Dashboard, go to **Storage → Buckets**.
2. Create a new bucket named **`dpl_images`**.
3. Set the bucket privacy to **Public**.

### 4. Local Development
1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Fill in your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000).

---

## ☁️ Deployment to Vercel

1. Push this project repository to **GitHub / GitLab / Bitbucket**.
2. Go to [vercel.com](https://vercel.com) and click **Add New → Project**.
3. Import your repository.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**.

---

## 🛡️ Security & Architecture

- **PostgreSQL Database**: Stores all settings, teams, players, bids, state, and history.
- **Supabase Storage**: Stores all uploaded player photos, team logos, and league crest images.
- **Supabase Realtime**: Broadcasts instant updates to all connected browser screens.
- **Server-Side Validation**: All bids and budget rules (Reserved Base Price) are enforced inside Next.js API Routes using `service_role` key.
