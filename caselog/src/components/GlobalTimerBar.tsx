'use client';

import React from 'react';
import { useTimer } from '@/context/TimerContext';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { COLORS, TAILWIND_COLORS } from '@/lib/constants';

export default function GlobalTimerBar() {
    const [user] = useAuthState(auth);
    const { activeTimer, elapsedTime, stopTimer } = useTimer();

    if (!activeTimer) return null;

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className={`fixed bottom-[90px] left-5 right-5 ${TAILWIND_COLORS.wood} rounded-[20px] py-1 pl-4 pr-1 shadow-2xl flex items-center justify-between z-[45] animate-in fade-in slide-in-from-bottom-6 duration-500 ring-2 ring-white/50 backdrop-blur-sm max-w-lg mx-auto`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C87965] animate-pulse shrink-0" />
                <div className="flex flex-col truncate max-w-[120px]">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${TAILWIND_COLORS.textSecondary} leading-tight truncate opacity-60`}>
                        {activeTimer.projectName}
                    </span>
                    <span className={`text-[12px] font-bold ${TAILWIND_COLORS.textPrimary} leading-tight truncate tracking-tight`}>
                        {activeTimer.taskName}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[13px] font-black ${TAILWIND_COLORS.textPrimary} font-mono tracking-tighter bg-white/40 px-3 py-1.5 rounded-xl border border-white/50 min-w-[70px] text-center`}>
                    {formatTime(elapsedTime)}
                </span>
                <button
                    onClick={() => user && stopTimer(user.uid)}
                    className={`w-12 h-12 rounded-2xl ${TAILWIND_COLORS.card} flex items-center justify-center text-[#C87965] shadow-sm active:scale-95 transition-transform`}
                >
                    <span className="material-symbols-outlined text-[24px]">stop_circle</span>
                </button>
            </div>
        </div>
    );
}
