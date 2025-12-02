import { OddsResponse, Bookmaker, Outcome } from '@/src/types/odds';
import { SHARP_BOOKMAKERS } from './constants';

export interface MarketOdds {
    home: number;
    draw: number;
    away: number;
    bookie: string;
}

export interface FairOdds {
    home: number;
    draw: number;
    away: number;
    trueProbHome: number;
    trueProbDraw: number;
    trueProbAway: number;
}

export interface BestOddsResult {
    bestHome: number;
    homeBookie: string;
    bestDraw: number;
    drawBookie: string;
    bestAway: number;
    awayBookie: string;
    marketOdds?: MarketOdds | null;
    pinnacleOdds?: MarketOdds | null;
    layOdds?: MarketOdds | null;
    fairOdds?: FairOdds | null;
    valueEdgeHome: number;
    valueEdgeDraw: number;
    valueEdgeAway: number;
    isLayEdge: boolean;
}

export interface ArbitrageResult {
    isArb: boolean;
    margin: number;
    impliedProb: number;
}

export function calculateFairOdds(odds: MarketOdds): FairOdds {
    const impliedHome = 1 / odds.home;
    const impliedDraw = 1 / odds.draw;
    const impliedAway = 1 / odds.away;

    const totalImpliedProb = impliedHome + impliedDraw + impliedAway;

    const trueProbHome = impliedHome / totalImpliedProb;
    const trueProbDraw = impliedDraw / totalImpliedProb;
    const trueProbAway = impliedAway / totalImpliedProb;

    return {
        home: 1 / trueProbHome,
        draw: 1 / trueProbDraw,
        away: 1 / trueProbAway,
        trueProbHome,
        trueProbDraw,
        trueProbAway
    };
}

export function findBestOdds(match: OddsResponse, allowedBookmakers?: string[]): BestOddsResult {
    let bestHome = 0;
    let homeBookie = '-';
    let bestDraw = 0;
    let drawBookie = '-';
    let bestAway = 0;
    let awayBookie = '-';

    // Explicitly typed as requested to avoid "never" inference issues
    let marketOdds: MarketOdds | null = null;
    let pinnacleOdds: MarketOdds | null = null;
    let betfairOdds: MarketOdds | null = null;
    let layOdds: MarketOdds | null = null;

    // 1. Find Market Odds (Sharp) & Lay Odds
    // Priority: Betfair Exchange > Pinnacle
    for (const bookie of match.bookmakers) {
        if (SHARP_BOOKMAKERS.includes(bookie.key)) {
            // Check for Back Odds (h2h)
            let home = 0, draw = 0, away = 0;
            for (const market of bookie.markets) {
                if (market.key === 'h2h') {
                    for (const outcome of market.outcomes) {
                        if (outcome.name === match.home_team) home = outcome.price;
                        else if (outcome.name === match.away_team) away = outcome.price;
                        else if (outcome.name === 'Draw') draw = outcome.price;
                    }
                }
                // Check for Lay Odds (h2h_lay) - Only relevant for Exchanges like Betfair
                if (market.key === 'h2h_lay') {
                    let lHome = 0, lDraw = 0, lAway = 0;
                    for (const outcome of market.outcomes) {
                        if (outcome.name === match.home_team) lHome = outcome.price;
                        else if (outcome.name === match.away_team) lAway = outcome.price;
                        else if (outcome.name === 'Draw') lDraw = outcome.price;
                    }
                    if (lHome > 0 && lDraw > 0 && lAway > 0) {
                        layOdds = { home: lHome, draw: lDraw, away: lAway, bookie: bookie.title };
                    }
                }
            }

            if (home > 0 && draw > 0 && away > 0) {
                const oddsObj = { home, draw, away, bookie: bookie.title };

                if (bookie.key === 'pinnacle') {
                    pinnacleOdds = oddsObj;
                } else if (bookie.key === 'betfair_ex_eu') {
                    betfairOdds = oddsObj;
                }
            }
        }
    }

    // Set Market Odds based on priority: Betfair > Pinnacle
    if (betfairOdds) {
        marketOdds = betfairOdds;
    } else if (pinnacleOdds) {
        marketOdds = pinnacleOdds;
    }

    // 2. Calculate Fair Odds (No-Vig)
    const fairOdds = marketOdds ? calculateFairOdds(marketOdds) : null;

    // 3. Find Best Playable Odds
    for (const bookie of match.bookmakers) {
        // Check if this bookmaker is allowed for "Best Odds" calculation
        if (allowedBookmakers && !allowedBookmakers.includes(bookie.key)) {
            continue; // Skip this bookie for best odds if not in allowed list
        }

        // Find Best Odds (Global max among allowed bookies)
        for (const market of bookie.markets) {
            if (market.key === 'h2h') {
                for (const outcome of market.outcomes) {
                    if (outcome.name === match.home_team) {
                        if (outcome.price > bestHome) {
                            bestHome = outcome.price;
                            homeBookie = bookie.title;
                        }
                    } else if (outcome.name === match.away_team) {
                        if (outcome.price > bestAway) {
                            bestAway = outcome.price;
                            awayBookie = bookie.title;
                        }
                    } else if (outcome.name === 'Draw') {
                        if (outcome.price > bestDraw) {
                            bestDraw = outcome.price;
                            drawBookie = bookie.title;
                        }
                    }
                }
            }
        }
    }

    // 4. Calculate Value Edge
    // Priority 1: Lay Odds (Direct Edge) -> Edge = (BestOdds / LayOdds) - 1
    // Priority 2: Fair Odds (No-Vig) -> Edge = (BestOdds / FairOdds) - 1

    let valueEdgeHome = 0;
    let valueEdgeDraw = 0;
    let valueEdgeAway = 0;
    let isLayEdge = false;

    if (layOdds) {
        valueEdgeHome = bestHome > 0 ? ((bestHome / layOdds.home) - 1) * 100 : 0;
        valueEdgeDraw = bestDraw > 0 ? ((bestDraw / layOdds.draw) - 1) * 100 : 0;
        valueEdgeAway = bestAway > 0 ? ((bestAway / layOdds.away) - 1) * 100 : 0;
        isLayEdge = true;
    } else if (fairOdds) {
        valueEdgeHome = bestHome > 0 ? ((bestHome / fairOdds.home) - 1) * 100 : 0;
        valueEdgeDraw = bestDraw > 0 ? ((bestDraw / fairOdds.draw) - 1) * 100 : 0;
        valueEdgeAway = bestAway > 0 ? ((bestAway / fairOdds.away) - 1) * 100 : 0;
    }

    return {
        bestHome,
        homeBookie,
        bestDraw,
        drawBookie,
        bestAway,
        awayBookie,
        marketOdds,
        pinnacleOdds,
        layOdds,
        fairOdds,
        valueEdgeHome,
        valueEdgeDraw,
        valueEdgeAway,
        isLayEdge
    };
}

export function calculateArbitrage(bestHome: number, bestDraw: number, bestAway: number): ArbitrageResult {
    if (bestHome === 0 || bestDraw === 0 || bestAway === 0) {
        return { isArb: false, margin: 0, impliedProb: 0 };
    }

    const impliedProb = (1 / bestHome) + (1 / bestDraw) + (1 / bestAway);
    const isArb = impliedProb < 1.0;
    const margin = (1 - impliedProb) * 100;

    return { isArb, margin, impliedProb };
}
