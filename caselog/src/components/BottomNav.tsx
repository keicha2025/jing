'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Icon = ({ name, className = '', size = 24 }: { name: string, className?: string, size?: number }) => (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
);

export default function BottomNav() {
    const pathname = usePathname();

    const tabs = [
        { label: '首頁', icon: 'dashboard', href: '/' },
        { label: '專案', icon: 'folder_open', href: '/projects' }, // Dedicated project list/management
        { label: '設定', icon: 'settings', href: '/settings' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[#EAE3DA] h-18 pb-safe z-[100] flex justify-around items-center px-4 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] rounded-t-[32px]">
            {tabs.map((tab) => {
                const isActive = pathname === tab.href || (tab.href !== '/' && pathname?.startsWith(tab.href));
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`flex flex-col items-center justify-center py-3 px-4 transition-all duration-300 ${isActive ? 'text-[#4A443C] scale-110' : 'text-[#8C857B] opacity-50'
                            }`}
                    >
                        <Icon
                            name={tab.icon}
                            size={24}
                            className={`${isActive ? 'fill-1' : ''}`}
                        />
                        <span className={`text-[9px] mt-1 font-black uppercase tracking-[0.1em] ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                            {tab.label}
                        </span>
                        {isActive && (
                            <div className="absolute top-0 w-8 h-1 bg-[#4A443C] rounded-full mt-1" />
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
