# Supabase & Local Setup Guide

## Overview

This application is built with **Next.js 15 App Router**, **TypeScript**, **Tailwind CSS**, and **Supabase PostgreSQL**. It operates seamlessly both out-of-the-box (using client-side local fallback state) and connected to a live **Supabase** instance.

## 1. Local Development (Instant Out-of-the-Box)

No environment variable setup is required to run and test locally! The application includes a pre-loaded local state engine with realistic Indonesian food stores (McDonald's, KFC, Kopi Kenangan, Restoran Sederhana) and active test group orders.

Start the dev server:
```bash
npm run dev
```

Visit `http://localhost:3000` to create group orders, share links, order items, and manage payments.

---

## 2. Supabase Database Provisioning

To connect your own production Supabase PostgreSQL project:

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/migrations/20260809000000_init_schema.sql` from this repository.
4. Copy and paste the entire SQL contents into the SQL Editor and click **Run**.
5. Copy your Project URL and Anon API key from **Project Settings > API**.

---

## 3. Environment Variable Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

Once configured, the app will automatically route all store edits, snapshot creation, group sessions, member orders, and payment updates to your live Supabase database.
