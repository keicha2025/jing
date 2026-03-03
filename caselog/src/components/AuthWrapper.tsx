'use client';

import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { TAILWIND_COLORS } from '@/lib/constants';

const Icon = ({ name, className = '', size = 24 }: { name: string, className?: string, size?: number }) => (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
);

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
    const [user, loading] = useAuthState(auth);

    if (loading) {
        return (
            <div className={`w-full h-screen ${TAILWIND_COLORS.bg} flex items-center justify-center ${TAILWIND_COLORS.textPrimary}`}>
                載入中...
            </div>
        );
    }

    if (!user) {
        return <LoginScreen />;
    }

    return <>{children}</>;
}

const LoginScreen = () => {
    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Error: ", error);
        }
    };

    return (
        <div className={`w-full h-screen ${TAILWIND_COLORS.bg} font-sans flex items-center justify-center`}>
            <div className="w-full max-w-md p-8 text-center">
                <div className={`w-16 h-16 mx-auto ${TAILWIND_COLORS.wood} rounded-full flex items-center justify-center mb-6`}>
                    <span className={`font-serif italic text-2xl ${TAILWIND_COLORS.textPrimary}`}>J.</span>
                </div>
                <h1 className={`${TAILWIND_COLORS.textPrimary} text-3xl font-medium tracking-wide mb-2`}>案時記</h1>
                <p className={`${TAILWIND_COLORS.textSecondary} text-sm mb-12`}>Wabi-sabi Workspace</p>

                <button
                    onClick={handleLogin}
                    className={`w-full py-4 rounded-xl text-white font-medium tracking-wide transition-colors ${TAILWIND_COLORS.sageGreen} hover:opacity-90 flex items-center justify-center`}
                >
                    <Icon name="login" className="mr-2" size={20} />
                    使用 Google 登入
                </button>
            </div>
        </div>
    );
};
