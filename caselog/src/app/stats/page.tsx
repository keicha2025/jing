'use client';

import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { TAILWIND_COLORS } from '@/lib/constants';
import AuthWrapper from '@/components/AuthWrapper';

const Icon = ({ name, className = '', size = 24 }: { name: string, className?: string, size?: number }) => (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
);

export default function StatsPage() {
    const [user] = useAuthState(auth);

    return (
        <AuthWrapper>
            <div className={`min-h-screen ${TAILWIND_COLORS.bg} px-5 py-6`}>
                <header className="mb-8 mt-4">
                    <p className={`${TAILWIND_COLORS.textSecondary} text-[10px] tracking-widest uppercase mb-1 font-bold`}>Insights</p>
                    <h1 className={`${TAILWIND_COLORS.textPrimary} text-3xl font-medium tracking-tight`}>分析報表</h1>
                </header>

                <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                    <section className={`${TAILWIND_COLORS.card} p-8 rounded-3xl border ${TAILWIND_COLORS.border} shadow-sm flex flex-col items-center justify-center min-h-[260px] text-center`}>
                        <div className={`w-16 h-16 rounded-full ${TAILWIND_COLORS.wood} flex items-center justify-center mb-6`}>
                            <Icon name="query_stats" size={32} className={TAILWIND_COLORS.textPrimary} />
                        </div>
                        <p className={`${TAILWIND_COLORS.textPrimary} text-base font-semibold italic`}>數據醞釀中...</p>
                        <p className={`${TAILWIND_COLORS.textSecondary} text-xs mt-3 leading-relaxed opacity-70`}>
                            這是一個專屬於您的數據空間。<br />
                            持續計時幾天後，我們將為您解構<br />
                            每一分鐘的價值。
                        </p>
                    </section>

                    <div className={`${TAILWIND_COLORS.wood} p-6 rounded-3xl text-[#4A443C] relative overflow-hidden`}>
                        <div className="absolute -top-4 -right-4 opacity-10">
                            <Icon name="format_quote" size={80} />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">本月關鍵字</h3>
                        <p className="text-sm italic font-medium leading-[1.6] relative z-10">
                            「專注於高價值的子任務，並嚴格控管溝通成本，您的實際時薪將會顯著提升。」
                        </p>
                    </div>
                </div>
            </div>
        </AuthWrapper>
    );
}

// Fixed import for auth
import { auth } from '@/lib/firebase';
