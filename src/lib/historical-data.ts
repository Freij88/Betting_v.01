import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

export interface MatchRecord {
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeGoals: number;
    awayGoals: number;
    result: 'H' | 'D' | 'A';
    pinnacleHome: number | null;
    pinnacleDraw: number | null;
    pinnacleAway: number | null;
}

export interface HeadToHeadStats {
    total: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    homeGoalsAvg: number;
    awayGoalsAvg: number;
    matches: MatchRecord[];
}

export interface TeamForm {
    matches: MatchRecord[];
    formString: string; // e.g. "W-D-L-W-W"
}

// Helper to normalize team names
function normalizeTeamName(name: string): string {
    return name
        .replace(/ FC$/, '')
        .replace(/ FF$/, '')
        .replace(/ IF$/, '')
        .replace(/ IS$/, '')
        .replace(/ BK$/, '')
        .replace(/ BoIS$/, '')
        .replace(/^AFC /, '')
        .replace(/ United$/, ' Utd')
        .replace(/City$/, 'City')
        .trim();
}

export async function loadMatches(leagueCode: string): Promise<MatchRecord[]> {
    let filename = '';
    // Map league codes to filenames
    if (leagueCode === 'soccer_epl') filename = 'E0.csv';
    else if (leagueCode === 'soccer_sweden_allsvenskan') filename = 'SWE.csv';
    else return [];

    const filePath = path.join(process.cwd(), 'public', 'data', filename);

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        return new Promise((resolve) => {
            Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const matches: MatchRecord[] = results.data.map((row: any) => {
                        // Handle different headers
                        const homeTeam = row['HomeTeam'] || row['Home'];
                        const awayTeam = row['AwayTeam'] || row['Away'];
                        const fthg = row['FTHG'] || row['HG'];
                        const ftag = row['FTAG'] || row['AG'];
                        const ftr = row['FTR'] || row['Res'];

                        // Pinnacle Odds (PSH/PSCH)
                        // E0 often uses PSH (Opening) or PSCH (Closing). SWE might use similar.
                        // We prioritize Closing (PSCH) if available, else Opening (PSH), else Bet365 (B365H) as fallback
                        const oddsH = parseFloat(row['PSCH'] || row['PSH'] || row['B365H'] || '0');
                        const oddsD = parseFloat(row['PSCD'] || row['PSD'] || row['B365D'] || '0');
                        const oddsA = parseFloat(row['PSCA'] || row['PSA'] || row['B365A'] || '0');

                        if (!homeTeam || !awayTeam) return null;

                        return {
                            date: row['Date'],
                            homeTeam: normalizeTeamName(homeTeam),
                            awayTeam: normalizeTeamName(awayTeam),
                            homeGoals: parseInt(fthg),
                            awayGoals: parseInt(ftag),
                            result: ftr as 'H' | 'D' | 'A',
                            pinnacleHome: oddsH || null,
                            pinnacleDraw: oddsD || null,
                            pinnacleAway: oddsA || null
                        };
                    }).filter((m): m is MatchRecord => m !== null);

                    resolve(matches);
                }
            });
        });
    } catch (error) {
        console.error(`Error loading historical data for ${leagueCode}:`, error);
        return [];
    }
}

export function getHeadToHead(homeTeam: string, awayTeam: string, allMatches: MatchRecord[]): HeadToHeadStats {
    const normHome = normalizeTeamName(homeTeam);
    const normAway = normalizeTeamName(awayTeam);

    const matches = allMatches.filter(m =>
        (m.homeTeam === normHome && m.awayTeam === normAway) ||
        (m.homeTeam === normAway && m.awayTeam === normHome)
    ).sort((a, b) => {
        // Sort by date descending (assuming DD/MM/YY or similar, might need better parsing if dates vary)
        // For simplicity, we just return them as is, usually CSV is sorted by date.
        // If we need strict sorting, we'd need to parse the date string.
        return 0;
    }).slice(0, 10); // Take last 10 meetings

    const stats: HeadToHeadStats = {
        total: matches.length,
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        homeGoalsAvg: 0,
        awayGoalsAvg: 0,
        matches: matches
    };

    if (matches.length === 0) return stats;

    let totalHomeGoals = 0;
    let totalAwayGoals = 0;

    matches.forEach(m => {
        const isHomeGame = m.homeTeam === normHome;

        if (m.result === 'D') {
            stats.draws++;
        } else if ((isHomeGame && m.result === 'H') || (!isHomeGame && m.result === 'A')) {
            stats.homeWins++;
        } else {
            stats.awayWins++;
        }

        if (isHomeGame) {
            totalHomeGoals += m.homeGoals;
            totalAwayGoals += m.awayGoals;
        } else {
            totalHomeGoals += m.awayGoals;
            totalAwayGoals += m.homeGoals;
        }
    });

    stats.homeGoalsAvg = parseFloat((totalHomeGoals / matches.length).toFixed(2));
    stats.awayGoalsAvg = parseFloat((totalAwayGoals / matches.length).toFixed(2));

    return stats;
}

export function getTeamForm(team: string, allMatches: MatchRecord[], lastN: number = 5): TeamForm {
    const normTeam = normalizeTeamName(team);

    // Filter matches involving the team
    // Note: This assumes allMatches is roughly sorted by date. If not, we need to sort.
    // Usually football-data.co.uk CSVs are chronological.
    // We want the MOST RECENT matches. If the CSV is old->new, we reverse it.
    const teamMatches = allMatches.filter(m =>
        m.homeTeam === normTeam || m.awayTeam === normTeam
    ).reverse().slice(0, lastN);

    const formCodes = teamMatches.map(m => {
        const isHome = m.homeTeam === normTeam;
        if (m.result === 'D') return 'D';
        if (isHome && m.result === 'H') return 'W';
        if (!isHome && m.result === 'A') return 'W';
        return 'L';
    });

    return {
        matches: teamMatches,
        formString: formCodes.join('-')
    };
}
