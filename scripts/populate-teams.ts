import { fetchAndSaveTeamIds } from '../src/lib/soccer-api';

async function main() {
    // 228 is often Premier League in many APIs, but user example said "t.ex. 228 för PL".
    // I will use 228 as requested.
    await fetchAndSaveTeamIds(228);

    // Add other leagues if known, e.g. Allsvenskan
    // await fetchAndSaveTeamIds(XXX);
}

main().catch(console.error);
