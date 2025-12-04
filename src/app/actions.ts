'use server';

import { getOdds } from '@/src/lib/api';

export async function fetchOddsAction(sportKey: string) {
    return await getOdds(sportKey);
}

import { model } from '@/src/lib/gemini';

export async function analyzeMatchWithGemini(matchData: any, odds: any) {
    const prompt = `Du är en professionell sportsbetting-analytiker. Här är datan för en match:
   Match: ${JSON.stringify(matchData)}
   Odds: ${JSON.stringify(odds)}
   
   Uppgift:
   1. Identifiera om det finns värde i oddsen (jämför Back vs Lay om det finns).
   2. Ge en kortfattad rekommendation (Max 3 meningar).
   3. Avsluta med en 'Confidence Score' (1-10).`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini analysis failed:", error);
        return "Kunde inte analysera matchen just nu. Kontrollera API-nyckeln.";
    }
}

import { loadMatches, getHeadToHead, getTeamForm } from '@/src/lib/historical-data';

export async function analyzeMatchHistory(home: string, away: string, league: string) {
    const matches = await loadMatches(league);

    if (matches.length === 0) return null;

    const h2h = getHeadToHead(home, away, matches);
    const homeForm = getTeamForm(home, matches);
    const awayForm = getTeamForm(away, matches);

    return {
        h2h,
        homeForm,
        awayForm
    };
}
