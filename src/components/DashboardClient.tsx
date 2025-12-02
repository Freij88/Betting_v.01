"use client";

import { useState, useMemo, useEffect } from 'react';
import { OddsResponse, Sport, Bookmaker } from '@/src/types/odds';
import { findBestOdds, calculateArbitrage, BestOddsResult } from '@/src/lib/utils';
import { fetchOddsAction } from '@/src/app/actions';
import { SWEDISH_BOOKMAKERS } from '@/src/lib/constants';
import ValueBetModal from './ValueBetModal';
import BookieSelector from './BookieSelector';

interface DashboardClientProps {
    initialOdds: OddsResponse[];
    sports: Sport[];
    debugStatus?: {
        apiKeyExists: boolean;
        rawMatchCount: number;
    };
}

interface SelectedBet {
    match: OddsResponse;
    selection: 'Home' | 'Draw' | 'Away';
    bestOdds: number;
    bookie: string;
    marketOdds: number;
    edge: number;
}

export default function DashboardClient({ initialOdds, sports, debugStatus }: DashboardClientProps) {
    const [selectedSport, setSelectedSport] = useState<string>('soccer_epl');
    const [odds, setOdds] = useState<OddsResponse[]>(initialOdds);
    const [loading, setLoading] = useState<boolean>(false);

    const [minEdge, setMinEdge] = useState<number>(0);
    const [showOnlyArbs, setShowOnlyArbs] = useState<boolean>(false);
    const [selectedBookies, setSelectedBookies] = useState<string[]>(SWEDISH_BOOKMAKERS);

    const [selectedBet, setSelectedBet] = useState<SelectedBet | null>(null);

    // Fetch odds when selectedSport changes
    useEffect(() => {
        if (selectedSport === 'soccer_epl' && odds === initialOdds) return;

        async function loadOdds() {
            setLoading(true);
            try {
                const newOdds = await fetchOddsAction(selectedSport);
                setOdds(newOdds);
            } catch (error) {
                console.error("Failed to load odds", error);
                setOdds([]);
            } finally {
                setLoading(false);
            }
        }

        loadOdds();
    }, [selectedSport]);

    // Extract all unique bookmakers from the odds data
    const allBookies = useMemo(() => {
        const bookies = new Set<string>();
        odds.forEach(match => {
            match.bookmakers.forEach(bookie => {
                bookies.add(bookie.key);
            });
        });
        return Array.from(bookies).sort();
    }, [odds]);

    const filteredOdds = useMemo(() => {
        return odds.map(match => {
            // Calculate best odds based on current filter
            const best = findBestOdds(match, selectedBookies);
            return { match, best };
        }).filter(({ best }) => {
            // Filter out matches with no valid odds after filtering bookies
            if (best.bestHome === 0 && best.bestDraw === 0 && best.bestAway === 0) return false;

            const arb = calculateArbitrage(best.bestHome, best.bestDraw, best.bestAway);

            if (showOnlyArbs && !arb.isArb) return false;

            const maxEdge = Math.max(best.valueEdgeHome, best.valueEdgeDraw, best.valueEdgeAway);
            if (maxEdge < minEdge) return false;

            return true;
        });
    }, [odds, minEdge, showOnlyArbs, selectedBookies]);

    const handleResetFilters = () => {
        setMinEdge(0);
        setShowOnlyArbs(false);
        setSelectedBookies(SWEDISH_BOOKMAKERS);
    };

    const handleBetClick = (match: OddsResponse, best: BestOddsResult, selection: 'Home' | 'Draw' | 'Away') => {
        let bestOdds = 0;
        let bookie = '';
        let marketOdds = 0;
        let edge = 0;

        if (selection === 'Home') {
            bestOdds = best.bestHome;
            bookie = best.homeBookie;
            marketOdds = best.marketOdds?.home || 0;
            edge = best.valueEdgeHome;
        } else if (selection === 'Draw') {
            bestOdds = best.bestDraw;
            bookie = best.drawBookie;
            marketOdds = best.marketOdds?.draw || 0;
            edge = best.valueEdgeDraw;
        } else {
            bestOdds = best.bestAway;
            bookie = best.awayBookie;
            marketOdds = best.marketOdds?.away || 0;
            edge = best.valueEdgeAway;
        }

        setSelectedBet({
            match,
            selection,
            bestOdds,
            bookie,
            marketOdds,
            edge
        });
    };


    const groupedSports = useMemo(() => {
        const groups: { [key: string]: Sport[] } = {};
        sports.forEach(sport => {
            if (!groups[sport.group]) groups[sport.group] = [];
            groups[sport.group].push(sport);
        });
        return groups;
    }, [sports]);

    return (
        <div className="flex flex-col md:flex-row min-h-screen">
            {/* Sidebar */}
            <aside className="w-full md:w-1/4 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto h-screen sticky top-0 hidden md:block">
                <h2 className="text-xl font-bold text-white mb-6 px-2">Sports</h2>
                <div className="space-y-6">
                    {Object.entries(groupedSports).map(([group, groupSports]) => (
                        <div key={group}>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">{group}</h3>
                            <ul className="space-y-1">
                                {groupSports.map(sport => (
                                    <li key={sport.key}>
                                        <button
                                            onClick={() => setSelectedSport(sport.key)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedSport === sport.key
                                                ? 'bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-900/20'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                }`}
                                        >
                                            {sport.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="w-full md:w-3/4 bg-slate-950 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {/* Header & Filters */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                            {sports.find(s => s.key === selectedSport)?.title || 'Odds'}
                            {loading && <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full"></div>}
                        </h1>

                        {/* Debug Info */}
                        <div className="mb-4 space-y-2">
                            {debugStatus && !debugStatus.apiKeyExists && (
                                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center gap-3">
                                    <span className="text-2xl">🛑</span>
                                    <div>
                                        <p className="font-bold">CRITICAL: .env.local saknas!</p>
                                        <p className="text-sm">Skapa filen i roten av projektet och lägg till din ODDS_API_KEY.</p>
                                    </div>
                                </div>
                            )}

                            {debugStatus && debugStatus.rawMatchCount === 0 && (
                                <div className="bg-yellow-900/30 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg flex items-center gap-3">
                                    <span className="text-2xl">⚠️</span>
                                    <div>
                                        <p className="font-bold">API:et returnerade 0 matcher</p>
                                        <p className="text-sm">Ligan kanske har uppehåll eller så är din API-kvot slut.</p>
                                    </div>
                                </div>
                            )}

                            <div className="text-xs font-mono text-slate-500 bg-slate-900/50 inline-block px-2 py-1 rounded border border-slate-800">
                                Debug: Hittade {odds.length} matcher från API. Visar {filteredOdds.length} efter filter.
                            </div>
                        </div>

                        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col xl:flex-row gap-6 items-center justify-between backdrop-blur-sm">
                            <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto">
                                <div className="flex flex-col gap-2 w-full md:w-48">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                                        Min Edge: <span className="text-emerald-400">{minEdge}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="0.5"
                                        value={minEdge}
                                        onChange={(e) => setMinEdge(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showOnlyArbs}
                                            onChange={(e) => setShowOnlyArbs(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                        <span className="ml-3 text-sm font-medium text-slate-300">Endast Arbitrage</span>
                                    </label>

                                    <div className="flex flex-col gap-2 w-full md:w-auto">
                                        <label className="text-xs text-slate-400 font-medium">Bookmakers</label>
                                        <BookieSelector
                                            allBookies={allBookies}
                                            selectedBookies={selectedBookies}
                                            onChange={setSelectedBookies}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => { setLoading(true); fetchOddsAction(selectedSport).then(setOdds).finally(() => setLoading(false)); }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 border border-slate-700 whitespace-nowrap"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"></div>
                            <p>Hämtar odds...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                                        <th className="p-4 w-1/4">Match & Tid</th>
                                        <th className="p-4 w-1/4 bg-slate-900/50">Market (Facit)</th>
                                        <th className="p-4 w-1/2">Bästa Odds (Vi)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredOdds.map(({ match, best }) => {
                                        const arb = calculateArbitrage(best.bestHome, best.bestDraw, best.bestAway);

                                        return (
                                            <tr key={match.id} className="hover:bg-slate-900/50 transition-colors group">
                                                {/* Column 1: Match Info */}
                                                <td className="p-4 align-top">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-medium text-slate-500">{new Date(match.commence_time).toLocaleString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                        <div className="font-bold text-white text-lg">{match.home_team}</div>
                                                        <div className="text-slate-400 text-sm">vs</div>
                                                        <div className="font-bold text-white text-lg">{match.away_team}</div>
                                                        {arb.isArb && (
                                                            <span className="mt-2 inline-block bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded animate-pulse w-fit">
                                                                ARBITRAGE {arb.margin.toFixed(2)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Column 2: Market Odds (Sharp) */}
                                                <td className="p-4 align-top bg-slate-900/30 border-x border-slate-800">
                                                    <div className="space-y-3">
                                                        <div className="text-xs text-slate-500 font-mono mb-1">{best.marketOdds?.bookie || 'N/A'}</div>
                                                        {['home', 'draw', 'away'].map((outcome, index) => {
                                                            const key = outcome as 'home' | 'draw' | 'away';
                                                            return (
                                                                <div key={outcome} className="flex justify-between items-center">
                                                                    <span className="text-slate-400 text-sm">{index === 0 ? '1' : index === 1 ? 'X' : '2'}</span>
                                                                    <div className="text-right">
                                                                        <div className="text-xs text-slate-400 mb-1">Marknadsvärde</div>
                                                                        {best.marketOdds ? (
                                                                            <div className="flex flex-col items-end gap-1">
                                                                                {best.isLayEdge && best.layOdds ? (
                                                                                    <div className="flex items-center gap-2" title="Baserat på Betfair Lay Odds">
                                                                                        <span className="text-xs font-bold text-pink-400 bg-pink-900/20 px-1.5 py-0.5 rounded border border-pink-900/30">LAY</span>
                                                                                        <span className="text-lg font-bold text-pink-300">{best.layOdds[key].toFixed(2)}</span>
                                                                                    </div>
                                                                                ) : best.fairOdds ? (
                                                                                    <div className="flex items-center gap-2" title="Fair Odds (No-Vig)">
                                                                                        <span className="text-xs font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">FAIR</span>
                                                                                        <span className="text-lg font-bold text-slate-300">{best.fairOdds[key].toFixed(2)}</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-lg font-bold text-slate-500">-</span>
                                                                                )}

                                                                                {/* Always show Pinnacle if available and different from primary display */}
                                                                                {best.pinnacleOdds && (
                                                                                    <div className="text-xs text-slate-500 font-mono">
                                                                                        Pin: {best.pinnacleOdds[key].toFixed(2)}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-slate-600">-</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>

                                                {/* Column 3: Best Odds (Soft) */}
                                                <td className="p-4 align-top">
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {/* Home */}
                                                        <div
                                                            onClick={() => handleBetClick(match, best, 'Home')}
                                                            className={`p-3 rounded border cursor-pointer transition-all hover:scale-105 active:scale-95 ${best.valueEdgeHome > 0 ? 'bg-emerald-900/20 border-emerald-500/50 hover:bg-emerald-900/30' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700'}`}
                                                        >
                                                            <div className="text-xs text-slate-500 mb-1">HEMMA</div>
                                                            <div className="text-xl font-bold text-white">{best.bestHome.toFixed(2)}</div>
                                                            <div className="text-xs text-slate-400 truncate" title={best.homeBookie}>{best.homeBookie}</div>
                                                            {best.valueEdgeHome > 0 && (
                                                                <div className="mt-1 text-xs font-bold text-emerald-400">+{best.valueEdgeHome.toFixed(1)}% Edge</div>
                                                            )}
                                                        </div>

                                                        {/* Draw */}
                                                        <div
                                                            onClick={() => handleBetClick(match, best, 'Draw')}
                                                            className={`p-3 rounded border cursor-pointer transition-all hover:scale-105 active:scale-95 ${best.valueEdgeDraw > 0 ? 'bg-emerald-900/20 border-emerald-500/50 hover:bg-emerald-900/30' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700'}`}
                                                        >
                                                            <div className="text-xs text-slate-500 mb-1">OAVGJORT</div>
                                                            <div className="text-xl font-bold text-white">{best.bestDraw.toFixed(2)}</div>
                                                            <div className="text-xs text-slate-400 truncate" title={best.drawBookie}>{best.drawBookie}</div>
                                                            {best.valueEdgeDraw > 0 && (
                                                                <div className="mt-1 text-xs font-bold text-emerald-400">+{best.valueEdgeDraw.toFixed(1)}% Edge</div>
                                                            )}
                                                        </div>

                                                        {/* Away */}
                                                        <div
                                                            onClick={() => handleBetClick(match, best, 'Away')}
                                                            className={`p-3 rounded border cursor-pointer transition-all hover:scale-105 active:scale-95 ${best.valueEdgeAway > 0 ? 'bg-emerald-900/20 border-emerald-500/50 hover:bg-emerald-900/30' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700'}`}
                                                        >
                                                            <div className="text-xs text-slate-500 mb-1">BORTA</div>
                                                            <div className="text-xl font-bold text-white">{best.bestAway.toFixed(2)}</div>
                                                            <div className="text-xs text-slate-400 truncate" title={best.awayBookie}>{best.awayBookie}</div>
                                                            {best.valueEdgeAway > 0 && (
                                                                <div className="mt-1 text-xs font-bold text-emerald-400">+{best.valueEdgeAway.toFixed(1)}% Edge</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {!loading && filteredOdds.length === 0 && (
                                <div className="text-center py-20 text-slate-500">
                                    <p className="text-xl">Inga matcher matchar dina filter eller så saknas data för denna liga.</p>
                                    <button onClick={handleResetFilters} className="mt-4 text-emerald-400 hover:underline">Återställ filter</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Bet Calculator Modal */}
            {selectedBet && (
                <ValueBetModal
                    match={selectedBet.match}
                    selection={selectedBet.selection}
                    myOdds={selectedBet.bestOdds}
                    sharpOdds={selectedBet.marketOdds}
                    bookie={selectedBet.bookie}
                    onClose={() => setSelectedBet(null)}
                />
            )}
        </div>
    );
}
