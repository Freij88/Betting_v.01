'use server';

import { getOdds } from '@/src/lib/api';

export async function fetchOddsAction(sportKey: string) {
    return await getOdds(sportKey);
}
