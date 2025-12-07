import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./dev.db',
        },
    },
});

async function main() {
    const team = 'AIK';
    const stats = await prisma.teamStats.findFirst({
        where: { teamName: team }
    });

    console.log('Stats for AIK:', stats);

    const matches = await prisma.historicalMatch.findMany({
        where: {
            OR: [
                { homeTeam: team },
                { awayTeam: team }
            ]
        },
        take: 5,
        orderBy: { date: 'desc' }
    });

    console.log('Last 5 matches for AIK:', matches);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
