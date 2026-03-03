'use client';

import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { collection } from 'firebase/firestore';
import { TAILWIND_COLORS } from '@/lib/constants';
import { formatCurrency, getProjectStats } from '@/lib/utils';
import AuthWrapper from '@/components/AuthWrapper';
import Link from 'next/link';

const Icon = ({ name, className = '', size = 24 }: { name: string, className?: string, size?: number }) => (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
);

export default function FinancePage() {
    const [user] = useAuthState(auth);
    const projectsRef = user ? collection(db, `users/${user.uid}/projects`) : null;
    const [projectsSnap, loading] = useCollection(projectsRef);

    const projects = projectsSnap?.docs.map(d => ({ id: d.id, ...d.data() } as any)) || [];

    // Calculate financials
    const unpaidProjects = projects.filter(p => {
        const stats = getProjectStats(p, [], []); // We only need totalPaid and totalBudget here
        return stats.remainingBalance > 0;
    });

    const totalOutstanding = unpaidProjects.reduce((acc, p) => {
        const stats = getProjectStats(p, [], []);
        return acc + stats.remainingBalance;
    }, 0);

    return (
        <AuthWrapper>
            <div className={`min-h-screen ${TAILWIND_COLORS.bg} px-5 py-6 max-w-lg mx-auto`}>
                <header className="mb-8 mt-4 leading-tight">
                    <p className={`${TAILWIND_COLORS.textSecondary} text-[10px] tracking-widest uppercase mb-1 font-bold`}>Financials</p>
                    <h1 className={`${TAILWIND_COLORS.textPrimary} text-3xl font-medium tracking-tight`}>帳務管理</h1>
                </header>

                <div className={`${TAILWIND_COLORS.card} p-7 rounded-3xl border ${TAILWIND_COLORS.border} shadow-sm mb-10 bg-gradient-to-br from-white to-[#F9F8F6] relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Icon name="payments" size={100} />
                    </div>
                    <p className={`${TAILWIND_COLORS.textSecondary} text-[10px] font-bold uppercase tracking-widest mb-2 opacity-70`}>待收總額</p>
                    <p className={`${TAILWIND_COLORS.textPrimary} text-4xl font-bold font-mono tracking-tighter`}>{formatCurrency(totalOutstanding)}</p>
                </div>

                <section className="mb-8">
                    <div className="flex justify-between items-center mb-5 px-1">
                        <h2 className={`text-sm font-bold ${TAILWIND_COLORS.textPrimary} tracking-wide uppercase opacity-60`}>未清帳單 ({unpaidProjects.length})</h2>
                        <div className="w-8 h-0.5 bg-[#EAE3DA] rounded-full" />
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <p className="text-center py-20 text-xs text-[#8C857B] italic">載入中...</p>
                        ) : unpaidProjects.length === 0 ? (
                            <div className="text-center py-16 bg-white/30 rounded-3xl border-2 border-dashed border-[#EAE3DA] text-[#B5AEA4] text-xs flex flex-col items-center">
                                <Icon name="sentiment_satisfied" size={32} className="mb-2 opacity-30" />
                                尚無未清款項，財務健康 ✨
                            </div>
                        ) : (
                            unpaidProjects.map(p => {
                                const stats = getProjectStats(p, [], []);
                                return (
                                    <Link href={`/project?id=${p.id}`} key={p.id} className={`${TAILWIND_COLORS.card} p-5 rounded-2xl border ${TAILWIND_COLORS.border} flex justify-between items-center shadow-sm active:scale-95 transition-transform`}>
                                        <div className="overflow-hidden mr-4">
                                            <p className={`text-base font-bold ${TAILWIND_COLORS.textPrimary} truncate tracking-tight`}>{p.name}</p>
                                            <p className={`text-[10px] ${TAILWIND_COLORS.textSecondary} mt-1 font-medium opacity-70`}>
                                                預算 {formatCurrency(p.totalBudget)} / 已收 {formatCurrency(stats.totalPaid)}
                                            </p>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <p className="text-lg font-bold text-[#C87965] font-mono tracking-tighter">{formatCurrency(stats.remainingBalance)}</p>
                                            <Icon name="arrow_forward_ios" size={12} className="text-[#D4C3B3] mt-1" />
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>
        </AuthWrapper>
    );
}
