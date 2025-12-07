import { scanForValueBets } from '@/src/app/actions/scanner-actions';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
    const opportunities = await scanForValueBets();

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                            Live EV Feed
                        </h1>
                        <p className="text-slate-400 mt-2">Realtids-scanner för värdespel</p>
                    </div>
                    <div className="text-right">
                        <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors">← Tillbaka till Odds</a>
                    </div>
                </header>

                <div className="grid gap-4">
                    {opportunities.map((opp) => (
                        <div key={opp.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-purple-500/50 transition-all group">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                                {/* Match Info */}
                                <div className="flex-1">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-2">
                                        {opp.sport}
                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                        {new Date(opp.commenceTime).toLocaleString()}
                                    </div>
                                    <div className="font-bold text-lg text-white group-hover:text-purple-300 transition-colors">
                                        {opp.match}
                                    </div>
                                    <div className="text-sm text-slate-400 mt-1">
                                        Val: <span className="text-white font-bold">{opp.selection}</span>
                                    </div>
                                </div>

                                {/* Odds & Edge */}
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Bookie</div>
                                        <div className="font-mono text-white">{opp.bookmaker}</div>
                                        <div className="text-2xl font-bold text-emerald-400">{opp.odds.toFixed(2)}</div>
                                    </div>

                                    <div className="h-10 w-px bg-slate-800 hidden md:block"></div>

                                    <div className="text-right hidden md:block">
                                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Sharp ({opp.sharpBookie})</div>
                                        <div className="font-mono text-slate-400">{opp.sharpOdds.toFixed(2)}</div>
                                    </div>

                                    <div className="h-10 w-px bg-slate-800 hidden md:block"></div>

                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Edge</div>
                                        <div className="text-2xl font-black text-purple-400">+{opp.edge.toFixed(2)}%</div>
                                    </div>

                                    {/* Action Button (Placeholder for now, could link to tracker) */}
                                    <button className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-purple-900/20">
                                        Bet
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {opportunities.length === 0 && (
                        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                            <div className="text-4xl mb-4">🔍</div>
                            <h3 className="text-xl font-bold text-white mb-2">Inga värdespel just nu</h3>
                            <p className="text-slate-400">Scannern hittade inga spel med &gt;1.5% edge. Försök igen om en stund.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
