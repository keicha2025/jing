'use client';

import React, { useState, useRef } from 'react';
import { TAILWIND_COLORS } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, Timestamp, doc, deleteDoc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';

const Icon = ({ name, className = '', size = 24 }: { name: string, className?: string, size?: number }) => (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>{name}</span>
);

const fmtMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.floor(min % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Inline add-log form inside expanded task
function InlineLogForm({ project, task, onDone }: any) {
    const { showToast } = useToast();
    const [h, setH] = useState('');
    const [m, setM] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startT, setStartT] = useState('');
    const [endT, setEndT] = useState('');
    const [note, setNote] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const totalMinutes = (Number(h) || 0) * 60 + (Number(m) || 0);
        if (totalMinutes === 0) { showToast('請輸入時長', 'error'); return; }

        const logsRef = collection(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}/logs`);
        const taskDocRef = doc(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}`);

        try {
            const projectDocRef = doc(db, `users/${project.userId}/projects/${project.id}`);
            await addDoc(logsRef, {
                duration: totalMinutes,
                date,
                startTimeText: startT,
                endTimeText: endT,
                note,
                type: 'manual',
                createdAt: serverTimestamp(),
            });
            await updateDoc(taskDocRef, {
                totalMinutes: increment(totalMinutes),
                totalTime: increment(totalMinutes / 60),
                lastLogAt: serverTimestamp()
            });
            // Update project-level aggregation
            await updateDoc(projectDocRef, {
                totalMinutes: increment(totalMinutes)
            });
            showToast(`已新增 ${fmtMin(totalMinutes)}`);
            onDone();
        } catch {
            showToast('新增失敗', 'error');
        }
    };

    return (
        <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="overflow-hidden mt-2 bg-white/60 rounded-xl p-3 border border-[#EAE3DA]/60 space-y-2"
        >
            <div className="space-y-2">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <label className="block text-[8px] font-bold opacity-30 uppercase tracking-widest mb-1 ml-1">日期</label>
                        <input
                            type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full bg-[#F9F8F6] border border-[#EAE3DA] rounded-lg px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:border-[#8BA888]"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Hours */}
                    <div className="relative flex-1">
                        <input
                            type="number" value={h} onChange={e => setH(e.target.value)}
                            placeholder="0"
                            className="w-full bg-[#F9F8F6] border border-[#EAE3DA] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#8BA888] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#8C857B] opacity-50 pointer-events-none">h</span>
                    </div>
                    {/* Minutes */}
                    <div className="relative flex-1">
                        <input
                            type="number" value={m} onChange={e => setM(e.target.value)}
                            placeholder="0"
                            className="w-full bg-[#F9F8F6] border border-[#EAE3DA] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#8BA888] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#8C857B] opacity-50 pointer-events-none">m</span>
                    </div>
                    {/* Time range */}
                    <input type="time" value={startT} onChange={e => setStartT(e.target.value)}
                        className="flex-1 bg-[#F9F8F6] border border-[#EAE3DA] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none focus:border-[#8BA888]" />
                    <input type="time" value={endT} onChange={e => setEndT(e.target.value)}
                        className="flex-1 bg-[#F9F8F6] border border-[#EAE3DA] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none focus:border-[#8BA888]" />
                </div>
            </div>
            <div className="flex gap-2">
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="備註 (選填)"
                    className="flex-1 bg-[#F9F8F6] border border-[#EAE3DA] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#8BA888]" />
                <button type="button" onClick={(e) => { e.stopPropagation(); onDone(); }}
                    className="px-3 py-2 text-xs rounded-lg bg-[#F4F1ED] text-[#8C857B] font-bold">取消</button>
                <button type="submit"
                    className={`px-4 py-2 text-xs rounded-lg ${TAILWIND_COLORS.sageGreen} text-white font-bold`}>儲存</button>
            </div>
        </motion.form>
    );
}

