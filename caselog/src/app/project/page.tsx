'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';
import { TAILWIND_COLORS } from '@/lib/constants';
import { formatCurrency, getProjectStats } from '@/lib/utils';
import AuthWrapper from '@/components/AuthWrapper';
import SwipeableTask from '@/components/SwipeableTask';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';

import { motion, AnimatePresence } from 'framer-motion';

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
            <div className="flex-1 relative">
                <input
                    type="number"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-white border border-[#EAE3DA] rounded-xl px-4 py-2.5 text-center text-sm focus:outline-none focus:border-[#8BA888] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#8C857B] opacity-30">{unit}</span>}
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

function ProjectDetailContent() {
    const searchParams = useSearchParams();
    const idFromUrl = searchParams.get('id');
    const [user] = useAuthState(auth);
    const { showToast } = useToast();
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isPaymentExpanded, setIsPaymentExpanded] = useState(false);
    const [paymentDeleteTarget, setPaymentDeleteTarget] = useState<string | null>(null);
    const [bottomSheet, setBottomSheet] = useState<{ isOpen: boolean, type: string | null, data: any }>({ isOpen: false, type: null, data: null });

    // 收款紀錄狀態移至主視圖
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNote, setPaymentNote] = useState('');

    // Fetch all projects to find the matching short ID
    const projectsListRef = user ? collection(db, `users/${user.uid}/projects`) : null;
    const [projectsSnap] = useCollection(projectsListRef);

    // Find matching project manually (as short ID is suffix of doc ID)
    const matchingDoc = projectsSnap?.docs.find(d => d.id.slice(-4) === idFromUrl);
    const project = matchingDoc?.data() ? { id: matchingDoc.id, ...matchingDoc.data() } as any : null;

    const projectRef = user && project ? doc(db, `users/${user.uid}/projects/${project.id}`) : null;
    const tasksRef = user && project ? collection(db, `users/${user.uid}/projects/${project.id}/tasks`) : null;
    const settingsRef = user ? doc(db, `users/${user.uid}/settings/profile`) : null;

    const [projectSnap] = useDocument(projectRef);
    const [tasksSnap] = useCollection(tasksRef);
    const [settingsSnap] = useDocument(settingsRef);

    const tasks = tasksSnap?.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => {
            const timeA = a.lastLogAt?.seconds || (a.createdAt?.seconds || 0);
            const timeB = b.lastLogAt?.seconds || (b.createdAt?.seconds || 0);
            return timeB - timeA;
        }) || [];

    // 優先使用專案自身設定，如果沒有則回退到設定頁的全域目標時薪
    const globalRate = settingsSnap?.data()?.targetRate;
    const effectiveProjectForStats = project ? {
        ...project,
        targetRate: project.targetRate || globalRate || 0
    } : project;

    // Data sync logic: Compare aggregation field vs sum of tasks
    const totalMinutesFromTasksSync = tasks.reduce((acc, t) => acc + (t.totalMinutes || 0), 0);
    const projectTotalMinutes = project?.totalMinutes || 0;

    // Automatic sync check
    React.useEffect(() => {
        if (!user || !projectRef || tasks.length === 0) return;
        // If aggregate is missing or clearly wrong (not matching task sums), fix it quietly
        if (projectTotalMinutes !== totalMinutesFromTasksSync) {
            updateDoc(projectRef, { totalMinutes: totalMinutesFromTasksSync }).catch(() => { });
        }
    }, [tasksSnap, user, projectRef, projectTotalMinutes, totalMinutesFromTasksSync]);

    // Visibility & Focus Monitor (Option 2)
    React.useEffect(() => {
        const handleRefresh = () => {
            // Firestore usually handles this, but we can log or trigger a soft re-eval if needed
            // console.log('Window focused, keeping data alive');
        };
        window.addEventListener('focus', handleRefresh);
        window.addEventListener('visibilitychange', handleRefresh);
        return () => {
            window.removeEventListener('focus', handleRefresh);
            window.removeEventListener('visibilitychange', handleRefresh);
        };
    }, []);

    // Compute stats using precomputed minutes (Option 1)
    // Preference: project.totalMinutes (Aggregate) -> then sum(task.totalMinutes) -> then fallback to legacy hours
    const finalLoggedMinutes = project?.totalMinutes ?? totalMinutesFromTasksSync;
    const stats = getProjectStats(effectiveProjectForStats, tasks, [], finalLoggedMinutes);

    if (!idFromUrl) return <div className="p-10 text-center text-[#B5AEA4] italic">載入中...</div>;
    if (!project) return <div className="p-10 text-center text-[#B5AEA4] italic">載入中...</div>;

    const handleToggleStatus = async (taskId: string, isCompleted: boolean) => {
        if (!user || !project.id) return;
        const taskRef = doc(db, `users/${user.uid}/projects/${project.id}/tasks/${taskId}`);
        await updateDoc(taskRef, { isCompleted });
    };

    const handleToggleProjectStatus = async () => {
        if (!user || !project || !projectRef) return;
        const newStatus = project.status === 'completed' ? 'ongoing' : 'completed';
        await updateDoc(projectRef, { status: newStatus });
        setIsMenuOpen(false);
    };

    const handleDeleteProject = async () => {
        if (!user || !projectRef) return;
        if (!window.confirm(`確定要刪除「${project?.name}」嗎？此操作不可還原。`)) return;
        await deleteDoc(projectRef);
        showToast('專案已刪除', 'info');
        window.location.href = window.location.origin + window.location.pathname.split('caselog')[0] + 'caselog/projects';
    };

    const handleAddPayment = async () => {
        if (!projectRef || !paymentAmount) return;
        const amount = Number(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            showToast('請輸入有效金額', 'error');
            return;
        }

        const newPayment = {
            amount,
            date: paymentDate,
            note: paymentNote,
            id: Date.now().toString()
        };

        const currentPayments = project.payments || [];
        await updateDoc(projectRef, {
            payments: [...currentPayments, newPayment]
        });
        setPaymentAmount('');
        setPaymentNote('');
        showToast('已新增收款紀錄');
    };

    const handleRemovePayment = async (paymentId: string) => {
        if (!projectRef) return;
        const currentPayments = project.payments || [];
        await updateDoc(projectRef, {
            payments: currentPayments.filter((p: any) => p.id !== paymentId)
        });
        setPaymentDeleteTarget(null);
        showToast('已移除收款紀錄', 'info');
    };

    return (
        <div className={`min-h-screen ${TAILWIND_COLORS.bg} flex flex-col items-center`}>
            <header className="w-full px-5 py-4 bg-white/80 backdrop-blur-lg sticky top-0 z-40 border-b border-[#EAE3DA] flex items-center justify-between font-sans">
                <Link href="/" className="p-2 -ml-2 text-[#4A443C] flex items-center justify-center active:scale-90 transition-transform">
                    <Icon name="arrow_back_ios" size={20} />
                </Link>
                <div className="flex items-center gap-2 truncate max-w-[240px]">
                    <span className="text-base font-bold text-[#4A443C] truncate tracking-tight">{project.name}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${project.status === 'completed' ? 'bg-[#8BA888]/10 text-[#8BA888]' : 'bg-[#D4C3B3]/30 text-[#8C857B]'
                        }`}>{project.status === 'completed' ? '已完成' : '進行中'}</span>
                </div>
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 -mr-2 text-[#4A443C] flex items-center justify-center active:scale-90 transition-transform"
                >
                    <Icon name="more_vert" size={20} />
                </button>
            </header>

            <div className="w-full max-w-lg px-5 py-8 flex-1 overflow-y-auto pb-32">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#FFFFFF] rounded-[32px] p-7 mb-10 border border-[#EAE3DA] shadow-sm relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Icon name="monitoring" size={120} />
                    </div>

                    <div className="flex justify-between items-baseline mb-8">
                        <span className={`text-[10px] uppercase tracking-widest font-black ${TAILWIND_COLORS.textSecondary} opacity-60`}>專案數據監控</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${stats.remainingBalance <= 0 ? 'bg-[#8BA888]/10 text-[#8BA888]' :
                            stats.totalPaid > 0 ? 'bg-[#D4C3B3]/40 text-[#8C857B]' :
                                'bg-[#C87965]/10 text-[#C87965]'
                            }`}>
                            收款狀態：{stats.remainingBalance <= 0 ? '全額已收' : stats.totalPaid > 0 ? '部分收款' : '未收款'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-7 gap-x-4">
                        <div className="relative z-10">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${TAILWIND_COLORS.textSecondary} mb-2 opacity-60`}>專案預算</p>
                            <p className={`text-2xl font-bold font-mono ${TAILWIND_COLORS.textPrimary} tracking-tighter`}>{formatCurrency(project.totalBudget)}</p>
                        </div>
                        <div className="relative z-10 text-right">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${TAILWIND_COLORS.textSecondary} mb-2 opacity-60 text-right`}>目前實際時薪</p>
                            <p className={`text-2xl font-bold font-mono ${stats.isOvertime ? 'text-[#C87965]' : TAILWIND_COLORS.textPrimary} tracking-tighter`}>
                                {stats.loggedHours > 0 ? `$${Math.round(stats.actualRate)}` : '-'}
                                <span className="text-[10px] font-medium text-[#B5AEA4] opacity-50 block mt-1 tracking-normal">
                                    / 目標 ${effectiveProjectForStats?.targetRate ?? project.targetRate}
                                    {globalRate ? <span className="opacity-60"> (設定)</span> : ''}
                                </span>
                            </p>
                        </div>
                        <div className="pt-4 border-t border-dashed border-[#EAE3DA]">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${TAILWIND_COLORS.textSecondary} mb-2 opacity-60`}>已投資工時</p>
                            <p className={`text-xl font-bold ${TAILWIND_COLORS.textPrimary} font-mono tracking-tighter`}>{stats.loggedHours.toFixed(1)} <span className="text-[10px] opacity-40 uppercase">h</span></p>
                        </div>
                        <div className="pt-4 border-t border-dashed border-[#EAE3DA]">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${TAILWIND_COLORS.textSecondary} mb-2 opacity-60 text-right`}>剩餘建議工時</p>
                            <p className={`text-xl font-bold ${TAILWIND_COLORS.textPrimary} font-mono tracking-tighter text-right`}>{(stats.expectedHours - stats.loggedHours).toFixed(1)} <span className="text-[10px] opacity-40 uppercase">h</span></p>
                        </div>
                    </div>
                    <div className="mt-10">
                        <div className="h-2 w-full bg-[#EAE3DA] rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.progressPercent}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className={`h-full ${stats.isOvertime ? TAILWIND_COLORS.terracotta : TAILWIND_COLORS.sageGreen}`}
                            />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[10px] font-bold text-[#B5AEA4] uppercase tracking-widest opacity-60">工時佔比</span>
                            <span className={`text-[10px] font-bold ${stats.isOvertime ? 'text-[#C87965]' : 'text-[#8BA888]'} font-mono`}>{Math.round(stats.progressPercent)}%</span>
                        </div>
                    </div>
                </motion.div>
                <div className="flex justify-between items-center mb-6 px-1">
                    <h3 className={`text-sm font-black uppercase tracking-widest opacity-60 ${TAILWIND_COLORS.textPrimary}`}>任務列表 ({tasks.length})</h3>
                    <div className="h-0.5 w-10 bg-[#EAE3DA] rounded-full" />
                </div>

                <div className="space-y-4 mb-16">
                    {tasks.length === 0 ? (
                        <div className="text-center py-20 bg-white/30 rounded-[32px] border-2 border-dashed border-[#EAE3DA] text-[#B5AEA4] text-xs flex flex-col items-center">
                            <Icon name="assignment" size={40} className="mb-4 opacity-20" />
                            目前尚無子任務
                        </div>
                    ) : (
                        tasks.map(t => (
                            <SwipeableTask
                                key={t.id}
                                task={t}
                                project={{ ...project, userId: user?.uid }}
                                onToggleStatus={handleToggleStatus}
                                onEdit={(task: any) => setBottomSheet({ isOpen: true, type: 'edit_task', data: task })}
                            />
                        ))
                    )}
                </div>

                {/* 直接管理的收款紀錄 */}
                <div className="flex justify-between items-center mb-6 px-1 pt-6 border-t border-[#EAE3DA]">
                    <h3 className={`text-sm font-black uppercase tracking-widest opacity-60 ${TAILWIND_COLORS.textPrimary}`}>收款管理</h3>
                    <div className="h-0.5 w-10 bg-[#EAE3DA] rounded-full" />
                </div>

                <div className={`${TAILWIND_COLORS.card} rounded-[24px] border border-[#EAE3DA] shadow-sm mb-12 overflow-hidden`}>
                    <div className="px-5 py-4">
                        <div className="flex gap-2 items-center">
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    onClick={() => setIsPaymentExpanded(true)}
                                    placeholder="輸入金額"
                                    className="w-full bg-[#F9F8F6] border border-[#EAE3DA] rounded-xl px-4 py-2.5 text-sm font-bold font-mono focus:outline-none focus:border-[#8BA888] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                {!isPaymentExpanded && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C857B] opacity-30">
                                        <Icon name="expand_more" size={18} />
                                    </div>
                                )}
                            </div>
                            {!isPaymentExpanded && paymentAmount && (
                                <button
                                    onClick={handleAddPayment}
                                    className={`w-10 h-10 rounded-xl ${TAILWIND_COLORS.sageGreen} text-white flex items-center justify-center active:scale-95 transition-all shadow-sm shrink-0`}
                                >
                                    <Icon name="check" size={18} />
                                </button>
                            )}
                        </div>

                        <AnimatePresence>
                            {isPaymentExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-3 mt-3 pt-3 border-t border-[#EAE3DA]/50">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[9px] font-bold uppercase tracking-widest mb-1 text-[#8C857B] opacity-60">日期</label>
                                                <input
                                                    type="date"
                                                    value={paymentDate}
                                                    onChange={e => setPaymentDate(e.target.value)}
                                                    className="w-full bg-[#F9F8F6] border border-[#EAE3DA] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#8BA888] font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold uppercase tracking-widest mb-1 text-[#8C857B] opacity-60">備註</label>
                                                <input
                                                    type="text"
                                                    value={paymentNote}
                                                    onChange={e => setPaymentNote(e.target.value)}
                                                    placeholder="例如：訂金"
                                                    className="w-full bg-[#F9F8F6] border border-[#EAE3DA] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#8BA888]"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsPaymentExpanded(false)}
                                                className="flex-1 py-2.5 rounded-xl bg-[#F4F1ED] text-[#8C857B] text-xs font-bold active:scale-[0.98] transition-all"
                                            >
                                                取消
                                            </button>
                                            <button
                                                onClick={() => { handleAddPayment(); setIsPaymentExpanded(false); }}
                                                className={`flex-[2] py-2.5 rounded-xl ${TAILWIND_COLORS.sageGreen} text-white text-xs font-bold shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1`}
                                            >
                                                <Icon name="add" size={14} />
                                                確認新增
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Payment Records */}
                    {(project.payments || []).length > 0 && (
                        <div className="px-5 pb-4 space-y-1">
                            <div className="border-t border-[#EAE3DA]/50 pt-3" />
                            {[...(project.payments || [])].reverse().map((p: any) => (
                                <div key={p.id}>
                                    <div className="flex justify-between items-center bg-[#F9F8F6]/50 px-3 py-2.5 rounded-xl">
                                        <div className="overflow-hidden flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold font-mono text-[#4A443C]">{formatCurrency(p.amount)}</span>
                                                <span className="text-[8px] text-[#8C857B] opacity-50 bg-[#D4C3B3]/20 px-1.5 py-0.5 rounded">{new Date(p.date).toLocaleDateString()}</span>
                                            </div>
                                            {p.note && <p className="text-[10px] text-[#8C857B] mt-0.5 truncate opacity-60">{p.note}</p>}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentDeleteTarget(paymentDeleteTarget === p.id ? null : p.id)}
                                            className={`p-1.5 transition-all ${paymentDeleteTarget === p.id ? 'text-[#C87965] opacity-100' : 'text-[#C87965] opacity-30 hover:opacity-70'}`}
                                        >
                                            <Icon name="close" size={14} />
                                        </button>
                                    </div>

                                    {/* Delete confirm strip */}
                                    <AnimatePresence>
                                        {paymentDeleteTarget === p.id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.15 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="flex items-center justify-end gap-2 px-2.5 py-1.5 bg-[#FDF5F3] rounded-xl border border-[#C87965]/20 mt-1 mb-0.5">
                                                    <span className="text-[9px] text-[#C87965] opacity-70 mr-auto">確認刪除此筆收款？</span>
                                                    <button
                                                        onClick={() => setPaymentDeleteTarget(null)}
                                                        className="text-[10px] px-3 py-1 rounded-lg bg-[#F4F1ED] text-[#8C857B] font-bold"
                                                    >取消</button>
                                                    <button
                                                        onClick={() => handleRemovePayment(p.id)}
                                                        className="text-[10px] px-3 py-1 rounded-lg bg-[#C87965] text-white font-bold"
                                                    >刪除</button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


            </div>

            <div className="fixed bottom-24 right-5 z-20">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setIsAddTaskOpen(true)}
                    className="w-14 h-14 bg-[#4A443C] text-[#F9F8F6] rounded-full shadow-lg flex items-center justify-center transition-shadow"
                >
                    <Icon name="add" size={28} />
                </motion.button>
            </div>

            <AnimatePresence>
                {isAddTaskOpen && (
                    <AddTaskModal onClose={() => setIsAddTaskOpen(false)} user={user} tasksRef={tasksRef} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isEditProjectOpen && (
                    <EditProjectModal
                        onClose={() => setIsEditProjectOpen(false)}
                        user={user}
                        project={project}
                        projectRef={projectRef}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {bottomSheet.isOpen && bottomSheet.type === 'log_time' && (
                    <LogTimeModal
                        onClose={() => setBottomSheet({ isOpen: false, type: null, data: null })}
                        user={user}
                        task={bottomSheet.data}
                        projectId={project?.id}
                    />
                )}
                {bottomSheet.isOpen && bottomSheet.type === 'edit_task' && (
                    <EditTaskModal
                        onClose={() => setBottomSheet({ isOpen: false, type: null, data: null })}
                        user={user}
                        project={{ ...project, userId: user?.uid }}
                        task={bottomSheet.data}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isMenuOpen && (
                    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative bg-[#F9F8F6] rounded-t-[40px] p-8 pb-10 shadow-2xl border-t border-white/50"
                        >
                            <div className="w-12 h-1.5 bg-[#D4C3B3] rounded-full mx-auto mb-8 opacity-50" />
                            <h2 className={`text-2xl font-bold mb-1 ${TAILWIND_COLORS.textPrimary} tracking-tight`}>{project.name}</h2>
                            <p className={`text-[10px] uppercase tracking-widest font-black mb-8 ${TAILWIND_COLORS.textSecondary} opacity-50`}>
                                {project.status === 'completed' ? '已完成' : '進行中'}
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        setIsEditProjectOpen(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm bg-white border border-[#EAE3DA] ${TAILWIND_COLORS.textPrimary} shadow-sm active:scale-95 transition-all`}
                                >
                                    <Icon name="edit" size={20} />
                                    編輯專案資訊
                                </button>
                                <button
                                    onClick={handleToggleProjectStatus}
                                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm bg-white border border-[#EAE3DA] ${TAILWIND_COLORS.textPrimary} shadow-sm active:scale-95 transition-all outline-none`}
                                >
                                    <Icon name={project.status === 'completed' ? 'restart_alt' : 'task_alt'} size={20} />
                                    {project.status === 'completed' ? '重啟專案' : '標記為完成'}
                                </button>
                                <button
                                    onClick={handleDeleteProject}
                                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm bg-white border border-[#EAE3DA] text-[#C87965] active:bg-[#C87965]/5 active:scale-95 transition-all outline-none`}
                                >
                                    <Icon name="delete_forever" size={20} />
                                    刪除此專案
                                </button>
                                <button
                                    onClick={() => setIsMenuOpen(false)}
                                    className="w-full py-4 rounded-2xl border border-[#EAE3DA] text-[#8C857B] text-sm font-bold active:bg-[#EAE3DA]/30 transition-colors mt-2"
                                >
                                    取消
                                </button>
                            </div>
                            <div className="h-4" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}

export default function ProjectDetail() {
    return (
        <AuthWrapper>
            <Suspense fallback={<div className="p-10 text-center text-[#B5AEA4] italic">載入中...</div>}>
                <ProjectDetailContent />
            </Suspense>
        </AuthWrapper>
    );
}

const AddTaskModal = ({ onClose, user, tasksRef }: any) => {
    const [name, setName] = useState('');
    const [h, setH] = useState('');
    const [m, setM] = useState('');
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const totalMinutes = (Number(h) || 0) * 60 + (Number(m) || 0);
        const totalHours = totalMinutes / 60;

        try {
            const taskDoc = await addDoc(tasksRef, {
                name: name.trim(),
                isCompleted: false,
                totalMinutes: totalMinutes,
                totalTime: totalHours,
                createdAt: serverTimestamp(),
                lastLogAt: serverTimestamp(),
            });

            if (totalMinutes > 0) {
                // Also create an initial log
                const logsRef = collection(db, `${tasksRef.path}/${taskDoc.id}/logs`);
                await addDoc(logsRef, {
                    duration: totalMinutes,
                    type: 'initial',
                    note: '初始工時',
                    createdAt: serverTimestamp(),
                });
            }

            setName('');
            setH('');
            setM('');
            onClose();
            showToast('任務已新增');
        } catch (error) {
            showToast('新增失敗', 'error');
        }
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
                className="relative bg-[#F9F8F6] rounded-t-[40px] p-8 pb-10 shadow-2xl border-t border-white/50"
            >
                <div className="w-12 h-1.5 bg-[#D4C3B3] rounded-full mx-auto mb-8 opacity-50" />
                <h2 className={`text-2xl font-bold mb-6 ${TAILWIND_COLORS.textPrimary} tracking-tight`}>新增子任務</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${TAILWIND_COLORS.textSecondary} opacity-70`}>任務主題</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="例如：設計首頁 UI"
                            className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888] transition-colors"
                        />
                    </div>
                    <div className="space-y-4">
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${TAILWIND_COLORS.textSecondary} opacity-70`}>初始工時 (選填)</label>
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    value={h}
                                    onChange={e => setH(e.target.value)}
                                    placeholder="時"
                                    className="w-full bg-[#F9F8F6] border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#8C857B] opacity-40 uppercase tracking-widest pointer-events-none">小時</span>
                            </div>
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    value={m}
                                    onChange={e => setM(e.target.value)}
                                    placeholder="分"
                                    className="w-full bg-[#F9F8F6] border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#8C857B] opacity-40 uppercase tracking-widest pointer-events-none">分鐘</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-12 pb-4">
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-sm active:scale-[0.98] ${name.trim() ? `${TAILWIND_COLORS.sageGreen} text-white` : 'bg-[#EAE3DA] text-[#B5AEA4] cursor-not-allowed'}`}
                        >
                            儲存任務
                        </button>
                    </div>
                    <div className="h-4" />
                </form>
            </motion.div>
        </div>
    );
};

const EditTaskModal = ({ onClose, user, project, task }: any) => {
    const [name, setName] = useState(task.name || task.title || '');
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            const taskDocRef = doc(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}`);
            await updateDoc(taskDocRef, {
                name: name.trim(),
                updatedAt: serverTimestamp(),
            });
            showToast('任務名稱已更新');
            onClose();
        } catch (error) {
            showToast('更新失敗', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative bg-[#F9F8F6] rounded-t-[40px] p-8 pb-10 shadow-2xl border-t border-white/50"
            >
                <div className="w-12 h-1.5 bg-[#D4C3B3] rounded-full mx-auto mb-8 opacity-50" />
                <h2 className={`text-xl font-bold mb-6 ${TAILWIND_COLORS.textPrimary} tracking-tight`}>編輯任務名稱</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${TAILWIND_COLORS.textSecondary} opacity-70`}>任務名稱</label>
                        <input
                            autoFocus
                            type="text" value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888]"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl bg-[#F4F1ED] text-[#8C857B] font-bold text-sm">取消</button>
                        <button
                            type="submit"
                            disabled={!name.trim() || name.trim() === task.name}
                            className={`flex-1 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-sm ${name.trim() && name.trim() !== task.name ? `${TAILWIND_COLORS.sageGreen} text-white` : 'bg-[#EAE3DA] text-[#B5AEA4] cursor-not-allowed'}`}
                        >
                            確認修改
                        </button>
                    </div>
                </form>

                <div className="mt-8 pt-4 border-t border-[#EAE3DA]/30 flex justify-center">
                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm('確定要刪除此任務與所有紀錄嗎？')) {
                                try {
                                    const taskDocRef = doc(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}`);
                                    const projectDocRef = doc(db, `users/${project.userId}/projects/${project.id}`);
                                    await updateDoc(projectDocRef, {
                                        totalMinutes: increment(-(task.totalMinutes || 0))
                                    });
                                    await deleteDoc(taskDocRef);
                                    showToast('已刪除任務');
                                    onClose();
                                } catch {
                                    showToast('刪除失敗', 'error');
                                }
                            }
                        }}
                        className="text-[10px] font-bold text-[#C87965] opacity-40 hover:opacity-100 transition-opacity uppercase tracking-[0.2em] flex items-center gap-1 py-2"
                    >
                        <Icon name="delete_outline" size={14} /> 刪除任務
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const EditProjectModal = ({ onClose, user, project, projectRef }: any) => {
    const [name, setName] = useState(project.name || '');
    const [totalBudget, setTotalBudget] = useState(project.totalBudget || '');
    const [targetRate, setTargetRate] = useState(project.targetRate || '');
    const [startDate, setStartDate] = useState(project.startDate || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(project.endDate || '');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNote, setPaymentNote] = useState('');
    const { showToast } = useToast();

    const handleSave = async () => {
        if (!projectRef || !user) return;

        try {
            await updateDoc(projectRef, {
                name,
                totalBudget: Number(totalBudget) || 0,
                targetRate: Number(targetRate) || 0,
                startDate,
                endDate,
                updatedAt: serverTimestamp(),
            });
            showToast('專案資訊已更新');
            onClose();
        } catch (error) {
            showToast('更新失敗', 'error');
        }
    };

    const handleAddPayment = async () => {
        if (!projectRef || !paymentAmount) return;
        const amount = Number(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            showToast('請輸入有效金額', 'error');
            return;
        }

        const newPayment = {
            amount,
            date: paymentDate,
            note: paymentNote,
            id: Date.now().toString()
        };

        const currentPayments = project.payments || [];
        try {
            await updateDoc(projectRef, {
                payments: [...currentPayments, newPayment]
            });
            setPaymentAmount('');
            setPaymentNote('');
            showToast('已新增收款紀錄');
        } catch (error) {
            showToast('新增收款失敗', 'error');
        }
    };

    const handleRemovePayment = async (paymentId: string) => {
        if (!projectRef) return;
        const currentPayments = project.payments || [];
        try {
            await updateDoc(projectRef, {
                payments: currentPayments.filter((p: any) => p.id !== paymentId)
            });
            showToast('已移除收款紀錄', 'info');
        } catch (error) {
            showToast('移除收款失敗', 'error');
        }
    };

    const handleDeleteProject = async () => {
        if (!user || !projectRef) return;
        if (!window.confirm(`確定要刪除「${project?.name}」嗎？此操作不可還原。`)) return;
        try {
            await deleteDoc(projectRef);
            showToast('專案已刪除', 'info');
            onClose();
            // Optionally redirect or update UI after deletion
            window.location.href = window.location.origin + window.location.pathname.split('caselog')[0] + 'caselog/projects';
        } catch (error) {
            showToast('刪除失敗', 'error');
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
                className="relative bg-[#F9F8F6] rounded-t-[40px] p-8 pb-10 shadow-2xl border-t border-white/50 max-h-[90vh] overflow-y-auto"
            >
                <div className="w-12 h-1.5 bg-[#D4C3B3] rounded-full mx-auto mb-8 opacity-50" />
                <h2 className={`text-2xl font-bold mb-6 ${TAILWIND_COLORS.textPrimary} tracking-tight`}>管理專案詳情</h2>

                <div className="space-y-6">
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${TAILWIND_COLORS.textSecondary} opacity-70`}>專案名稱</label>
                        <input
                            type="text" required value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888]"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <NumberAdjuster
                            label="專案預算 (TWD)"
                            value={totalBudget}
                            onChange={setTotalBudget}
                            step={1000}
                        />
                        <NumberAdjuster
                            label="獨立目標時薪"
                            value={targetRate}
                            onChange={setTargetRate}
                            step={100}
                            unit="TWD/h"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={`block text-[10px] font-black uppercase tracking-widest ${TAILWIND_COLORS.textSecondary} opacity-70`}>開始日期</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-4 py-4 text-xs focus:outline-none focus:border-[#8BA888]"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`block text-[10px] font-black uppercase tracking-widest ${TAILWIND_COLORS.textSecondary} opacity-70`}>結束日期</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-4 py-4 text-xs focus:outline-none focus:border-[#8BA888]"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-[#EAE3DA]">
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ${TAILWIND_COLORS.textSecondary} opacity-70`}>新增收款紀錄</label>

                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <div className="flex-[2] relative">
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                        placeholder="金額"
                                        className="w-full bg-white border border-[#EAE3DA] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#8BA888] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                                <div className="flex-[3]">
                                    <input
                                        type="date"
                                        value={paymentDate}
                                        onChange={e => setPaymentDate(e.target.value)}
                                        className="w-full bg-white border border-[#EAE3DA] rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#8BA888]"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={paymentNote}
                                    onChange={e => setPaymentNote(e.target.value)}
                                    placeholder="備註 (例如：訂金)"
                                    className="flex-1 bg-white border border-[#EAE3DA] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#8BA888]"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddPayment}
                                    className={`w-12 h-10 rounded-xl ${TAILWIND_COLORS.sageGreen} text-white flex items-center justify-center active:scale-95 transition-all shadow-sm shrink-0`}
                                >
                                    <Icon name="add" size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2 max-h-48 overflow-y-auto pr-1">
                            {(project.payments || []).length === 0 ? (
                                <p className="text-center py-4 text-[10px] text-[#B5AEA4] italic">尚未有收款紀錄</p>
                            ) : (
                                [...(project.payments || [])].reverse().map((p: any) => (
                                    <div key={p.id} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-[#EAE3DA]">
                                        <div className="overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold font-mono text-[#4A443C]">{formatCurrency(p.amount)}</p>
                                                <p className="text-[9px] text-[#8C857B] opacity-60 bg-[#D4C3B3]/20 px-1.5 py-0.5 rounded">{new Date(p.date).toLocaleDateString()}</p>
                                            </div>
                                            {p.note && <p className="text-[10px] text-[#8C857B] mt-1 truncate">{p.note}</p>}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePayment(p.id)}
                                            className="p-2 text-[#C87965] active:scale-90 transition-transform flex items-center justify-center shrink-0"
                                        >
                                            <Icon name="delete" size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-[#F4F1ED] text-[#8C857B] text-sm font-bold active:scale-[0.98] transition-all"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className={`flex-1 py-4 rounded-2xl ${TAILWIND_COLORS.sageGreen} text-white text-sm font-bold shadow-md active:scale-[0.98] transition-all`}
                        >
                            儲存變更
                        </button>
                    </div>
                    <div className="mt-8 pt-4 border-t border-[#EAE3DA]/30 flex justify-center">
                        <button
                            type="button"
                            onClick={handleDeleteProject}
                            className="text-[10px] font-bold text-[#C87965] opacity-40 hover:opacity-100 transition-opacity uppercase tracking-[0.2em] flex items-center gap-1 py-2"
                        >
                            <Icon name="delete_forever" size={14} /> 刪除此專案
                        </button>
                    </div>
                    <div className="h-4" />
                </div>
            </motion.div>
        </div>
    );
};

const LogTimeModal = ({ onClose, user, task, projectId }: any) => {
    const { showToast } = useToast();
    const [h, setH] = useState('');
    const [m, setM] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startT, setStartT] = useState('');
    const [endT, setEndT] = useState('');
    const [note, setNote] = useState('');
    const [taskTitle, setTaskTitle] = useState(task.name || task.title || '');

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const totalMinutes = (Number(h) || 0) * 60 + (Number(m) || 0);
        if (!user) return;

        const logsRef = collection(db, `users/${user.uid}/projects/${projectId}/tasks/${task.id}/logs`);
        const taskRef = doc(db, `users/${user.uid}/projects/${projectId}/tasks/${task.id}`);

        try {
            // Update task title if changed
            if (taskTitle !== (task.name || task.title)) {
                await updateDoc(taskRef, {
                    name: taskTitle,
                    title: taskTitle
                });
            }

            // Only add log if duration is > 0
            if (totalMinutes > 0) {
                const totalHours = totalMinutes / 60;
                await addDoc(logsRef, {
                    duration: totalMinutes,
                    date: date,
                    startTimeText: startT,
                    endTimeText: endT,
                    type: 'manual',
                    note,
                    createdAt: serverTimestamp(),
                });

                const projectRef = doc(db, `users/${user.uid}/projects/${projectId}`);
                await updateDoc(taskRef, {
                    totalMinutes: increment(totalMinutes),
                    totalTime: increment(totalHours),
                    lastLogAt: serverTimestamp()
                });
                // Update project-level aggregation
                await updateDoc(projectRef, {
                    totalMinutes: increment(totalMinutes)
                });
                showToast(`已記錄 ${h ? h + '小時' : ''} ${m ? m + '分鐘' : ''}`);
            } else if (taskTitle !== (task.name || task.title)) {
                showToast('任務名稱已更新');
            }

            onClose();
        } catch (error) {
            showToast('更新失敗', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative bg-[#F9F8F6] rounded-t-[40px] p-8 pb-10 shadow-2xl border-t border-white/50 max-h-[90vh] overflow-y-auto"
            >
                <div className="w-12 h-1.5 bg-[#D4C3B3] rounded-full mx-auto mb-8 opacity-50" />
                <h2 className={`text-2xl font-bold mb-8 ${TAILWIND_COLORS.textPrimary} tracking-tight`}>編輯任務與工時</h2>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${TAILWIND_COLORS.textSecondary} opacity-70`}>任務名稱</label>
                        <input
                            type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                            className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888]"
                            placeholder="輸入任務名稱"
                        />
                    </div>

                    <div className="pt-4 border-t border-[#EAE3DA]/50">
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ${TAILWIND_COLORS.textSecondary} opacity-70`}>新增工時紀錄</label>
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 relative">
                                <label className="block text-[9px] font-bold opacity-40 uppercase tracking-widest mb-2">日期</label>
                                <input
                                    type="date" value={date} onChange={e => setDate(e.target.value)}
                                    className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888] font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 relative">
                                <label className="block text-[9px] font-bold opacity-40 uppercase tracking-widest mb-2">小時</label>
                                <input
                                    type="number" value={h} onChange={e => setH(e.target.value)}
                                    className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                />
                                <span className="absolute right-4 bottom-5 text-[10px] font-bold text-[#8C857B] opacity-40 uppercase tracking-widest">小時</span>
                            </div>
                            <div className="flex-1 relative">
                                <label className="block text-[9px] font-bold opacity-40 uppercase tracking-widest mb-2">分鐘</label>
                                <input
                                    type="number" value={m} onChange={e => setM(e.target.value)}
                                    className="w-full bg-white border border-[#EAE3DA] rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[#8BA888] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                />
                                <span className="absolute right-4 bottom-5 text-[10px] font-bold text-[#8C857B] opacity-40 uppercase tracking-widest">分鐘</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-[9px] font-bold opacity-40 uppercase tracking-widest mb-2">開始時間</label>
                                <input
                                    type="time" value={startT} onChange={e => setStartT(e.target.value)}
                                    className="w-full bg-white border border-[#EAE3DA] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8BA888] font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold opacity-40 uppercase tracking-widest mb-2">結束時間</label>
                                <input
                                    type="time" value={endT} onChange={e => setEndT(e.target.value)}
                                    className="w-full bg-white border border-[#EAE3DA] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8BA888] font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] font-bold opacity-40 uppercase tracking-widest mb-2">備註</label>
                            <textarea
                                value={note} onChange={e => setNote(e.target.value)}
                                placeholder="紀錄做了什麼..."
                                rows={2}
                                className="w-full bg-white border border-[#EAE3DA] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8BA888] resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-5 rounded-[24px] bg-[#F4F1ED] text-[#8C857B] font-bold text-lg active:scale-[0.98] transition-all"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className={`flex-1 py-5 rounded-[24px] ${TAILWIND_COLORS.sageGreen} text-white font-bold text-lg shadow-xl shadow-[#8BA888]/20 active:scale-[0.98] transition-all`}
                        >
                            儲存紀錄
                        </button>
                    </div>
                    <div className="h-4" />
                </form>
            </motion.div>
        </div>
    );
};

