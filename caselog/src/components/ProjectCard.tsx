'use client';

import React from 'react';
import Link from 'next/link';
import { TAILWIND_COLORS } from '@/lib/constants';
import { formatCurrency, getProjectStats } from '@/lib/utils';

const Icon = ({ name, className = '', size = 24 }: { name: string, className?: string, size?: number }) => (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
);

export default function ProjectCard({ project, tasks, timeLogs }: { project: any, tasks: any[], timeLogs: any[] }) {
    const stats = getProjectStats(project, tasks, timeLogs);
    const progressColor = stats.isOvertime ? TAILWIND_COLORS.terracotta : TAILWIND_COLORS.sageGreen;

    return (
        <Link
            href={`/project?id=${project.id.slice(-4)}`}
            className={`${TAILWIND_COLORS.card} rounded-[32px] p-6 mb-5 shadow-sm border ${TAILWIND_COLORS.border} active:scale-[0.97] transition-all cursor-pointer block relative group hover:shadow-md`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className={`${TAILWIND_COLORS.textPrimary} font-bold text-xl tracking-tight leading-loose`}>{project.name}</h3>
                        <Icon name="chevron_right" size={18} className="text-[#B5AEA4] opacity-50 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className={`${TAILWIND_COLORS.textSecondary} text-[10px] mt-1 flex items-center font-medium opacity-80 uppercase tracking-wider`}>
                        <Icon name="payments" size={14} className="mr-1" />
                        {formatCurrency(project.totalBudget)} <span className="mx-1.5 opacity-30">|</span> ${project.targetRate}/h
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`px-2.5 py-1 rounded-lg text-[10px] tracking-widest font-black uppercase ${stats.remainingBalance <= 0 ? 'bg-[#8BA888]/10 text-[#8BA888]' :
                        stats.totalPaid > 0 ? 'bg-[#D4C3B3]/40 text-[#8C857B]' :
                            'bg-[#C87965]/10 text-[#C87965]'
                        }`}>
                        {stats.remainingBalance <= 0 ? '已收訖' : stats.totalPaid > 0 ? '部分收' : '未收款'}
                    </div>
                    <div className="p-1.5 rounded-full bg-[#EAE3DA]/30 text-[#8C857B] opacity-60">
                        <Icon name="settings" size={16} />
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
                <div className="flex justify-between text-xs mb-2">
                    <span className={`${TAILWIND_COLORS.textSecondary} font-medium`}>已投入 {stats.loggedHours.toFixed(1)}h</span>
                    <span className={stats.isOvertime ? 'text-[#C87965] font-bold' : TAILWIND_COLORS.textSecondary}>
                        {stats.isOvertime ? '超時預警' : `剩餘 ${(stats.expectedHours - stats.loggedHours).toFixed(1)}h`}
                    </span>
                </div>
                <div className="h-2 w-full bg-[#EAE3DA] rounded-full overflow-hidden">
                    <div
                        className={`h-full ${progressColor} transition-all duration-700 ease-out`}
                        style={{ width: `${stats.progressPercent}%` }}
                    />
                </div>
                {stats.isOvertime && (
                    <p className="text-[10px] text-[#C87965] mt-2 text-right font-medium">
                        實際時薪已降至 ${Math.round(stats.actualRate)}/h
                    </p>
                )}
            </div>
        </Link>
    );
}
