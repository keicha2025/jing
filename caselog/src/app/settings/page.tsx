'use client';

import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocument } from 'react-firebase-hooks/firestore';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDocs, collection, query, orderBy } from 'firebase/firestore';
import { TAILWIND_COLORS } from '@/lib/constants';
import AuthWrapper from '@/components/AuthWrapper';
import { useToast } from '@/context/ToastContext';
import * as XLSX from 'xlsx';

const Icon = ({ name, className = '', size = 24 }: { name: string, className?: string, size?: number }) => (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
);

export default function SettingsPage() {
    const [user] = useAuthState(auth);
    const { showToast } = useToast();
    const settingsRef = user ? doc(db, `users/${user.uid}/settings/profile`) : null;
    const [settingsSnap] = useDocument(settingsRef);

    const [targetRate, setTargetRate] = useState('1000');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (settingsSnap?.exists()) {
            setTargetRate(settingsSnap.data().targetRate?.toString() || '1000');
        }
    }, [settingsSnap]);

    const handleSave = async () => {
        if (!user || !settingsRef) return;
        try {
            await setDoc(settingsRef, {
                targetRate: Number(targetRate),
                updatedAt: new Date(),
            }, { merge: true });
            showToast('設定已儲存');
        } catch (error) {
            showToast('儲存失敗', 'error');
        }
    };

    const handleExport = async () => {
        if (!user) return;
        setIsExporting(true);
        showToast('準備匯出中...', 'info');

        try {
            const projectsRef = collection(db, `users/${user.uid}/projects`);
            const projectsSnap = await getDocs(projectsRef);

            if (projectsSnap.empty) {
                showToast('查無專案資料', 'error');
                setIsExporting(false);
                return;
            }

            const wb = XLSX.utils.book_new();
            const usedNames = new Set<string>();

            for (const projectDoc of projectsSnap.docs) {
                const projectData = projectDoc.data();
                const projectName = projectData.name || projectDoc.id;

                const baseName = projectName.replace(/[\\?*:[\]/]/g, '').trim().slice(0, 31) || 'Project';
                let finalName = baseName;
                let counter = 1;
                while (usedNames.has(finalName)) {
                    const suffix = `_${counter}`;
                    finalName = baseName.slice(0, 31 - suffix.length) + suffix;
                    counter++;
                }
                usedNames.add(finalName);

                // Fetch tasks for this project, sorted by latest log or creation
                const tasksRef = collection(db, `users/${user.uid}/projects/${projectDoc.id}/tasks`);
                const tasksSnap = await getDocs(tasksRef);

                // Sort tasks locally to match the UI ranking (latest log first)
                const sortedTasks = tasksSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as any))
                    .sort((a, b) => {
                        const dateA = a.latestLogDate || "";
                        const dateB = b.latestLogDate || "";
                        if (dateA !== dateB) return dateB.localeCompare(dateA);
                        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                    });

                const wsData: any[] = [];

                for (const task of sortedTasks) {
                    // Task Header Row
                    wsData.push({
                        '層級': '任務 (Task)',
                        '任務/工時日期': task.name || task.title || '未命名任務',
                        '時長(分鐘)': task.totalMinutes || 0,
                        '備註': '--- 任務總計 ---'
                    });

                    // Fetch logs for this task, sorted by date
                    const logsRef = collection(db, `users/${user.uid}/projects/${projectDoc.id}/tasks/${task.id}/logs`);
                    const logsSnap = await getDocs(query(logsRef, orderBy('date', 'desc')));

                    logsSnap.docs.forEach(logDoc => {
                        const logData = logDoc.data() as any;
                        wsData.push({
                            '層級': '  └─ 工時 (Log)',
                            '任務/工時日期': logData.date || '-',
                            '時長(分鐘)': logData.duration || 0,
                            '備註': logData.note || ''
                        });
                    });

                    // Spacer row for better visibility
                    wsData.push({});
                }

                // If no logs at all
                const finalWsData = wsData.length > 0 ? wsData : [{ '訊息': '尚無任何任務或工時紀錄' }];
                const ws = XLSX.utils.json_to_sheet(finalWsData);

                // Optional: Column widths for better UX
                ws['!cols'] = [
                    { wch: 15 }, // 層級
                    { wch: 30 }, // 任務/工時日期
                    { wch: 12 }, // 時長
                    { wch: 50 }, // 備註
                ];

                XLSX.utils.book_append_sheet(wb, ws, finalName);
            }

            const filename = `Caselog_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            showToast('匯出成功');
        } catch (error) {
            console.error('Export Error:', error);
            showToast('匯出失敗，請再試一次', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <AuthWrapper>
            <div className={`min-h-screen ${TAILWIND_COLORS.bg} px-5 py-6 max-w-lg mx-auto`}>
                <header className="mb-8 mt-4 flex justify-between items-start">
                    <div>
                        <p className={`${TAILWIND_COLORS.textSecondary} text-[10px] tracking-widest uppercase mb-1 font-bold`}>Settings</p>
                        <h1 className={`${TAILWIND_COLORS.textPrimary} text-3xl font-medium tracking-tight`}>個人設定</h1>
                    </div>
                    <button
                        onClick={() => auth.signOut()}
                        className="w-10 h-10 flex items-center justify-center text-[#4A443C]/60 active:scale-90 transition-all"
                    >
                        <Icon name="logout" size={26} />
                    </button>
                </header>

                <div className="space-y-6 max-w-md mx-auto">
                    <section className={`${TAILWIND_COLORS.card} p-6 rounded-3xl border ${TAILWIND_COLORS.border} shadow-sm transition-all active:shadow-none`}>
                        <div className="flex items-center mb-5">
                            <div className={`w-8 h-8 rounded-full ${TAILWIND_COLORS.wood} flex items-center justify-center mr-3`}>
                                <Icon name="payments" size={18} className={TAILWIND_COLORS.textPrimary} />
                            </div>
                            <h2 className={`text-sm font-semibold ${TAILWIND_COLORS.textPrimary}`}>個人標竿</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className={`block text-[10px] mb-2 font-bold uppercase tracking-wider ${TAILWIND_COLORS.textSecondary}`}>期望平均時薪 (TWD/h)</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTargetRate(prev => Math.max(0, Number(prev) - 100).toString())}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#EAE3DA] bg-white active:scale-90 transition-all text-[#8C857B] shadow-sm"
                                    >
                                        <Icon name="remove" size={18} />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <input
                                            type="number"
                                            value={targetRate}
                                            onChange={e => setTargetRate(e.target.value)}
                                            className="w-full bg-white border border-[#EAE3DA] rounded-xl px-2 py-2.5 h-10 text-center text-sm focus:outline-none focus:border-[#8BA888] font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="1000"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setTargetRate(prev => (Number(prev) + 100).toString())}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#EAE3DA] bg-white active:scale-90 transition-all text-[#8C857B] shadow-sm"
                                    >
                                        <Icon name="add" size={18} />
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-white ${TAILWIND_COLORS.sageGreen} shadow-lg shadow-[#8BA888]/20 active:scale-95 transition-all ml-1 shrink-0`}
                                    >
                                        <Icon name="save" size={18} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-[#8C857B] mt-3 leading-relaxed opacity-80">
                                    此數值將作為新專案的預設目標，幫助您在報價與執行時即時監控損益平衡。
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className={`${TAILWIND_COLORS.card} p-6 rounded-3xl border ${TAILWIND_COLORS.border} shadow-sm`}>
                        <div className="flex items-center mb-5">
                            <div className={`w-8 h-8 rounded-full ${TAILWIND_COLORS.wood} flex items-center justify-center mr-3`}>
                                <Icon name="storage" size={18} className={TAILWIND_COLORS.textPrimary} />
                            </div>
                            <h2 className={`text-sm font-semibold ${TAILWIND_COLORS.textPrimary}`}>數據管理</h2>
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className={`w-full py-4 rounded-2xl border border-[#D4C3B3] text-[#4A443C] text-sm font-bold flex items-center justify-center active:bg-[#D4C3B3]/10 transition-colors ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Icon name={isExporting ? "sync" : "download"} size={20} className={`mr-2 ${isExporting ? 'animate-spin' : ''}`} />
                            {isExporting ? '處理中...' : '匯出所有紀錄 (Excel)'}
                        </button>
                    </section>

                    <div className="h-10" />
                </div>
            </div>
        </AuthWrapper>
    );
}
