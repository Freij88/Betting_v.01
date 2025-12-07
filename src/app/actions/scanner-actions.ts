'use server';

import { getOdds } from '@/src/lib/api';
import { findBestOdds } from '@/src/lib/utils';
import { OddsResponse } from '@/src/types/odds';

// Define the sports we want to scan
const SPORTS_TO_SCAN = [
    'soccer_epl',
    'soccer_sweden_allsvenskan',
    'soccer_uefa_champs_league',
    'soccer_spain_la_liga',
    'soccer_italy_serie_a',
    'soccer_germany_bundesliga'
];

export interface ValueBetOpportunity {
    id: string;
    sport: string;
    match: string;
    commenceTime: string;
    selection: string; // 'Home', 'Draw', 'Away'
    bookmaker: string;
    odds: number;
    edge: number;
    isLayEdge: boolean;
    sharpBookie: string; // 'Pinnacle' or 'Betfair'
    sharpOdds: number;
}

export async function scanForValueBets(): Promise<ValueBetOpportunity[]> {
    const opportunities: ValueBetOpportunity[] = [];

    // Fetch odds for all sports in parallel
    const promises = SPORTS_TO_SCAN.map(sport => getOdds(sport).catch(e => {
        console.error(`Failed to fetch odds for ${sport}:`, e);
        return [];
    }));

    const results = await Promise.all(promises);

    // Process each sport's results
    results.forEach((matches: OddsResponse[]) => {
        matches.forEach(match => {
            // Use existing logic to find best odds and calculate EV
            const analysis = findBestOdds(match);

            // Check Home
            if (analysis.valueEdgeHome > 1.5) { // Minimum 1.5% edge
                opportunities.push({
                    id: `${match.id}-home`,
                    sport: match.sport_title,
                    match: `${match.home_team} vs ${match.away_team}`,
                    commenceTime: match.commence_time,
                    selection: match.home_team,
                    bookmaker: analysis.homeBookie,
                    odds: analysis.bestHome,
                    edge: analysis.valueEdgeHome,
                    isLayEdge: analysis.isLayEdge,
                    sharpBookie: analysis.layOdds ? 'Betfair Exchange' : 'Pinnacle',
                    sharpOdds: analysis.layOdds ? analysis.layOdds.home : (analysis.pinnacleOdds?.home || 0)
                });
            }

            // Check Draw
            if (analysis.valueEdgeDraw > 1.5) {
                opportunities.push({
                    id: `${match.id}-draw`,
                    sport: match.sport_title,
                    match: `${match.home_team} vs ${match.away_team}`,
                    commenceTime: match.commence_time,
                    selection: 'Draw',
                    bookmaker: analysis.drawBookie,
                    odds: analysis.bestDraw,
                    edge: analysis.valueEdgeDraw,
                    isLayEdge: analysis.isLayEdge,
                    sharpBookie: analysis.layOdds ? 'Betfair Exchange' : 'Pinnacle',
                    sharpOdds: analysis.layOdds ? analysis.layOdds.draw : (analysis.pinnacleOdds?.draw || 0)
                });
            }

            // Check Away
            if (analysis.valueEdgeAway > 1.5) {
                opportunities.push({
                    id: `${match.id}-away`,
                    sport: match.sport_title,
                    match: `${match.home_team} vs ${match.away_team}`,
                    commenceTime: match.commence_time,
                    selection: match.away_team,
                    bookmaker: analysis.awayBookie,
                    odds: analysis.bestAway,
                    edge: analysis.valueEdgeAway,
                    isLayEdge: analysis.isLayEdge,
                    sharpBookie: analysis.layOdds ? 'Betfair Exchange' : 'Pinnacle',
                    sharpOdds: analysis.layOdds ? analysis.layOdds.away : (analysis.pinnacleOdds?.away || 0)
                });
            }
        });
    });

    // Sort by Edge (highest first)
    return opportunities.sort((a, b) => b.edge - a.edge);
}
