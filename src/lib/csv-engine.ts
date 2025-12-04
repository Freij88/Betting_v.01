import Papa from 'papaparse';

export interface HistoricalMatch {
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeGoals: number;
    awayGoals: number;
    result: 'H' | 'D' | 'A';
    oddsHome: number | null;
    oddsDraw: number | null;
    oddsAway: number | null;
}

export interface HeadToHeadStats {
    totalMatches: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    homeGoalsAvg: number;
    awayGoalsAvg: number;
}

export interface OddsPerformance {
    matchesFound: number;
    roi: number;
    winRate: number;
}

// Normalisera lagnamn för att matcha mellan API och CSV
export function normalizeTeamName(name: string): string {
    return name
        .replace(/ FC$/, '')
        .replace(/ FF$/, '')
        .replace(/ IF$/, '')
        .replace(/ IS$/, '')
        .replace(/ BK$/, '')
        .replace(/ BoIS$/, '')
        .replace(/^AFC /, '')
        .replace(/ United$/, ' Utd') // Ex: Man United -> Man Utd
        .replace(/City$/, 'City') // Behåll City
        .trim();
}

export async function loadHistoricalData(league: string): Promise<HistoricalMatch[]> {
    let filename = '';
    if (league === 'soccer_epl') filename = 'E0.csv';
    else if (league === 'soccer_sweden_allsvenskan') filename = 'SWE.csv';
    else return [];

    try {
        const response = await fetch(`/data/${filename}`);
        if (!response.ok) throw new Error('Failed to fetch CSV');
        const csvText = await response.text();

        return new Promise((resolve) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const matches: HistoricalMatch[] = results.data.map((row: any) => {
                        // Identifiera kolumner baserat på filtyp/innehåll
                        const homeTeam = row['HomeTeam'] || row['Home'];
                        const awayTeam = row['AwayTeam'] || row['Away'];
                        const fthg = row['FTHG'] || row['HG'];
                        const ftag = row['FTAG'] || row['AG'];
                        const ftr = row['FTR'] || row['Res'];

                        // Försök hitta odds (prioritera Bet365, sen snitt, sen Pinnacle)
                        const oddsH = parseFloat(row['B365H'] || row['AvgH'] || row['PSH'] || '0');
                        const oddsD = parseFloat(row['B365D'] || row['AvgD'] || row['PSD'] || '0');
                        const oddsA = parseFloat(row['B365A'] || row['AvgA'] || row['PSA'] || '0');

                        if (!homeTeam || !awayTeam) return null;

                        return {
                            date: row['Date'],
                            homeTeam: normalizeTeamName(homeTeam),
                            awayTeam: normalizeTeamName(awayTeam),
                            homeGoals: parseInt(fthg),
                            awayGoals: parseInt(ftag),
                            result: ftr as 'H' | 'D' | 'A',
                            oddsHome: oddsH || null,
                            oddsDraw: oddsD || null,
                            oddsAway: oddsA || null
                        };
                    }).filter((m): m is HistoricalMatch => m !== null);

                    resolve(matches);
                }
            });
        });
    } catch (error) {
        console.error("Error loading historical data:", error);
        return [];
    }
}

export function analyzeHeadToHead(homeTeam: string, awayTeam: string, matches: HistoricalMatch[]): HeadToHeadStats {
    const normHome = normalizeTeamName(homeTeam);
    const normAway = normalizeTeamName(awayTeam);

    const h2h = matches.filter(m =>
        (m.homeTeam === normHome && m.awayTeam === normAway) ||
        (m.homeTeam === normAway && m.awayTeam === normHome)
    );

    const stats: HeadToHeadStats = {
        totalMatches: h2h.length,
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        homeGoalsAvg: 0,
        awayGoalsAvg: 0
    };

    if (h2h.length === 0) return stats;

    let totalHomeGoals = 0;
    let totalAwayGoals = 0;

    h2h.forEach(m => {
        const isHomeGame = m.homeTeam === normHome;

        if (m.result === 'D') {
            stats.draws++;
        } else if ((isHomeGame && m.result === 'H') || (!isHomeGame && m.result === 'A')) {
            stats.homeWins++; // "Home" team in the analysis context won
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

    stats.homeGoalsAvg = parseFloat((totalHomeGoals / h2h.length).toFixed(2));
    stats.awayGoalsAvg = parseFloat((totalAwayGoals / h2h.length).toFixed(2));

    return stats;
}

export function analyzeOddsPerformance(team: string, odds: number, matches: HistoricalMatch[]): OddsPerformance {
    const normTeam = normalizeTeamName(team);
    const range = 0.10; // +/- 0.10

    // Hitta matcher där laget hade liknande odds
    const relevantMatches = matches.filter(m => {
        const isHome = m.homeTeam === normTeam;
        const isAway = m.awayTeam === normTeam;

        if (!isHome && !isAway) return false;

        const historicalOdds = isHome ? m.oddsHome : m.oddsAway;
        if (!historicalOdds) return false;

        return Math.abs(historicalOdds - odds) <= range;
    });

    if (relevantMatches.length === 0) {
        return { matchesFound: 0, roi: 0, winRate: 0 };
    }

    let profit = 0;
    let wins = 0;

    relevantMatches.forEach(m => {
        const isHome = m.homeTeam === normTeam;
        const didWin = (isHome && m.result === 'H') || (!isHome && m.result === 'A');
        const historicalOdds = isHome ? m.oddsHome! : m.oddsAway!;

        if (didWin) {
            wins++;
            profit += (historicalOdds - 1);
        } else {
            profit -= 1;
        }
    });

    return {
        matchesFound: relevantMatches.length,
        roi: parseFloat(((profit / relevantMatches.length) * 100).toFixed(2)),
        winRate: parseFloat(((wins / relevantMatches.length) * 100).toFixed(2))
    };
}
