import fs from 'fs';
import path from 'path';

const API_KEY = 'e45a2c9912ee150c4ec3eff69c065537bc999a44';
const BASE_URL = 'https://api.soccerdataapi.com';

interface TeamMap {
    [key: string]: number;
}

const TEAM_IDS_PATH = path.join(process.cwd(), 'src', 'data', 'team-ids.json');

export async function fetchSoccerData(endpoint: string, params: Record<string, string | number> = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('auth_token', API_KEY);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
    });

    try {
        const response = await fetch(url.toString(), {
            headers: {
                'Accept-Encoding': 'gzip'
            }
        });

        if (response.status === 429) {
            console.error('SoccerDataAPI Throttled (429). Daily limit reached?');
            return null;
        }

        if (!response.ok) {
            console.error(`SoccerDataAPI Error: ${response.status} ${response.statusText}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('SoccerDataAPI Request Failed:', error);
        return null;
    }
}

export async function fetchAndSaveTeamIds(leagueId: number) {
    console.log(`Fetching standings for league ${leagueId}...`);
    const data = await fetchSoccerData('/standing', { league_id: leagueId });

    if (!data || !data.standings) {
        console.error('Failed to fetch standings or invalid format');
        return;
    }

    let teamMap: TeamMap = {};

    // Load existing map if exists
    if (fs.existsSync(TEAM_IDS_PATH)) {
        try {
            teamMap = JSON.parse(fs.readFileSync(TEAM_IDS_PATH, 'utf-8'));
        } catch (e) {
            console.warn('Could not parse existing team-ids.json, starting fresh.');
        }
    }

    // Extract IDs
    // Assuming structure based on typical API responses (needs verification if doc unavailable)
    // Usually: { standings: [ { team_id: 123, team_name: "Arsenal", ... } ] }
    for (const team of data.standings) {
        if (team.team_id && team.team_name) {
            teamMap[team.team_name.toLowerCase()] = team.team_id;
        }
    }

    // Save
    fs.writeFileSync(TEAM_IDS_PATH, JSON.stringify(teamMap, null, 2));
    console.log(`Saved ${Object.keys(teamMap).length} teams to ${TEAM_IDS_PATH}`);
}

function findTeamId(teamName: string, teamMap: TeamMap): number | null {
    const normalized = teamName.toLowerCase();

    // Direct match
    if (teamMap[normalized]) return teamMap[normalized];

    // Fuzzy / Partial match (Simple implementation)
    // 1. Check if map key is contained in teamName or vice versa
    for (const [name, id] of Object.entries(teamMap)) {
        if (normalized.includes(name) || name.includes(normalized)) {
            return id;
        }
    }

    // 2. Handle common variations (FC, United, etc) - can be expanded
    const cleanName = normalized.replace(/ fc| afc| ff| united| city/g, '').trim();
    for (const [name, id] of Object.entries(teamMap)) {
        const cleanMapName = name.replace(/ fc| afc| ff| united| city/g, '').trim();
        if (cleanName === cleanMapName) return id;
    }

    return null;
}

export async function getMatchAnalysisData(homeTeam: string, awayTeam: string) {
    if (!fs.existsSync(TEAM_IDS_PATH)) {
        console.warn('team-ids.json not found. Run fetchAndSaveTeamIds first.');
        return null;
    }

    const teamMap: TeamMap = JSON.parse(fs.readFileSync(TEAM_IDS_PATH, 'utf-8'));

    const homeId = findTeamId(homeTeam, teamMap);
    const awayId = findTeamId(awayTeam, teamMap);

    if (!homeId || !awayId) {
        console.warn(`Could not find IDs for ${homeTeam} (${homeId}) or ${awayTeam} (${awayId})`);
        return null;
    }

    console.log(`Fetching H2H for ${homeTeam} (${homeId}) vs ${awayTeam} (${awayId})`);
    const data = await fetchSoccerData('/head-to-head', {
        team_1_id: homeId,
        team_2_id: awayId
    });

    return data;
}
