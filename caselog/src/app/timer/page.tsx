'use client';

import React from 'react';
import { TAILWIND_COLORS } from '@/lib/constants';
import AuthWrapper from '@/components/AuthWrapper';

export default function TimerPage() {
    return (
        <AuthWrapper>
            <div className={`min-h-screen ${TAILWIND_COLORS.bg} px-5 py-6 max-w-lg mx-auto flex flex-col items-center justify-center`}>
                <span className="material-symbols-outlined text-6xl text-[#B5AEA4] mb-4 opacity-30">timer</span>
                <h1 className={`${TAILWIND_COLORS.textPrimary} text-2xl font-bold mb-2`}>計時功能開發中</h1>
                <p className={`${TAILWIND_COLORS.textSecondary} text-sm text-center opacity-70`}>
                    專案計時器與自動記錄功能將於近期上線。<br />敬請期待！
                </p>
            </div>
        </AuthWrapper>
    );
}