// Inline edit-log form
function EditLogForm({ log, project, task, onDone }: any) {
    const { showToast } = useToast();
    const [h, setH] = useState(String(Math.floor((log.duration || 0) / 60)));
    const [m, setM] = useState(String((log.duration || 0) % 60));
    const [date, setDate] = useState(log.date || (log.createdAt instanceof Timestamp ? log.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]));
    const [startT, setStartT] = useState(log.startTimeText || '');
    const [endT, setEndT] = useState(log.endTimeText || '');
    const [note, setNote] = useState(log.note || '');

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newTotalMinutes = (Number(h) || 0) * 60 + (Number(m) || 0);
        const diff = newTotalMinutes - (log.duration || 0);

        const logDocRef = doc(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}/logs/${log.id}`);
        const taskDocRef = doc(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}`);
        const projectDocRef = doc(db, `users/${project.userId}/projects/${project.id}`);

        try {
            await updateDoc(logDocRef, {
                duration: newTotalMinutes,
                date,
                startTimeText: startT,
                endTimeText: endT,
                note
            });
            await updateDoc(taskDocRef, {
                lastLogAt: serverTimestamp()
            });
            if (diff !== 0) {
                await updateDoc(taskDocRef, {
                    totalMinutes: increment(diff),
                    totalTime: increment(diff / 60),
                });
                await updateDoc(projectDocRef, {
                    totalMinutes: increment(diff)
                });
            }
            showToast('已更新工時紀錄');
            onDone();
        } catch {
            showToast('更新失敗', 'error');
        }
    };

    return (
        <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            onSubmit={handleUpdate}
            onClick={(e) => e.stopPropagation()}
            className="overflow-hidden mt-1 mb-2 bg-[#8BA888]/5 rounded-xl p-3 border border-[#8BA888]/20 space-y-2"
        >
            <div className="space-y-2">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <label className="block text-[8px] font-bold opacity-30 uppercase tracking-widest mb-1 ml-1">日期</label>
                        <input
                            type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full bg-white border border-[#EAE3DA] rounded-lg px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:border-[#8BA888]"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input type="number" value={h} onChange={e => setH(e.target.value)} placeholder="0" className="w-full bg-white border border-[#EAE3DA] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#8BA888] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#8C857B] opacity-50">h</span>
                    </div>
                    <div className="relative flex-1">
                        <input type="number" value={m} onChange={e => setM(e.target.value)} placeholder="0" className="w-full bg-white border border-[#EAE3DA] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#8BA888] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#8C857B] opacity-50">m</span>
                    </div>
                    <input type="time" value={startT} onChange={e => setStartT(e.target.value)} className="flex-1 bg-white border border-[#EAE3DA] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none" />
                    <input type="time" value={endT} onChange={e => setEndT(e.target.value)} className="flex-1 bg-white border border-[#EAE3DA] rounded-lg px-2 py-2 text-xs font-mono focus:outline-none" />
                </div>
            </div>
            <div className="flex gap-2 items-center">
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="備註" className="flex-1 bg-white border border-[#EAE3DA] rounded-lg px-3 py-2 text-xs" />
                <button
                    type="button"
                    onClick={async () => {
                        if (window.confirm('確定要刪除此筆紀錄嗎？')) {
                            try {
                                const logDocRef = doc(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}/logs/${log.id}`);
                                const taskDocRef = doc(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}`);
                                const projectDocRef = doc(db, `users/${project.userId}/projects/${project.id}`);
                                await deleteDoc(logDocRef);
                                await updateDoc(taskDocRef, {
                                    totalMinutes: increment(-(log.duration || 0)),
                                    totalTime: increment(-(log.duration || 0) / 60),
                                    lastLogAt: serverTimestamp()
                                });
                                await updateDoc(projectDocRef, { totalMinutes: increment(-(log.duration || 0)) });
                                showToast('已刪除紀錄');
                                onDone();
                            } catch { showToast('刪除失敗', 'error'); }
                        }
                    }}
                    className="text-[10px] font-bold text-[#C87965] opacity-60 hover:opacity-100 px-2 flex items-center gap-0.5"
                >
                    <Icon name="delete" size={13} /> 刪除
                </button>
                <div className="flex-1" />
                <button type="button" onClick={onDone} className="flex-1 py-2 text-xs rounded-lg bg-white border border-[#EAE3DA] text-[#8C857B] font-bold">取消</button>
                <button type="submit" className={`flex-1 py-2 text-xs rounded-lg ${TAILWIND_COLORS.sageGreen} text-white font-bold`}>更新</button>
            </div>
        </motion.form>
    );
}

