'use client';

import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { TAILWIND_COLORS } from '@/lib/constants';
import { formatCurrency, getProjectStats } from '@/lib/utils';
import AuthWrapper from '@/components/AuthWrapper';
import ProjectCard from '@/components/ProjectCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/context/ToastContext';

const Icon = ({ name, className = '', size = 24 }: { name: string, className?: string, size?: number }) => (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
);

const NumberAdjuster = ({ value, onChange, label, step = 100, unit = "" }: any) => (
    <div className="w-full">
        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${TAILWIND_COLORS.textSecondary} opacity-70`}>{label}</label>
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => onChange(Math.max(0, (Number(value) || 0) - step))}
                className="w-10 h-10 rounded-xl bg-white border border-[#EAE3DA] flex items-center justify-center text-[#8C857B] active:scale-90 transition-all shadow-sm"
            >
                <Icon name="remove" size={18} />
            </button>
            <div className="flex-1 min-w-0">
                <input
                    type="number"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-white border border-[#EAE3DA] rounded-xl px-2 py-2.5 text-center text-sm focus:outline-none focus:border-[#8BA888] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                />
            </div>
            <button
                type="button"
                onClick={() => onChange((Number(value) || 0) + step)}
                className="w-10 h-10 rounded-xl bg-white border border-[#EAE3DA] flex items-center justify-center text-[#8C857B] active:scale-90 transition-all shadow-sm"
            >
                <Icon name="add" size={18} />
            </button>
        </div>
    </div>
);

function ProjectsContent() {
    const [user] = useAuthState(auth);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'completed'>('ongoing');

    const projectsRef = user ? collection(db, `users/${user.uid}/projects`) : null;
    const [projectsSnap, loading] = useCollection(projectsRef);

    const projects = projectsSnap?.docs.map(d => ({ id: d.id, ...d.data() } as any)) || [];
    const filteredProjects = projects.filter(p => filterStatus === 'all' || p.status === filterStatus);
    const totalAmount = filteredProjects.reduce((sum, p) => sum + (Number(p.totalBudget) || 0), 0);

    return (
        <div className={`min-h-screen ${TAILWIND_COLORS.bg} px-5 py-10 pb-32 max-w-lg mx-auto`}>
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className={`text-3xl font-black ${TAILWIND_COLORS.textPrimary} tracking-tight`}>專案管理</h1>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${TAILWIND_COLORS.textSecondary} opacity-50 mt-1`}>管理您的所有工作案</p>
                </div>
                <button
                    onClick={() => setIsAddOpen(true)}
                    className="w-12 h-12 bg-[#4A443C] text-[#F9F8F6] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">add</span>
                </button>
            </header>

            {/* Filter Pills */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
                {[
                    { id: 'ongoing', label: '進行中' },
                    { id: 'completed', label: '已結案' },
                    { id: 'all', label: '全部' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id as any)}
                        className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${filterStatus === tab.id
                            ? 'bg-[#4A443C] text-white shadow-md'
                            : 'bg-white text-[#8C857B] border border-[#EAE3DA]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Total Budget Summary */}
            {!loading && filteredProjects.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/40 backdrop-blur-sm rounded-[24px] px-6 py-4 mb-6 border border-[#EAE3DA] flex justify-between items-center"
                >
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#8C857B] opacity-50">篩選總計額度</p>
                        <h3 className="text-xl font-mono font-bold text-[#4A443C] mt-0.5">
                            {formatCurrency(totalAmount)}
                        </h3>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#8C857B] opacity-50">項目數量</p>
                        <p className="text-sm font-bold text-[#4A443C] mt-0.5">{filteredProjects.length}</p>
                    </div>
                </motion.div>
            )}

            {loading ? (
                <div className="py-20 text-center text-[#B5AEA4] italic">載入資料中...</div>
            ) : filteredProjects.length === 0 ? (
                <div className="py-20 text-center bg-white/30 rounded-[32px] border-2 border-dashed border-[#EAE3DA] flex flex-col items-center">
                    <span className="material-symbols-outlined text-4xl mb-4 opacity-20">inventory_2</span>
                    <p className="text-xs text-[#B5AEA4] font-medium italic">目前沒有{filterStatus === 'ongoing' ? '進行中' : filterStatus === 'completed' ? '已結案' : ''}專案</p>
                </div>
            ) : (
                <div className="grid gap-2">
                    {filteredProjects.map(p => (
                        <ProjectCard key={p.id} project={p} tasks={[]} timeLogs={[]} />
                    ))}
                </div>
            )}

            <AnimatePresence>
                {isAddOpen && (
                    <AddProjectModal onClose={() => setIsAddOpen(false)} user={user} />
                )}
            </AnimatePresence>
        </div>
    );
}

export default function ProjectsPage() {
    return (
        <AuthWrapper>
            <ProjectsContent />
        </AuthWrapper>
    );
}

const AddProjectModal = ({ onClose, user }: any) => {
    const [name, setName] = useState('');
    const [budget, setBudget] = useState('0');
    const [rate, setRate] = useState('1000');
    const { showToast } = useToast();

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!user || !name) return;

        try {
            await addDoc(collection(db, `users/${user.uid}/projects`), {
                name,
                totalBudget: Number(budget) || 0,
                targetRate: Number(rate) || 200,
                status: 'ongoing',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                payments: []
            });
            onClose();
            showToast('專案已建立');
        } catch (error) {
            showToast('建立失敗', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative bg-[#F9F8F6] rounded-t-[40px] p-8 pb-10 shadow-2xl border-t border-white/50"
            >
                <div className="w-12 h-1.5 bg-[#D4C3B3] rounded-full mx-auto mb-8 opacity-50" />
                <h2 className={`text-2xl font-bold mb-6 ${TAILWIND_COLORS.textPrimary} tracking-tight`}>建立新專案</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${TAILWIND_COLORS.textSecondary} opacity-70`}>案子名稱</label>
                        <input
                            type="text" required value={name} onChange={e => setName(e.target.value)}
                            placeholder="例如：品牌形象網站設計"
                            className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888]"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <NumberAdjuster
                            label="總預算 (TWD)"
                            value={budget}
                            onChange={(val: any) => setBudget(val)}
                            step={1000}
                        />
                        <NumberAdjuster
                            label="目標時薪"
                            value={rate}
                            onChange={(val: any) => setRate(val)}
                            step={100}
                        />
                    </div>
                    <div className="flex justify-center mt-12 pb-4">
                        <button
                            type="submit"
                            disabled={!name}
                            className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-md active:scale-[0.98] ${name ? `${TAILWIND_COLORS.sageGreen} text-white` : 'bg-[#EAE3DA] text-[#B5AEA4] cursor-not-allowed'}`}
                        >
                            建立專案
                        </button>
                    </div>
                    <div className="h-4" />
                </form>
            </motion.div>
        </div>
    );
};
