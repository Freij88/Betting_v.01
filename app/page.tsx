import { getPremierLeagueOdds } from '@/src/lib/api';

export default async function Home() {
  const odds = await getPremierLeagueOdds();

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-8">Value Betting Dashboard</h1>

      {!odds || odds.length === 0 ? (
        <p className="text-red-400">Ingen data kunde hämtas. Kontrollera API-nyckeln.</p>
      ) : (
        <div className="w-full max-w-5xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="p-4">Hemmalag</th>
                <th className="p-4">Bortalag</th>
                <th className="p-4">Starttid</th>
                <th className="p-4">Bookmakers (Antal)</th>
              </tr>
            </thead>
            <tbody>
              {odds.map((match) => (
                <tr key={match.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="p-4">{match.home_team}</td>
                  <td className="p-4">{match.away_team}</td>
                  <td className="p-4">{new Date(match.commence_time).toLocaleString('sv-SE')}</td>
                  <td className="p-4">{match.bookmakers?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
