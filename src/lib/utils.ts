import { OddsResponse, Bookmaker, Outcome } from '@/src/types/odds';
import { SHARP_BOOKMAKERS } from './constants';

export interface MarketOdds {
    home: number;
    draw: number;
    away: number;
    bookie: string;
}

export interface BestOddsResult {
    bestHome: number;
    homeBookie: string;
    bestDraw: number;
    drawBookie: string;
    bestAway: number;
    awayBookie: string;
    marketOdds?: MarketOdds | null;
    valueEdgeHome: number;
    valueEdgeDraw: number;
    valueEdgeAway: number;
}

export interface ArbitrageResult {
    isArb: boolean;
    margin: number;
    impliedProb: number;
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

    for (const bookie of match.bookmakers) {
        const isSharp = SHARP_BOOKMAKERS.includes(bookie.key);

        // Extract Market Odds (Prioritize Pinnacle if multiple sharps exist)
        if (isSharp) {
            if (!marketOdds || bookie.key === 'pinnacle') {
                let home = 0, draw = 0, away = 0;
                for (const market of bookie.markets) {
                    if (market.key === 'h2h') {
                        for (const outcome of market.outcomes) {
                            if (outcome.name === match.home_team) home = outcome.price;
                            else if (outcome.name === match.away_team) away = outcome.price;
                            else if (outcome.name === 'Draw') draw = outcome.price;
                        }
                    }
                }
                if (home > 0 && draw > 0 && away > 0) {
                    marketOdds = { home, draw, away, bookie: bookie.title };
                }
            }
        }

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

    // Calculate Value Edge
    const valueEdgeHome = marketOdds && marketOdds.home > 0 ? ((bestHome / marketOdds.home) - 1) * 100 : 0;
    const valueEdgeDraw = marketOdds && marketOdds.draw > 0 ? ((bestDraw / marketOdds.draw) - 1) * 100 : 0;
    const valueEdgeAway = marketOdds && marketOdds.away > 0 ? ((bestAway / marketOdds.away) - 1) * 100 : 0;

    return {
        bestHome,
        homeBookie,
        bestDraw,
        drawBookie,
        bestAway,
        awayBookie,
        marketOdds,
        valueEdgeHome,
        valueEdgeDraw,
        valueEdgeAway
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
