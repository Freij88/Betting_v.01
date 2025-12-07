'use server';

import { prisma } from '@/src/lib/db';
import { revalidatePath } from 'next/cache';

import { auth, currentUser } from "@clerk/nextjs/server";

export async function createBet(data: {
    matchId?: string;
    selection: string;
    odds: number;
    stake: number;
    bookmaker: string;
    sport: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    notes?: string;
}) {
    try {
        // ... inside createBet ...
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        // Find or create user in our DB
        let user = await prisma.user.findUnique({
            where: { externalId: userId },
        });

        if (!user) {
            const clerkUser = await currentUser();
            const email = clerkUser?.emailAddresses[0]?.emailAddress || `user-${userId}@example.com`;

            user = await prisma.user.create({
                data: {
                    externalId: userId,
                    email: email,
                },
            });
        }

        // Ensure match exists or create a placeholder
        // For MVP, we might just store the match details directly in the bet or create a match record on the fly
        // Let's create a match record if it doesn't exist based on externalId (if we had one)
        // For now, we'll just create a match record every time or find one. 
        // To keep it simple for the MVP and since we don't have robust match syncing yet:
        // We will create a new Match record for this bet if we can't find one easily.
        // Ideally we should use a composite key or external ID.

        // Let's generate a pseudo-unique ID for the match based on teams and date
        const matchExternalId = `${data.homeTeam}-${data.awayTeam}-${data.date}`.replace(/\s+/g, '-').toLowerCase();

        let match = await prisma.match.findUnique({
            where: { externalId: matchExternalId },
        });

        if (!match) {
            match = await prisma.match.create({
                data: {
                    externalId: matchExternalId,
                    sportKey: data.sport,
                    sportTitle: data.sport, // We might want to map this properly later
                    commenceTime: new Date(data.date),
                    homeTeam: data.homeTeam,
                    awayTeam: data.awayTeam,
                },
            });
        }

        const potentialWin = data.stake * data.odds;

        const bet = await prisma.bet.create({
            data: {
                userId: user.id,
                matchId: match.id,
                selection: data.selection,
                odds: data.odds,
                stake: data.stake,
                potentialWin: potentialWin,
                status: 'PENDING',
                notes: data.notes,
            },
        });

        revalidatePath('/tracker');
        return { success: true, bet };
    } catch (error) {
        console.error('Failed to create bet:', error);
        return { success: false, error: 'Failed to create bet' };
    }
}

export async function getBets() {
    try {
        const { userId } = await auth();
        if (!userId) return [];

        const user = await prisma.user.findUnique({
            where: { externalId: userId },
        });

        if (!user) return [];

        const bets = await prisma.bet.findMany({
            where: { userId: user.id },
            include: {
                match: true,
            },
            orderBy: {
                placedAt: 'desc',
            },
        });

        return bets;
    } catch (error) {
        console.error('Failed to get bets:', error);
        return [];
    }
}

export async function updateBetStatus(betId: string, status: 'WON' | 'LOST' | 'VOID') {
    try {
        const bet = await prisma.bet.findUnique({ where: { id: betId } });
        if (!bet) throw new Error('Bet not found');

        let result = 0;
        if (status === 'WON') {
            result = bet.potentialWin - bet.stake; // Profit
        } else if (status === 'LOST') {
            result = -bet.stake; // Loss
        } else {
            result = 0; // Void
        }

        await prisma.bet.update({
            where: { id: betId },
            data: {
                status,
                result,
                settledAt: new Date(),
            },
        });

        revalidatePath('/tracker');
        return { success: true };
    } catch (error) {
        console.error('Failed to update bet:', error);
        return { success: false, error: 'Failed to update bet' };
    }
}
