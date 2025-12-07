'use client';

import { useState } from 'react';
import { updateBetStatus } from '@/src/app/actions/bet-actions';

export function BetStatusToggle({ betId, initialStatus }: { betId: string, initialStatus: string }) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (newStatus: 'WON' | 'LOST' | 'VOID') => {
        setLoading(true);
        try {
            await updateBetStatus(betId, newStatus);
            setStatus(newStatus);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (status !== 'PENDING') {
        return (
            <span className={`text-xs font-bold px-2 py-1 rounded ${status === 'WON' ? 'bg-emerald-500/20 text-emerald-400' :
                    status === 'LOST' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                }`}>
                {status}
            </span>
        );
    }

    return (
        <div className="flex justify-center gap-1">
            <button
                disabled={loading}
                onClick={() => handleUpdate('WON')}
                className="p-1 hover:bg-emerald-500/20 text-emerald-500 rounded transition-colors"
                title="Vinst"
            >
                ✅
            </button>
            <button
                disabled={loading}
                onClick={() => handleUpdate('LOST')}
                className="p-1 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                title="Förlust"
            >
                ❌
            </button>
            <button
                disabled={loading}
                onClick={() => handleUpdate('VOID')}
                className="p-1 hover:bg-slate-500/20 text-slate-500 rounded transition-colors"
                title="Void"
            >
                🚫
            </button>
        </div>
    );
}
