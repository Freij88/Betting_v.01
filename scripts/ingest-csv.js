const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const PapaParse = require('papaparse');

const prisma = new PrismaClient();

async function ingestCSV(filePath, league) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    return new Promise((resolve, reject) => {
        PapaParse.parse(fileContent, {
            header: true,
            complete: async (results) => {
                console.log(`Parsing ${league}... Found ${results.data.length} rows.`);

                try {
                    for (const row of results.data) {
                        if (!row.Date || !row.Home || !row.Away) continue;

                        const homeTeam = row.Home;
                        const awayTeam = row.Away;
                        const homeGoals = parseInt(row.HG, 10);
                        const awayGoals = parseInt(row.AG, 10);
                        const result = row.Res; // 'H', 'D', 'A'

                        // Parse date (DD/MM/YYYY)
                        const [day, month, year] = row.Date.split('/');
                        const date = new Date(`${year}-${month}-${day}`);

                        // Update Home Team Stats
                        await updateTeamStats(homeTeam, league, homeGoals, awayGoals, result === 'H' ? 'W' : result === 'D' ? 'D' : 'L');

                        // Update Away Team Stats
                        await updateTeamStats(awayTeam, league, awayGoals, homeGoals, result === 'A' ? 'W' : result === 'D' ? 'D' : 'L');

                        // Insert Historical Match
                        await prisma.historicalMatch.create({
                            data: {
                                sport: league,
                                league: league,
                                date: date,
                                homeTeam: homeTeam,
                                awayTeam: awayTeam,
                                homeGoals: homeGoals,
                                awayGoals: awayGoals,
                                result: result,
                                pinnacleHome: parseFloat(row.PSCH || row.PSH || row.B365H || '0') || null,
                                pinnacleDraw: parseFloat(row.PSCD || row.PSD || row.B365D || '0') || null,
                                pinnacleAway: parseFloat(row.PSCA || row.PSA || row.B365A || '0') || null
                            }
                        });
                    }
                    console.log(`Finished ingesting ${league}`);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}

async function updateTeamStats(teamName, sport, goalsFor, goalsAgainst, result) {
    const stats = await prisma.teamStats.findUnique({
        where: {
            teamName_sport: {
                teamName,
                sport
            }
        }
    });

    if (stats) {
        const newForm = (stats.form || []);
        newForm.unshift(result); // Add new result to start
        if (newForm.length > 5) newForm.pop(); // Keep last 5

        await prisma.teamStats.update({
            where: { id: stats.id },
            data: {
                matchesPlayed: stats.matchesPlayed + 1,
                wins: stats.wins + (result === 'W' ? 1 : 0),
                draws: stats.draws + (result === 'D' ? 1 : 0),
                losses: stats.losses + (result === 'L' ? 1 : 0),
                goalsFor: stats.goalsFor + goalsFor,
                goalsAgainst: stats.goalsAgainst + goalsAgainst,
                form: newForm
            }
        });
    } else {
        await prisma.teamStats.create({
            data: {
                teamName,
                sport,
                matchesPlayed: 1,
                wins: result === 'W' ? 1 : 0,
                draws: result === 'D' ? 1 : 0,
                losses: result === 'L' ? 1 : 0,
                goalsFor: goalsFor,
                goalsAgainst: goalsAgainst,
                form: [result]
            }
        });
    }
}

async function main() {
    // Ingest Allsvenskan
    await ingestCSV(path.join(process.cwd(), 'SWE.csv'), 'soccer_sweden_allsvenskan');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
