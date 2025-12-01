import { OddsResponse } from '@/src/types/odds';

export async function getPremierLeagueOdds(): Promise<OddsResponse[]> {
    const apiKey = process.env.ODDS_API_KEY;

    if (!apiKey) {
        console.error("ODDS_API_KEY is not defined in environment variables.");
        return [];
    }

    try {
        const url = `https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${apiKey}`;
        const response = await fetch(url, { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("API response is not an array");
        }

        return data as OddsResponse[];
    } catch (error) {
        console.error("Error fetching Premier League odds:", error);
        return [];
    }
}
