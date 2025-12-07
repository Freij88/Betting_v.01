import { getBets, updateBetStatus } from '@/src/app/actions/bet-actions';
import { BetStatusToggle } from './bet-status-toggle';

export const dynamic = 'force-dynamic';

export default async function TrackerPage() {
    const bets = await getBets();

    // Calculate Stats
    const totalBets = bets.length;
    const pendingBets = bets.filter(b => b.status === 'PENDING').length;
    const settledBets = bets.filter(b => b.status !== 'PENDING');

    const totalStaked = bets.reduce((sum, b) => sum + b.stake, 0);
    const totalProfit = settledBets.reduce((sum, b) => sum + (b.result || 0), 0);
    const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                            Bet Tracker
                        </h1>
                        <p className="text-slate-400 mt-2">Dina spel och resultat</p>
                    </div>
                    <div className="text-right">
                        <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors">← Tillbaka till Odds</a>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                        <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total P/L</div>
                        <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString()} kr
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                        <div className="text-slate-500 text-xs uppercase font-bold mb-1">ROI</div>
                        <div className={`text-2xl font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {roi.toFixed(2)}%
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                        <div className="text-slate-500 text-xs uppercase font-bold mb-1">Omsättning</div>
                        <div className="text-2xl font-bold text-white">
                            {totalStaked.toLocaleString()} kr
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                        <div className="text-slate-500 text-xs uppercase font-bold mb-1">Antal Spel</div>
                        <div className="text-2xl font-bold text-white">
                            {totalBets} <span className="text-sm text-slate-500 font-normal">({pendingBets} aktiva)</span>
                        </div>
                    </div>
                </div>

                {/* Bets List */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950 text-slate-400 uppercase text-xs font-bold">
                                <tr>
                                    <th className="p-4">Datum</th>
                                    <th className="p-4">Match</th>
                                    <th className="p-4">Val</th>
                                    <th className="p-4 text-right">Odds</th>
                                    <th className="p-4 text-right">Insats</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Resultat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {bets.map((bet) => (
                                    <tr key={bet.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 text-slate-400">
                                            {new Date(bet.placedAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-white">{bet.match.homeTeam} - {bet.match.awayTeam}</div>
                                            <div className="text-xs text-slate-500">{bet.match.sportTitle}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-emerald-300 font-medium">{bet.selection}</span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-slate-300">
                                            {bet.odds.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-right font-mono text-slate-300">
                                            {bet.stake.toLocaleString()} kr
                                        </td>
                                        <td className="p-4 text-center">
                                            <BetStatusToggle betId={bet.id} initialStatus={bet.status} />
                                        </td>
                                        <td className={`p-4 text-right font-bold ${bet.status === 'WON' ? 'text-emerald-400' :
                                                bet.status === 'LOST' ? 'text-red-400' :
                                                    'text-slate-500'
                                            }`}>
                                            {bet.status === 'PENDING' ? '-' :
                                                bet.result && bet.result > 0 ? `+${bet.result}` : bet.result}
                                        </td>
                                    </tr>
                                ))}
                                {bets.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-500">
                                            Inga spel loggade än. Gå till startsidan för att hitta värdespel!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
