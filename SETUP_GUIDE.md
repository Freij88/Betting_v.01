# 🚀 Betting Platform Setup Guide

Welcome! This guide will help you set up your own AI-powered Value Betting Platform.

## 1. Prerequisites

You need accounts for the following services (all have free tiers):

1.  **Clerk:** For user authentication. [Sign up here](https://clerk.com).
2.  **Vercel/Neon/Supabase:** For the PostgreSQL database. [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) is easiest if deploying to Vercel.
3.  **The Odds API:** For live odds. [Get Key](https://the-odds-api.com/).
4.  **Google Gemini:** For AI analysis. [Get Key](https://aistudio.google.com/app/apikey).
5.  **SoccerDataAPI:** For historical stats. [Get Key](https://soccerdataapi.com/).

## 2. Environment Variables

Create a file named `.env` in the root folder and add these keys:

```env
# Database (PostgreSQL Connection String)
DATABASE_URL="postgresql://..."

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# APIs
ODDS_API_KEY="your_odds_api_key"
GOOGLE_API_KEY="your_gemini_key"
SOCCER_DATA_API_KEY="your_soccer_data_key"
```

## 3. Local Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Setup Database:**
    ```bash
    npx prisma db push
    ```

3.  **Ingest Historical Data (Optional):**
    If you have a CSV file (e.g., `SWE.csv`), run:
    ```bash
    node scripts/ingest-csv.mjs
    ```

4.  **Populate Team IDs:**
    To fetch fresh team IDs for the API:
    ```bash
    npx ts-node scripts/populate-teams.ts
    ```

5.  **Run the App:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

## 4. Deployment (Vercel)

1.  Push your code to GitHub.
2.  Import the project in Vercel.
3.  Add all the Environment Variables from step 2 in the Vercel Dashboard.
4.  Deploy!

## 5. Advanced: Deep Stats

To enable deep analysis (Shots, Corners, Cards), ensure your historical CSV files contain the standard columns: `HS` (Home Shots), `AS` (Away Shots), `HC` (Home Corners), `AC` (Away Corners), etc. The ingestion script automatically detects and saves these.
