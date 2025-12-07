"use client";

import { useState, useEffect } from 'react';
import { OddsResponse } from '@/src/types/odds';
import { analyzeMatchWithGemini, analyzeMatchHistory } from '@/src/app/actions';
import { HeadToHeadStats, TeamForm } from '@/src/lib/stats-engine';

interface ValueBetModalProps {
    match: OddsResponse;
    selection: 'Home' | 'Draw' | 'Away';
    myOdds: number;
    sharpOdds: number;
    bookie: string;
    onClose: () => void;
}

export default function ValueBetModal({ match, selection, myOdds, sharpOdds, bookie, onClose }: ValueBetModalProps) {
    const [bankroll, setBankroll] = useState<number>(5000);
    const [kellyMultiplier, setKellyMultiplier] = useState<number>(0.30);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Historical Data State
    const [history, setHistory] = useState<{ h2h: HeadToHeadStats, homeForm: TeamForm, awayForm: TeamForm } | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const result = await analyzeMatchWithGemini(match, { myOdds, sharpOdds, bookie }, history);
            setAnalysis(result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Load bankroll from localStorage on mount
    useEffect(() => {
        const savedBankroll = localStorage.getItem('bankroll');
        if (savedBankroll) {
            setBankroll(parseFloat(savedBankroll));
        }

        // Load historical data
        async function loadHistory() {
            setLoadingHistory(true);
            try {
                const data = await analyzeMatchHistory(match.home_team, match.away_team, match.sport_key);
                if (data) {
                    setHistory(data);
                }
            } catch (e) {
                console.error("Failed to load history", e);
            } finally {
                setLoadingHistory(false);
            }
        }
        loadHistory();
    }, [match.sport_key, match.home_team, match.away_team]);

    // Save bankroll to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('bankroll', bankroll.toString());
    }, [bankroll]);

    // Calculations
    // 1. Implied Probability (Sharp) - ignoring vig for MVP as requested
    const impliedProb = sharpOdds > 0 ? 1 / sharpOdds : 0;

    // 2. Edge (ROI)
    const edge = impliedProb > 0 ? (impliedProb * myOdds) - 1 : 0;
    const edgePercentage = edge * 100;

    // 3. Kelly Stake
    // Formula: ((p * b) - 1) / (b - 1)
    // where p = probability (impliedProb), b = decimal odds (myOdds)
    // Simplified: edge / (myOdds - 1)
    const kellyFraction = (myOdds - 1) > 0 ? edge / (myOdds - 1) : 0;
    const rawStake = bankroll * kellyFraction * kellyMultiplier;
    const stake = Math.max(0, Math.round(rawStake));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>

                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">Value Calculator</h2>
                    <p className="text-slate-400 text-sm">{match.home_team} vs {match.away_team}</p>
                </div>

                {/* Grid: Your Bet vs Market */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">Ditt Spel ({selection})</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">{myOdds.toFixed(2)}</span>
                            <span className="text-sm text-slate-400 truncate max-w-[100px]" title={bookie}>@{bookie}</span>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">Marknaden (Sharp)</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-300">{sharpOdds > 0 ? sharpOdds.toFixed(2) : '-'}</span>
                            <span className="text-xs text-slate-500">
                                ({impliedProb > 0 ? (impliedProb * 100).toFixed(1) : 0}% win prob)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Inputs */}
                <div className="space-y-5 mb-8">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Min Kassa (Bankroll)</label>
                            <span className="text-xs font-mono text-emerald-400">{bankroll.toLocaleString()} kr</span>
                        </div>
                        <input
                            type="number"
                            value={bankroll}
                            onChange={(e) => setBankroll(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Kelly Multiplier</label>
                            <span className="text-xs font-mono text-emerald-400">{kellyMultiplier.toFixed(2)}x</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={kellyMultiplier}
                            onChange={(e) => setKellyMultiplier(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-600 mt-1 uppercase font-bold tracking-wider">
                            <span>Safe (0.1)</span>
                            <span>Aggressive (1.0)</span>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className={`rounded-xl p-6 text-center border ${edge > 0 ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/10 border-red-500/20'}`}>
                    {edge > 0 ? (
                        <>
                            <div className="text-sm font-bold text-emerald-400 mb-1 tracking-wider uppercase">Din Edge (ROI)</div>
                            <div className="text-4xl font-black text-emerald-400 mb-6">+{edgePercentage.toFixed(2)}%</div>

                            <div className="h-px w-full bg-emerald-500/20 mb-6"></div>

                            <div className="text-sm font-bold text-emerald-200 mb-1 tracking-wider uppercase">Rekommenderad Insats</div>
                            <div className="text-5xl font-black text-white mb-2">{stake.toLocaleString()} kr</div>
                            <div className="text-xs text-emerald-400/60 font-mono">
                                {((stake / bankroll) * 100).toFixed(2)}% av kassan
                            </div>
                        </>
                    ) : (
                        <div className="py-4">
                            <div className="text-red-400 font-bold text-xl mb-2">INGET VÄRDE ⚠️</div>
                            <p className="text-slate-400 text-sm">Marknaden indikerar att detta odds är för lågt.</p>
                            <div className="mt-4 text-xs font-mono text-red-400/60">ROI: {edgePercentage.toFixed(2)}%</div>
                        </div>
                    )}
                </div>

                {/* Historical Insights */}
                <div className="mb-6 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">📊 Historisk Analys</h3>

                    {loadingHistory ? (
                        <div className="text-xs text-slate-500 animate-pulse">Laddar historik...</div>
                    ) : history ? (
                        <div className="space-y-4">
                            {/* H2H Summary */}
                            <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/50 p-3 rounded-lg">
                                <div>
                                    <div className="text-xs text-slate-500">Hemmavinst</div>
                                    <div className="font-bold text-emerald-400">{history.h2h.homeWins}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">Oavgjort</div>
                                    <div className="font-bold text-slate-300">{history.h2h.draws}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">Bortavinst</div>
                                    <div className="font-bold text-emerald-400">{history.h2h.awayWins}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Home Form */}
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">{match.home_team} Form</div>
                                    <div className="flex gap-1">
                                        {history.homeForm.formString.split('-').map((res, i) => (
                                            <span key={i} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${res === 'W' ? 'bg-emerald-500/20 text-emerald-400' : res === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {res}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {/* Away Form */}
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">{match.away_team} Form</div>
                                    <div className="flex gap-1">
                                        {history.awayForm.formString.split('-').map((res, i) => (
                                            <span key={i} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${res === 'W' ? 'bg-emerald-500/20 text-emerald-400' : res === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {res}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Meetings List */}
                            <div>
                                <div className="text-xs text-slate-500 mb-2">Senaste möten</div>
                                <div className="space-y-1">
                                    {history.h2h.matches.slice(0, 3).map((m, i) => (
                                        <div key={i} className="flex justify-between text-xs p-2 bg-slate-800/50 rounded border border-slate-700/30">
                                            <span className="text-slate-400">{new Date(m.date).toLocaleDateString('sv-SE')}</span>
                                            <span className="text-slate-300">{m.homeTeam} - {m.awayTeam}</span>
                                            <span className="font-bold text-white">{m.homeGoals}-{m.awayGoals}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-600 italic">Ingen historik hittades för dessa lag.</div>
                    )}
                </div>

                {/* Gemini Analysis */}
                <div className="mt-6">
                    {!analysis ? (
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                    Analyserar...
                                </>
                            ) : (
                                <>
                                    <span>🤖</span> Fråga Gemini
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl p-4 text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">🤖</span>
                                <h3 className="font-bold text-blue-200">Gemini Analys</h3>
                                <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-full border border-emerald-500/30 animate-pulse">
                                    🟢 Live Data Active
                                </span>
                            </div>
                            <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                {analysis}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / CTA */}
                {edge > 0 && (
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={async () => {
                                const { createBet } = await import('@/src/app/actions/bet-actions');
                                await createBet({
                                    selection,
                                    odds: myOdds,
                                    stake,
                                    bookmaker: bookie,
                                    sport: match.sport_key,
                                    homeTeam: match.home_team,
                                    awayTeam: match.away_team,
                                    date: match.commence_time,
                                    notes: `Edge: ${edgePercentage.toFixed(2)}%`
                                });
                                alert('Spelet har loggats i din tracker!');
                            }}
                            className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                        >
                            📝 Logga Spel
                        </button>
                        <button className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-900/20">
                            Placera spel hos {bookie}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