export default function SwipeableTask({ task, project, onEdit, onToggleStatus }: any) {
    const { showToast } = useToast();
    const [swiped, setSwiped] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAddingLog, setIsAddingLog] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [longPressTarget, setLongPressTarget] = useState<string | null>(null);
    const [logEditingId, setLogEditingId] = useState<string | null>(null);
    const [isDeletingTask, setIsDeletingTask] = useState(false);
    // Track if we're actually doing a longpress (to prevent tap from toggling expand)
    const isLongPress = useRef(false);

    const logsRef = collection(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}/logs`);
    const logsQuery = query(logsRef, orderBy('createdAt', 'desc'));
    const [logsSnap] = useCollection(logsQuery);
    const logs = logsSnap?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

    const handleDeleteTask = async () => {
        if (!project.userId || !project.id) return;
        try {
            const taskDocRef = doc(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}`);
            // Subtract tasks minutes from project summary before deleting
            const projectDocRef = doc(db, `users/${project.userId}/projects/${project.id}`);
            await updateDoc(projectDocRef, {
                totalMinutes: increment(-(task.totalMinutes || 0))
            });
            await deleteDoc(taskDocRef);
            showToast('已刪除任務', 'info');
        } catch {
            showToast('刪除失敗', 'error');
        }
    };

    // Always compute real total from live logs
    const realTotalMinutes = logs.reduce((acc: number, l: any) => acc + (l.duration || 0), 0);

    const minSwipeDistance = 50;

    const onTouchStartCard = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };
    const onTouchMoveCard = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
    const onTouchEndCard = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (distance > minSwipeDistance) setSwiped(-1);
        else if (distance < -minSwipeDistance) { onToggleStatus(task.id, !task.isCompleted); setSwiped(0); }
        else { if (Math.abs(distance) < 5 && !longPressTarget) setIsExpanded(!isExpanded); setSwiped(0); }
    };

    const handleLogLongPressStart = (e: React.SyntheticEvent, logId: string) => {
        e.stopPropagation();
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            setLongPressTarget(logId);
        }, 500);
    };
    const handleLogLongPressEnd = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    const handleDeleteLog = async (log: any) => {
        if (!project.userId || !project.id) return;
        try {
            const logDocRef = doc(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}/logs/${log.id}`);
            const taskDocRef = doc(db, `users/${project.userId}/projects/${project.id}/tasks/${task.id}`);
            const projectDocRef = doc(db, `users/${project.userId}/projects/${project.id}`);
            await deleteDoc(logDocRef);
            await updateDoc(taskDocRef, {
                totalMinutes: increment(-(log.duration || 0)),
                totalTime: increment(-((log.duration || 0) / 60)),
            });
            // Update project-level aggregation
            await updateDoc(projectDocRef, {
                totalMinutes: increment(-(log.duration || 0))
            });
            showToast('已移除工時紀錄', 'info');
        } catch {
            showToast('刪除失敗', 'error');
        }
        setLongPressTarget(null);
    };

    return (
        // Outer dismissal layer — clicking outside the log confirm closes it
        <div
            className="relative mb-3 rounded-xl overflow-hidden bg-[#EAE3DA]"
            onClick={() => { if (longPressTarget) setLongPressTarget(null); }}
        >
            {/* Swipe action background */}
            <div className={`absolute inset-0 flex justify-end items-center px-4 gap-2`}>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(task); setSwiped(0); }}
                    className="text-[#4A443C] text-[10px] font-bold flex flex-col items-center justify-center w-12 h-12 bg-white/40 rounded-xl"
                >
                    <Icon name="edit" size={16} />
                    編輯
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsDeletingTask(true); setSwiped(0); }}
                    className="text-[#C87965] text-[10px] font-bold flex flex-col items-center justify-center w-12 h-12 bg-[#C87965]/10 rounded-xl"
                >
                    <Icon name="delete" size={16} />
                    刪除
                </button>
            </div>

            {/* Main Card */}
            <div
                className={`${TAILWIND_COLORS.card} rounded-xl p-4 relative transition-transform duration-200 ease-out border ${TAILWIND_COLORS.border} cursor-pointer shadow-sm group`}
                style={{ transform: `translateX(${swiped === -1 ? '-120px' : '0'})` }}
                onTouchStart={onTouchStartCard}
                onTouchMove={onTouchMoveCard}
                onTouchEnd={onTouchEndCard}
                onClick={(e) => {
                    if (longPressTarget || logEditingId || isDeletingTask) { e.stopPropagation(); return; }
                    setIsExpanded(!isExpanded);
                }}
            >
                {/* Task header row */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 overflow-hidden flex-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleStatus(task.id, !task.isCompleted); }}
                            className="shrink-0"
                        >
                            {task.isCompleted ? (
                                <Icon name="check_circle" className="text-[#8BA888]" size={20} />
                            ) : (
                                <Icon name="radio_button_unchecked" className={TAILWIND_COLORS.textSecondary} size={20} />
                            )}
                        </button>
                        <div className="truncate flex-1">
                            <p className={`text-sm tracking-wide truncate font-medium ${task.isCompleted ? 'line-through text-[#B5AEA4]' : TAILWIND_COLORS.textPrimary}`}>
                                {task.name || task.title}
                            </p>
                            {realTotalMinutes > 0 && (
                                <p className={`text-[10px] mt-0.5 font-mono ${TAILWIND_COLORS.textSecondary}`}>
                                    已投入 {fmtMin(realTotalMinutes)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Stats & Permanent Desktop Edit */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                            {logs.length > 0 && (
                                <span className="text-[8px] font-bold text-[#8C857B] opacity-40 bg-[#EAE3DA]/50 px-1.5 py-0.5 rounded italic">
                                    {logs.length}筆
                                </span>
                            )}
                            <Icon name={isExpanded ? "expand_less" : "expand_more"} size={18} className="text-[#8C857B] opacity-20" />
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                            className="hidden md:flex text-[#8C857B] hover:text-[#8BA888] opacity-60 hover:opacity-100 transition-all p-2 active:scale-90"
                        >
                            <Icon name="edit" size={18} />
                        </button>
                    </div>
                </div>

                {/* Expanded: log list + inline add form */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mt-3 pt-3 border-t border-[#EAE3DA]/50 space-y-1">

                                {/* Add log button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsAddingLog(!isAddingLog); }}
                                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold text-[#8BA888] border border-dashed border-[#8BA888]/30 hover:border-[#8BA888]/60 transition-colors mb-2"
                                >
                                    <Icon name="add" size={13} />
                                    新增工時紀錄
                                </button>

                                <AnimatePresence>
                                    {isAddingLog && (
                                        <InlineLogForm
                                            project={project}
                                            task={task}
                                            onDone={() => setIsAddingLog(false)}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Log rows */}
                                {logs.length === 0 ? (
                                    <p className="text-[10px] text-[#B5AEA4] italic opacity-60 text-center py-2">尚未有工時紀錄</p>
                                ) : (
                                    logs.map((log: any) => (
                                        <div key={log.id} className="space-y-0">
                                            {/* Info row */}
                                            <div
                                                className={`flex items-center gap-2 py-2 px-2.5 rounded-lg transition-colors group/log ${longPressTarget === log.id ? 'bg-[#C87965]/8' : 'bg-[#F9F8F6]/60'}`}
                                                onTouchStart={(e) => handleLogLongPressStart(e, log.id)}
                                                onTouchEnd={(e) => handleLogLongPressEnd(e)}
                                                onMouseDown={(e) => handleLogLongPressStart(e, log.id)}
                                                onMouseUp={(e) => handleLogLongPressEnd(e)}
                                                onMouseLeave={(e) => handleLogLongPressEnd(e)}
                                            >
                                                <span className="text-[10px] font-mono font-bold text-[#4A443C] w-11 shrink-0">{fmtMin(log.duration || 0)}</span>
                                                <span className="text-[9px] text-[#8C857B] opacity-50 shrink-0">
                                                    {log.date ? (
                                                        <span className="bg-[#8BA888]/10 text-[#8BA888] px-1.5 py-0.5 rounded font-black">{log.date}</span>
                                                    ) : log.createdAt instanceof Timestamp
                                                        ? log.createdAt.toDate().toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                        : '剛剛'}
                                                </span>
                                                {log.startTimeText && (
                                                    <span className="text-[8px] font-mono text-[#D4C3B3] bg-[#4A443C]/5 px-1 py-0.5 rounded shrink-0">
                                                        {log.startTimeText}~{log.endTimeText || '?'}
                                                    </span>
                                                )}
                                                {log.note && (
                                                    <span className="text-[9px] text-[#8C857B] truncate flex-1 opacity-60 ml-1">{log.note}</span>
                                                )}

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setLogEditingId(log.id); }}
                                                    className="hidden md:block text-[#8C857B] opacity-30 hover:opacity-80 transition-all ml-2"
                                                >
                                                    <Icon name="edit" size={14} />
                                                </button>
                                            </div>

                                            {/* Action / Delete confirm strip */}
                                            <AnimatePresence>
                                                {longPressTarget === log.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="overflow-hidden"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="flex items-center justify-end gap-2 px-2.5 py-1.5 bg-[#FDF5F3] rounded-lg border border-[#C87965]/20 mb-1 mt-0.5">
                                                            <span className="text-[9px] text-[#C87965] opacity-70 mr-auto font-bold uppercase tracking-wider">工時紀錄操作</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setLogEditingId(log.id); setLongPressTarget(null); }}
                                                                className="flex-1 text-[10px] py-1.5 rounded-lg bg-white text-[#8BA888] font-black border border-[#8BA888]/20"
                                                            >編輯</button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteLog(log); }}
                                                                className="flex-1 text-[10px] py-1.5 rounded-lg bg-[#C87965] text-white font-black"
                                                            >刪除</button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setLongPressTarget(null); }}
                                                                className="flex-1 text-[10px] py-1.5 rounded-lg bg-[#F4F1ED] text-[#8C857B] font-bold"
                                                            >取消</button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Edit Log Form */}
                                            <AnimatePresence>
                                                {logEditingId === log.id && (
                                                    <EditLogForm
                                                        log={log}
                                                        project={project}
                                                        task={task}
                                                        onDone={() => setLogEditingId(null)}
                                                    />
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Task Delete Confirmation Overlay */}
            <AnimatePresence>
                {isDeletingTask && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#4A443C]/20 backdrop-blur-sm"
                        onClick={() => setIsDeletingTask(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[32px] p-8 w-full max-w-xs shadow-2xl border border-[#EAE3DA]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 rounded-full bg-[#C87965]/10 flex items-center justify-center text-[#C87965] mb-6 mx-auto">
                                <Icon name="error" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-[#4A443C] text-center mb-2">刪除任務？</h3>
                            <p className="text-sm text-[#8C857B] text-center mb-8 leading-relaxed">這將永久刪除「{task.name || task.title}」及其所有工時紀錄，且無法復原。</p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(); }}
                                    className="w-full py-4 rounded-2xl bg-[#C87965] text-white text-sm font-black shadow-lg shadow-[#C87965]/20 active:scale-95 transition-all"
                                >
                                    確認刪除
                                </button>
                                <button
                                    onClick={() => setIsDeletingTask(false)}
                                    className="w-full py-4 rounded-2xl bg-[#F4F1ED] text-[#8C857B] text-sm font-bold active:scale-95 transition-all"
                                >
                                    我再想想
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

    );
}
