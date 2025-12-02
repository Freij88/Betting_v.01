import React, { useState, useRef, useEffect } from 'react';
import { SWEDISH_BOOKMAKERS } from '@/src/lib/constants';

interface BookieSelectorProps {
    allBookies: string[];
    selectedBookies: string[];
    onChange: (selected: string[]) => void;
}

export default function BookieSelector({ allBookies, selectedBookies, onChange }: BookieSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    const handleToggle = (bookie: string) => {
        if (selectedBookies.includes(bookie)) {
            onChange(selectedBookies.filter(b => b !== bookie));
        } else {
            onChange([...selectedBookies, bookie]);
        }
    };

    const handleSelectAllSwedish = () => {
        // Filter SWEDISH_BOOKMAKERS to only include those present in allBookies (to avoid selecting unavailable ones)
        const availableSwedish = SWEDISH_BOOKMAKERS.filter(b => allBookies.includes(b));
        onChange(availableSwedish);
    };

    const handleDeselectAll = () => {
        onChange([]);
    };

    const handleSelectAll = () => {
        onChange(allBookies);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
            >
                <span>📚 Välj Bolag ({selectedBookies.length})</span>
                <span className="text-xs text-slate-400">▼</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-3 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 space-y-2">
                        <div className="flex gap-2">
                            <button
                                onClick={handleSelectAllSwedish}
                                className="flex-1 px-2 py-1.5 bg-emerald-900/30 text-emerald-400 text-xs rounded hover:bg-emerald-900/50 border border-emerald-800/50 transition-colors"
                            >
                                🇸🇪 Endast Svenska
                            </button>
                            <button
                                onClick={handleSelectAll}
                                className="flex-1 px-2 py-1.5 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700 border border-slate-700 transition-colors"
                            >
                                Alla
                            </button>
                        </div>
                        <button
                            onClick={handleDeselectAll}
                            className="w-full px-2 py-1.5 bg-red-900/20 text-red-400 text-xs rounded hover:bg-red-900/30 border border-red-900/30 transition-colors"
                        >
                            Avmarkera alla
                        </button>
                    </div>

                    <div className="overflow-y-auto p-2 space-y-1">
                        {allBookies.map(bookie => (
                            <label key={bookie} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded cursor-pointer group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedBookies.includes(bookie) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-slate-500'}`}>
                                    {selectedBookies.includes(bookie) && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className={`text-sm ${selectedBookies.includes(bookie) ? 'text-slate-200' : 'text-slate-400'}`}>
                                    {bookie}
                                    {SWEDISH_BOOKMAKERS.includes(bookie) && <span className="ml-2 text-xs text-emerald-500/70" title="Svensk Licens">🇸🇪</span>}
                                </span>
                            </label>
                        ))}

                        {allBookies.length === 0 && (
                            <div className="p-4 text-center text-slate-500 text-sm">
                                Inga bolag hittades.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
