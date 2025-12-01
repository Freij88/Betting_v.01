import { getOdds, getActiveSports } from '@/src/lib/api';
import DashboardClient from '@/src/components/DashboardClient';

export default async function Home() {
  // Fetch initial data on the server
  const [initialOdds, sports] = await Promise.all([
    getOdds('soccer_epl'),
    getActiveSports()
  ]);

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100">
      <DashboardClient initialOdds={initialOdds} sports={sports} />
    </main>
  );
}
