import { OddsResponse, Sport } from '@/src/types/odds';

const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

export async function getActiveSports(): Promise<Sport[]> {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) return [];

    try {
        const response = await fetch(`${BASE_URL}/?all=false&apiKey=${apiKey}`, { cache: 'force-cache' }); // Cache sports list for a while
        if (!response.ok) throw new Error("Failed to fetch sports");

        const data: Sport[] = await response.json();

        // Sort by group
        return data.sort((a, b) => a.group.localeCompare(b.group));
    } catch (error) {
        console.error("Error fetching sports:", error);
        return [];
    }
}

export async function getOdds(sportKey: string): Promise<OddsResponse[]> {
    const apiKey = process.env.ODDS_API_KEY;
    console.log('API Key Status:', apiKey ? 'OK' : 'MISSING');

    if (!apiKey) {
        console.error("ODDS_API_KEY is not defined.");
        // Debug: Log available env vars (keys only) to see if we are in the right environment
        console.log('Available Env Vars:', Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('_')));
        return [];
    }

    try {
        const url = `${BASE_URL}/${sportKey}/odds/?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${apiKey}`;
        const response = await fetch(url, { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`Failed to fetch odds for ${sportKey}: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            // Sometimes API returns { message: ... } on error
            console.error("API response is not an array:", data);
            return [];
        }

        return data as OddsResponse[];
    } catch (error) {
        console.error(`Error fetching odds for ${sportKey}:`, error);
        return [];
    }
}

// Backwards compatibility if needed, or just remove
export async function getPremierLeagueOdds(): Promise<OddsResponse[]> {
    return getOdds('soccer_epl');
}
