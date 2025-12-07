'use server';

import { getOdds } from '@/src/lib/api';

export async function fetchOddsAction(sportKey: string) {
    return await getOdds(sportKey);
}

import { model } from '@/src/lib/gemini';

import { prisma } from '@/src/lib/db';

export async function analyzeMatchWithGemini(matchData: any, odds: any, history: any = null) {
    // 1. Check Cache
    try {
        const matchDate = new Date(matchData.commence_time);
        const existingMatch = await prisma.match.findFirst({
            where: {
                homeTeam: matchData.home_team,
                awayTeam: matchData.away_team,
                // Check for matches within 24h window to be safe
                commenceTime: {
                    gte: new Date(matchDate.getTime() - 24 * 60 * 60 * 1000),
                    lte: new Date(matchDate.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });

        if (existingMatch?.analysis && existingMatch.analysisCreatedAt) {
            const cacheAge = new Date().getTime() - new Date(existingMatch.analysisCreatedAt).getTime();
            // Return cached analysis if less than 24 hours old
            if (cacheAge < 24 * 60 * 60 * 1000) {
                console.log("Returning cached analysis for", matchData.home_team);
                return existingMatch.analysis;
            }
        }
    } catch (e) {
        console.warn("Cache check failed", e);
    }

    const prompt = `Du är en professionell sportsbetting-analytiker. Här är datan för en match:
   Match: ${JSON.stringify(matchData)}
   Odds: ${JSON.stringify(odds)}
   Historisk Data (CSV): ${history ? JSON.stringify(history) : "Ingen historisk data tillgänglig."}
   
   Uppgift:
   1. ANVÄND DIN SÖKFÖRMÅGA (Google Search) för att hitta:
      - Resultat för ${matchData.home_team} och ${matchData.away_team} de senaste 14 dagarna.
      - Skadeläget i trupperna JUST NU.
      - Bekräftade startelvor (om matchen är inom 1h) eller förväntade elvor.
   
   2. Jämför den historiska datan (CSV) med den färska informationen du hittar online. Ser du några avvikelser? (T.ex. Historiskt starka hemma, men förlorade igår).
   
   3. Identifiera om det finns värde i oddsen (jämför Back vs Lay om det finns).
   
   4. Strukturera svaret så här:
      - **Analys:** Kortfattad rekommendation (Max 3 meningar).
      - **⚠️ Senaste nytt (från webben):** Lista skador/nyheter du hittat.
      - **Confidence Score:** (1-10).`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 2. Save to Cache
        try {
            // Find or create match to attach analysis
            // We use a loose match on teams/date since we might not have the exact ID
            const matchDate = new Date(matchData.commence_time);

            // Upsert logic is tricky without unique ID, so we try findFirst then update or create
            const existingMatch = await prisma.match.findFirst({
                where: {
                    homeTeam: matchData.home_team,
                    awayTeam: matchData.away_team,
                    commenceTime: matchDate
                }
            });

            if (existingMatch) {
                await prisma.match.update({
                    where: { id: existingMatch.id },
                    data: {
                        analysis: text,
                        analysisCreatedAt: new Date()
                    }
                });
            } else {
                // If match doesn't exist in our DB yet (e.g. from feed), create it
                await prisma.match.create({
                    data: {
                        externalId: matchData.id || `gen-${Date.now()}`, // Fallback ID
                        sportKey: matchData.sport_key,
                        sportTitle: matchData.sport_title,
                        commenceTime: matchDate,
                        homeTeam: matchData.home_team,
                        awayTeam: matchData.away_team,
                        analysis: text,
                        analysisCreatedAt: new Date()
                    }
                });
            }
        } catch (cacheError) {
            console.error("Failed to cache analysis:", cacheError);
        }

        return text;
    } catch (error) {
        console.error("Gemini analysis failed:", error);
        return "Kunde inte analysera matchen just nu. Kontrollera API-nyckeln.";
    }
}

import { getHeadToHeadStats, getTeamFormStats } from '@/src/lib/stats-engine';

export async function analyzeMatchHistory(home: string, away: string, league: string) {
    // We don't need to loadMatches anymore, we query the DB directly.
    // Note: 'league' parameter might be needed if we want to filter by sport in the future,
    // but currently getHeadToHeadStats searches all matches between teams.

    const h2h = await getHeadToHeadStats(home, away);
    const homeForm = await getTeamFormStats(home);
    const awayForm = await getTeamFormStats(away);

    return {
        h2h,
        homeForm,
        awayForm
    };
}
