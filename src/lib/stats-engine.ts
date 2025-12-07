import { prisma } from '@/src/lib/db';

export interface MatchStats {
    date: Date;
    homeTeam: string;
    awayTeam: string;
    homeGoals: number;
    awayGoals: number;
    result: string;
    league: string;
}

export interface HeadToHeadStats {
    total: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    homeGoalsAvg: number;
    awayGoalsAvg: number;
    matches: any[]; // Using any[] for now to avoid strict typing issues with Prisma return types, or define a specific type
}

export interface TeamForm {
    matches: any[];
    formString: string;
}

export async function getHeadToHeadStats(homeTeam: string, awayTeam: string, limit: number = 10) {
    const matches = await prisma.historicalMatch.findMany({
        where: {
            OR: [
                { homeTeam: homeTeam, awayTeam: awayTeam },
                { homeTeam: awayTeam, awayTeam: homeTeam }
            ]
        },
        orderBy: { date: 'desc' },
        take: limit
    });

    const stats = {
        total: matches.length,
        homeWins: 0,
        draws: 0,
        awayWins: 0, // Wins for the 'awayTeam' parameter, regardless of venue
        homeGoalsAvg: 0,
        awayGoalsAvg: 0,
        matches: matches
    };

    if (matches.length === 0) return stats;

    let totalHomeGoals = 0;
    let totalAwayGoals = 0;

    matches.forEach(m => {
        const isHome = m.homeTeam === homeTeam;

        // Determine winner relative to the requested homeTeam/awayTeam
        if (m.result === 'D') {
            stats.draws++;
        } else if ((isHome && m.result === 'H') || (!isHome && m.result === 'A')) {
            stats.homeWins++;
        } else {
            stats.awayWins++;
        }

        if (isHome) {
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

export async function getTeamFormStats(team: string, limit: number = 5) {
    const matches = await prisma.historicalMatch.findMany({
        where: {
            OR: [
                { homeTeam: team },
                { awayTeam: team }
            ]
        },
        orderBy: { date: 'desc' },
        take: limit
    });

    const formCodes = matches.map(m => {
        const isHome = m.homeTeam === team;
        if (m.result === 'D') return 'D';
        if (isHome && m.result === 'H') return 'W';
        if (!isHome && m.result === 'A') return 'W';
        return 'L';
    });

    return {
        matches,
        formString: formCodes.join('-') // e.g. "W-D-L-W-W"
    };
}

export async function getAggregatedTeamStats(team: string) {
    return await prisma.teamStats.findFirst({
        where: { teamName: team }
    });
}
