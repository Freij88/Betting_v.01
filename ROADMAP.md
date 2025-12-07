# 🚀 Betting_v.01 -> World Class Platform Roadmap

Detta dokument beskriver resan från en enkel odds-listare till en marknadsledande plattform inspirerad av **OddsJam**, **RebelBetting**, **PropsData.io** och **Statshub**.

## 🏆 Målbild
En "All-in-One" plattform för sportbetting som kombinerar **Matematiskt Värde (+EV)** med **Statistiska Trender**.

---

## 🧩 Gap Analysis (Nuläge vs. Konkurrenter)

### 1. Core Betting (OddsJam / RebelBetting)
| Funktion | Nuläge (Betting_v.01) | Konkurrent (OddsJam/Rebel) | Gap / Åtgärd |
| :--- | :--- | :--- | :--- |
| **EV Feed** | Manuell sökning per match. | Live-feed med *alla* +EV spel. | **Bygg "The Scanner":** Ett bakgrundsjobb som hämtar odds kontinuerligt och sparar möjligheter i DB. |
| **Marknader** | Huvudsakligen 1X2 (H2H). | Player Props, Totals, Spreads. | **Utöka API-anrop:** Hämta fler marknader från The Odds API (t.ex. `player_props`). |
| **Bet Tracker** | Ingen. | Automatisk tracking, CLV, P/L. | **Databas:** Implementera Postgres + Prisma för att spara användarens spel. |
| **Kalkylator** | Enkel Kelly i Modal. | Avancerade (Arbitrage, Free Bet). | **Utveckla:** Dedikerad "Tools"-sida med fler kalkylatorer. |

### 2. Stats & Trends (PropsData.io / Statshub)
| Funktion | Nuläge (Betting_v.01) | Konkurrent (PropsData/Statshub) | Gap / Åtgärd |
| :--- | :--- | :--- | :--- |
| **Data Källa** | CSV-filer (E0.csv, SWE.csv). | Omfattande databas med historik. | **Ingestion Engine:** Skript som parsar CSV:er till en strukturerad Databas (SQL). |
| **Hit Rates** | Enkel H2H/Form (W-D-L). | "Haaland Över 2.5 Skott: 8/10". | **Query Engine:** Koppla odds till historisk data för att räkna ut % hit rate automatiskt. |
| **Visualisering**| Textbaserad historik. | Grafer, Heatmaps, Trendlinjer. | **UI Upgrade:** Använd grafer (t.ex. Recharts) för att visa formkurvor. |

---

## 🗺️ Roadmap

### Fas 1: Fundamentet & Databas (v.0.2)
*Mål: Gå från "Statisk Sida" till "Dynamisk Applikation".*

- [ ] **Infrastruktur:** Installera **PostgreSQL** (via Supabase eller Neon) och **Prisma ORM**.
- [ ] **Datamodellering:** Skapa schema för `Match`, `Odds`, `Bet`, `TeamStats`.
- [ ] **User Auth:** Implementera inloggning (Clerk eller NextAuth) för att spara personliga inställningar/spel.
- [ ] **Bet Tracker (MVP):** En enkel sida där man kan logga sina spel manuellt och se P/L (Profit/Loss).

### Fas 2: "The Scanner" & EV Feed (v.0.3)
*Mål: Automatisera letandet efter värde (OddsJam-style).*

- [ ] **Background Jobs:** Sätt upp ett cron-job (t.ex. Vercel Cron eller separat worker) som hämtar odds varje kvart.
- [ ] **EV Engine:** Flytta EV-logiken från frontend (`utils.ts`) till backend. Spara alla hittade +EV-spel i databasen.
- [ ] **Live Feed UI:** En ny sida `/feed` som visar en lista på alla aktuella värdespel, filtrerbara på Sport, Bookie, och EV%.

### Fas 3: Stats Engine & "Hit Rates" (v.0.4)
*Mål: Integrera historisk data för att validera spel (PropsData-style).*

- [ ] **CSV Ingestion:** Bygg ett admin-skript som läser in `E0.csv`, `SWE.csv` m.fl. till databasen.
- [ ] **Stats Mapping:** Koppla lagnamn i Odds API till lagnamn i CSV-filerna (Fuzzy matching kan behövas).
- [ ] **Trend-Logik:** Skapa API-endpoints som svarar på frågor som "Hur ofta har Lag A gått Över 2.5 mål de senaste 10 matcherna?".
- [ ] **Match Detalj-vy:** När man klickar på en match, visa "Stats Card" med dessa trender bredvid oddsen.

### Fas 4: World Class UI & Polish (v.1.0)
*Mål: Premium-känsla och användarupplevelse.*

- [ ] **Dark Mode 2.0:** Förfina färgpaletten (Emerald/Slate) för en proffsigare look.
- [ ] **Dashboard:** En startsida som visar "Dagens Bästa Spel" och "Min Utveckling" (graf).
- [ ] **Mobilanpassning:** Se till att "Feed" och "Tracker" fungerar perfekt i mobilen.

---

## 🛠️ Tech Stack Förslag
*   **Frontend:** Next.js 15+ (App Router), Tailwind CSS, Framer Motion (för animationer).
*   **Backend:** Next.js Server Actions / Route Handlers.
*   **Databas:** PostgreSQL (Supabase/Neon).
*   **ORM:** Prisma.
*   **Auth:** Clerk (enklast) eller NextAuth.
*   **Data:** The Odds API (Odds), CSV/Scraping (Stats).
