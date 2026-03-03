'use client';

import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, doc } from 'firebase/firestore';
import { TAILWIND_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import AuthWrapper from '@/components/AuthWrapper';
import ProjectCard from '@/components/ProjectCard';

import { motion, AnimatePresence } from 'framer-motion';

const Icon = ({ name, className = '', size = 24 }: { name: string, className?: string, size?: number }) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
);

export default function Dashboard() {
  const [user] = useAuthState(auth);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);

  // Firestore Refs
  const projectsRef = user ? collection(db, `users/${user.uid}/projects`) : null;
  const settingsRef = user ? doc(db, `users/${user.uid}/settings/profile`) : null;

  const [projectsSnap, projectsLoading] = useCollection(projectsRef);
  const [settingsSnap] = useDocument(settingsRef);

  // 讀取設定頁儲存的全域目標時薪
  const globalTargetRate = settingsSnap?.data()?.targetRate?.toString() || '';

  const projects = projectsSnap?.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(p => p.status === 'ongoing') || [];

  return (
    <AuthWrapper>
      <div className={`min-h-screen ${TAILWIND_COLORS.bg} px-5 py-6 max-w-lg mx-auto`}>
        <header className="mb-8 mt-4 flex justify-between items-end">
          <div>
            <p className={`${TAILWIND_COLORS.textSecondary} text-[10px] tracking-widest uppercase mb-1 font-bold`}>Caselog Workspace</p>
            <h1 className={`${TAILWIND_COLORS.textPrimary} text-3xl font-medium tracking-tight`}>專案總覽</h1>
          </div>
          {user && (
            <div className="w-12 h-12 rounded-2xl bg-[#EAE3DA] flex items-center justify-center overflow-hidden border-2 border-white shadow-sm ring-2 ring-[#EAE3DA]">
              <img src={user.photoURL || ""} alt="User" className="w-full h-full object-cover" />
            </div>
          )}
        </header>

        {/* Dashboard Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className={`${TAILWIND_COLORS.card} p-5 rounded-3xl shadow-sm border ${TAILWIND_COLORS.border} active:shadow-none transition-shadow`}>
            <p className={`${TAILWIND_COLORS.textSecondary} text-[10px] font-bold uppercase tracking-wider mb-2`}>專案總預算</p>
            <p className={`${TAILWIND_COLORS.textPrimary} text-2xl font-bold font-mono`}>
              {formatCurrency(projects.reduce((acc, p) => acc + (p.totalBudget || 0), 0))}
            </p>
          </div>
          <div className={`${TAILWIND_COLORS.card} p-5 rounded-3xl shadow-sm border ${TAILWIND_COLORS.border} active:shadow-none transition-shadow`}>
            <p className={`${TAILWIND_COLORS.textSecondary} text-[10px] font-bold uppercase tracking-wider mb-2`}>待收帳款</p>
            <p className={`${TAILWIND_COLORS.textPrimary} text-2xl font-bold font-mono`}>
              {formatCurrency(projects.reduce((acc, p) => {
                const totalPaid = (p.payments || []).reduce((sum: number, pay: any) => sum + pay.amount, 0);
                return acc + ((p.totalBudget || 0) - totalPaid);
              }, 0))}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className={`text-sm font-bold ${TAILWIND_COLORS.textPrimary} tracking-wide uppercase opacity-60`}>進行中專案</h2>
            <div className="w-6 h-0.5 bg-[#EAE3DA] rounded-full" />
          </div>

          {projectsLoading ? (
            <div className="text-center py-20 text-[#8C857B] text-sm italic">載入資料中...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 text-[#B5AEA4] text-sm flex flex-col items-center bg-white/30 rounded-3xl border-2 border-dashed border-[#EAE3DA]">
              <Icon name="work_outline" size={48} className="mb-4 opacity-30" />
              <p className="font-medium">尚無進行中的專案</p>
              <p className="text-[10px] mt-1 opacity-70">點擊右下角按鈕開始計時</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map(p => (
                <ProjectCard key={p.id} project={p} tasks={[]} timeLogs={[]} />
              ))}
            </div>
          )}
        </div>

        {/* Floating Add Project Button */}
        <div className="fixed bottom-24 right-5 z-20">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsAddProjectOpen(true)}
            className="w-14 h-14 bg-[#4A443C] text-[#F9F8F6] rounded-full shadow-lg flex items-center justify-center"
          >
            <Icon name="add" size={28} />
          </motion.button>
        </div>

        <AnimatePresence>
          {isAddProjectOpen && (
            <AddProjectModal onClose={() => setIsAddProjectOpen(false)} user={user} projectsRef={projectsRef} defaultRate={globalTargetRate} />
          )}
        </AnimatePresence>
      </div>
    </AuthWrapper>
  );
}

const AddProjectModal = ({ onClose, user, projectsRef, defaultRate }: any) => {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [rate, setRate] = useState(defaultRate || '');

  // 当 defaultRate 載入後同步資料
  React.useEffect(() => {
    if (defaultRate) setRate(defaultRate);
  }, [defaultRate]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!name || !projectsRef) return;

    await addDoc(projectsRef, {
      name,
      totalBudget: Number(budget) || 0,
      targetRate: Number(rate) || 0,
      status: 'ongoing',
      createdAt: new Date(),
      payments: []
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
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
        className="relative bg-[#F9F8F6] rounded-t-[40px] p-8 shadow-2xl border-t border-white/50"
      >
        <div className="w-12 h-1.5 bg-[#D4C3B3] rounded-full mx-auto mb-8 opacity-50" />
        <h2 className={`text-2xl font-bold mb-6 ${TAILWIND_COLORS.textPrimary} tracking-tight`}>新增專案</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${TAILWIND_COLORS.textSecondary} opacity-70`}>專案名稱</label>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="例如：品牌識別設計"
              className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888] transition-colors placeholder:text-[#B5AEA4]"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${TAILWIND_COLORS.textSecondary} opacity-70`}>總預算 (TWD)</label>
              <input
                type="number" required value={budget} onChange={e => setBudget(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888] transition-colors font-mono"
              />
            </div>
            <div className="flex-1">
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 ${TAILWIND_COLORS.textSecondary} opacity-70`}>
                預期時薪 {defaultRate ? <span className="normal-case font-normal opacity-50">(來自設定)</span> : ''}
              </label>
              <input
                type="number" required value={rate} onChange={e => setRate(e.target.value)}
                placeholder={defaultRate || '2000'}
                className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888] transition-colors font-mono"
              />
            </div>
          </div>
          <div className="flex justify-center mt-8">
            <button type="submit" className={`w-20 h-20 rounded-full text-white flex items-center justify-center ${TAILWIND_COLORS.sageGreen} shadow-lg shadow-[#8BA888]/20 active:scale-95 transition-all`}>
              <Icon name="check" size={32} />
            </button>
          </div>
          <div className="h-6" /> {/* Spacer for safe area */}
        </form>
      </motion.div>
    </div>
  );
};
