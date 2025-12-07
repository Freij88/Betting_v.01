# Production Setup Guide

## 1. Database (PostgreSQL)
This project is configured to use PostgreSQL. You need to provide a connection string.

### Recommended Providers (Free Tier):
- **Vercel Postgres:** Easy integration if deploying to Vercel.
- **Neon:** Serverless Postgres, very fast.
- **Supabase:** Full backend suite with Postgres.

### Configuration:
1. Create a `.env` file in the root directory (if it doesn't exist).
2. Add your database URL:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
   ```

## 2. API Keys
Ensure you have the following keys in your `.env` file:

```env
# Google Gemini (for AI Analysis)
GOOGLE_API_KEY="your_key_here"

# SoccerDataAPI (for H2H Stats)
SOCCER_DATA_API_KEY="e45a2c9912ee150c4ec3eff69c065537bc999a44"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

## 3. Authentication (Clerk)
1. Go to [Clerk.com](https://clerk.com) and create a free account.
2. Create a new application.
3. Copy the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to your `.env` file.

## 4. Deployment (Vercel)
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel`
4. In the Vercel Dashboard, go to **Settings > Environment Variables** and add all keys from your `.env`.

## 5. Database Migration
After setting up the database URL, run:
```bash
npx prisma db push
```
This will create the tables in your new PostgreSQL database.
