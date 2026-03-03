import { useState, useEffect, useMemo } from 'react';
import { auth, functions } from '../firebase';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getMonthlyConfig, getUserSettings, saveUserSettings, getSnapshots, saveMonthlyConfig, saveSnapshot, getLatestSnapshot } from '../services/db';
import { MonthlyConfig, UserSettings, Snapshot, MonthlyConfigItem } from '../types';
import { Target, TrendingUp, PieChart as PieIcon, Save, X, Activity, BarChart2, Plus, Zap, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    BarChart, Bar, Legend, ReferenceLine, LabelList
} from 'recharts';

// Custom Colors for Premium Look
const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#475569', '#334155', '#1e293b', '#64748b', '#94a3b8'];
const CATEGORY_COLORS: { [key: string]: string } = {
    '台股': '#6366f1',
    '美股': '#8b5cf6',
    '基金': '#06b6d4',
    '現金': '#10b981',
    '其他': '#64748b'
};

export default function Dashboard() {
    // --- Data States ---
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Monthly Config Edit States ---
    const [config, setConfig] = useState<MonthlyConfig | null>(null);
    const [idleFundsConfig, setIdleFundsConfig] = useState<{ [key: string]: { amount: number, startMonth: string, endMonth: string } }>({
        'TWD': { amount: 0, startMonth: '', endMonth: '' },
        'USD': { amount: 0, startMonth: '', endMonth: '' },
        'JPY': { amount: 0, startMonth: '', endMonth: '' }
    });
    const [items, setItems] = useState<MonthlyConfigItem[]>([]);
    const [rationale, setRationale] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [showExecutionBanner, setShowExecutionBanner] = useState(false);

    // --- Generic UI States ---
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [tempGoal, setTempGoal] = useState<number>(0);
    const [confirmModal, setConfirmModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [visibleCurrencies, setVisibleCurrencies] = useState<string[]>(['TWD']);

    const formatDisplayAmount = (val: number) => {
        if (val >= 10000) {
            const units = val / 10000;
            return `${units.toLocaleString(undefined, { maximumFractionDigits: 1 })} 萬`;
        }
        return val.toLocaleString();
    };

    // --- Dynamic Calculation Logic ---
    const remainingFundsByCurrency = useMemo(() => {
        const remaining: { [key: string]: number } = {};
        const currencies = ['TWD', 'USD', 'JPY'];

        currencies.forEach(cur => {
            const plan = idleFundsConfig[cur];
            const startStr = plan?.startMonth;
            const endStr = plan?.endMonth;
            let months = 0;
            if (startStr && endStr) {
                const [y1, m1] = startStr.split('-').map(Number);
                const [y2, m2] = endStr.split('-').map(Number);
                months = (y2 - y1) * 12 + (m2 - m1) + 1;
            }

            const monthlyIdle = months > 0 ? (plan.amount / months) : 0;
            const allocated = items.filter(i => i.currency === cur).reduce((sum, i) => sum + i.amount, 0);
            remaining[cur] = monthlyIdle - allocated;
        });
        return remaining;
    }, [idleFundsConfig, items]);

    const thisMonthTotalInBase = useMemo(() => {
        return items.reduce((sum, i) => {
            const rate = i.currency === 'USD' ? (settings?.manualExchangeRates?.['USD'] || 33) :
                i.currency === 'JPY' ? (settings?.manualExchangeRates?.['JPY'] || 0.22) : 1;
            return sum + (i.amount * rate);
        }, 0);
    }, [items, settings]);

    const poolProgress = useMemo(() => {
        if (!settings?.financialGoal) return 0;
        // Total assets (approximate) from snapshots + current settings progress could be complex
        // For now, let's just show progress towards financialGoal based on latest snapshot total
        const latestTotal = snapshots.length > 0 ? snapshots[snapshots.length - 1].totalInvestedInBase : 0;
        return (latestTotal / settings.financialGoal) * 100;
    }, [settings, snapshots]);

    const historicalTrendData = useMemo(() => {
        return snapshots.map(s => {
            const categorySum: { [key: string]: number } = {};
            if (s.allocationSnapshot) {
                s.allocationSnapshot.forEach(a => {
                    const rate = a.currency === 'USD' ? (settings?.manualExchangeRates?.['USD'] || 33) :
                        a.currency === 'JPY' ? (settings?.manualExchangeRates?.['JPY'] || 0.22) : 1;
                    const TWDValue = a.amount * rate;
                    const category = CATEGORY_COLORS[a.category] ? a.category : '其他';
                    categorySum[category] = (categorySum[category] || 0) + TWDValue;
                });
            }
            return {
                name: s.yearMonth,
                ...categorySum,
                total: s.totalInvestedInBase || 0
            };
        });
    }, [snapshots, settings]);

    const allocationPieData = useMemo(() => {
        const map: { [key: string]: number } = {};
        items.forEach(i => {
            const rate = i.currency === 'USD' ? (settings?.manualExchangeRates?.['USD'] || 33) :
                i.currency === 'JPY' ? (settings?.manualExchangeRates?.['JPY'] || 0.22) : 1;
            const valInBase = i.amount * rate;
            map[i.category] = (map[i.category] || 0) + valInBase;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [items, settings]);


    useEffect(() => {
        const fetchData = async () => {
            if (auth.currentUser) {
                const [cData, sData, snapData] = await Promise.all([
                    getMonthlyConfig(auth.currentUser.uid),
                    getUserSettings(auth.currentUser.uid),
                    getSnapshots(auth.currentUser.uid)
                ]);
                setSettings(sData);
                setSnapshots(snapData.reverse());

                if (cData) {
                    setConfig(cData);
                    setItems(cData.items || []);
                    setRationale(cData.rationale || '');
                    const funds = cData.idleFundsByCurrency;
                    if (funds) {
                        setIdleFundsConfig(funds);
                        // Determine which currencies should be visible based on stored data
                        const active = Object.keys(funds).filter(cur =>
                            cur === 'TWD' || (funds[cur] && (
                                funds[cur].amount > 0 ||
                                funds[cur].startMonth ||
                                funds[cur].endMonth
                            ))
                        );
                        setVisibleCurrencies(active.length > 0 ? active : ['TWD']);
                    }
                } else {
                    const latestSnap = await getLatestSnapshot(auth.currentUser.uid);
                    if (latestSnap && latestSnap.allocationSnapshot) {
                        setItems(latestSnap.allocationSnapshot.map((a: any) => ({
                            category: a.category,
                            ticker: a.ticker,
                            amount: 0,
                            currency: a.currency
                        })));
                    }
                }
                if (sData) setTempGoal(sData.financialGoal || 10000000);
            }

            // Client-side execution reminder logic
            const today = new Date();
            if (today.getDate() >= 25) {
                setShowExecutionBanner(true);
            }

            setLoading(false);
        };
        fetchData();
    }, [auth.currentUser]);

    const handleSaveConfig = async () => {
        if (!auth.currentUser) return;
        setIsSaving(true);
        try {
            const configData: Partial<MonthlyConfig> = {
                uid: auth.currentUser.uid,
                configName: config?.configName || '本月計畫',
                items,
                rationale,
                idleFundsByCurrency: idleFundsConfig,
                updatedAt: Timestamp.now()
            };
            await saveMonthlyConfig(auth.currentUser.uid, configData);
            setConfig(configData as MonthlyConfig);
            showToast('規劃已儲存');
        } catch (e) {
            console.error(e);
            showToast('儲存失敗', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncPrices = async () => {
        if (!auth.currentUser) return;
        const tickers = items.map(i => i.ticker).filter(t => t);
        if (tickers.length === 0) {
            showToast('請先在配置中輸入標的代碼', 'info');
            return;
        }

        setIsSaving(true);
        try {
            const getPriceFn = httpsCallable(functions, 'getStockPrice');
            // We just sync prices to help the UI estimate things, no holdings to update anymore
            await getPriceFn({ symbols: tickers });
            showToast('已獲取最新市場報價');
        } catch (err) {
            console.error('Sync failed:', err);
            showToast('價格同步失敗', 'error');
        }
        setIsSaving(false);
    };

    const handleExportMarkdown = () => {
        const date = new Date().toLocaleDateString();
        const content = `# JING Finance 投資計畫報告 (${date})

## 💰 預算狀態
- **本月計畫總額 (Plan Total):** $ ${thisMonthTotalInBase.toLocaleString()}
- **目標達成率:** ${poolProgress.toFixed(1)}% ($ ${(snapshots.length > 0 ? snapshots[snapshots.length - 1].totalInvestedInBase : 0).toLocaleString()} / $ ${(settings?.financialGoal || 0).toLocaleString()})

## 📊 配置明細
${items.map(i => `- [${i.category}] ${i.ticker || '未填寫'}: $ ${i.amount.toLocaleString()} (${i.currency})`).join('\n')}

## 🧠 投資心得與風險考量 (Rationale)
${rationale || '本月尚未填寫心得。'}

---
*Generated by JING Insight | 動態投資執行中心*
`;

        navigator.clipboard.writeText(content);
        showToast('報表 Markdown 已複製');
    };

    const handleExecutePlan = async () => {
        if (!auth.currentUser) return;

        setConfirmModal({
            title: '確認執行本月計畫',
            message: '此動作將產生當月投資快照並更新可用投資池進度。您確認要執行嗎？',
            onConfirm: executePlanLogic
        });
    };

    const executePlanLogic = async () => {
        if (!auth.currentUser) return;
        setConfirmModal(null);

        try {
            const now = new Date();
            const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // Calculate total invested in base currency this month
            const currentTotalInvestedInBase = items.reduce((sum, i) => {
                const rate = i.currency === 'USD' ? (settings?.manualExchangeRates?.['USD'] || 33) :
                    i.currency === 'JPY' ? (settings?.manualExchangeRates?.['JPY'] || 0.22) : 1;
                return sum + (i.amount * rate);
            }, 0);

            // 1. Generate Snapshot
            const newSnapshot: Snapshot = {
                uid: auth.currentUser.uid,
                yearMonth,
                totalInvestedInBase: currentTotalInvestedInBase,
                allocationSnapshot: items.map(i => ({ ticker: i.ticker, amount: i.amount, currency: i.currency, category: i.category })),
                isAutoGenerated: false,
                createdAt: Timestamp.now()
            };

            await saveSnapshot(newSnapshot);
            setSnapshots(prev => [...prev, newSnapshot]);

            // 2. Update total investment spent (optional, keeping it for history)
            if (settings && auth.currentUser) {
                const newSpent = (settings.totalInvestmentSpent || 0) + currentTotalInvestedInBase;
                await saveUserSettings(auth.currentUser.uid, { totalInvestmentSpent: newSpent });
                setSettings(prev => prev ? { ...prev, totalInvestmentSpent: newSpent } : null);
            }

            showToast('執行成功！已記錄您的本月投資紀律。');
            setShowExecutionBanner(false);

        } catch (e) {
            console.error(e);
            showToast('執行失敗，請重試。', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGoalEdit = () => {
        setTempGoal(settings?.financialGoal || 0);
        // Using confirmModal as a generic prompt here for simplicity or just a separate modal
        // But the user asked to replace ALL native prompts.
        // Let's create a specific Goal Edit UI if needed, but for now I'll just keep the handleSaveGoal logic accessible.
    };



    const handleSaveGoal = async () => {
        if (!auth.currentUser) return;
        try {
            await saveUserSettings(auth.currentUser.uid, { financialGoal: tempGoal });
            setSettings(prev => prev ? { ...prev, financialGoal: tempGoal } : null);
            setIsGoalModalOpen(false);
            showToast('目標已更新');
        } catch (e) {
            console.error(e);
            showToast('更新失敗', 'error');
        }
    };



    if (loading) {
        return <div className="flex-center" style={{ height: '60vh' }}>Loading...</div>;
    }

    const handleSortItems = () => {
        const categoryPriority: { [key: string]: number } = {
            '台股': 1,
            '美股': 2,
            '基金': 3,
            '其他': 4,
            '現金': 5
        };
        const sortedItems = [...items].sort((a, b) => {
            const priorityA = categoryPriority[a.category] || 99;
            const priorityB = categoryPriority[b.category] || 99;
            if (priorityA !== priorityB) return priorityA - priorityB;
            return a.ticker.localeCompare(b.ticker);
        });
        setItems(sortedItems);
    };



    return (
        <div className="animate-fade-in dashboard-container">
            {showExecutionBanner && (
                <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Zap size={20} color="var(--primary)" />
                        <div>
                            <strong style={{ display: 'block', color: 'var(--text-main)' }}>月度執行提醒</strong>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>投資時間已到，請確認下方配置並點擊「確認執行」。</span>
                        </div>
                    </div>
                    <button onClick={() => setShowExecutionBanner(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                </div>
            )}

            <header style={{ marginBottom: '2rem' }}>
                <h1 className="text-gradient" style={{ fontSize: '2rem' }}>每月投資指揮中心</h1>
                <p style={{ color: 'var(--text-muted)' }}>專注於當下的決策與紀律，讓資金配置成為您最有成就感的動作。</p>
            </header>

            <div className="command-center-layout">
                {/* --- Left Column: Execution Editor --- */}
                <div className="command-center-main">

                    {/* Total Idle Funds Planning (Multi-Currency) */}
                    <div className="glass-card stat-card" style={{ marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--surface-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity size={18} color="var(--primary)" />
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>總閒置資金規劃</h3>
                            </div>
                            <button onClick={handleSaveConfig} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                <Save size={16} /> 儲存規劃
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            {visibleCurrencies.map(cur => {
                                const plan = idleFundsConfig[cur] || { amount: 0, startMonth: '', endMonth: '' };
                                const [y1, m1] = plan.startMonth.split('-').map(Number);
                                const [y2, m2] = plan.endMonth.split('-').map(Number);
                                const months = (plan.startMonth && plan.endMonth) ? ((y2 - y1) * 12 + (m2 - m1) + 1) : 0;
                                const monthlyAmt = months > 0 ? (plan.amount / months) : 0;

                                return (
                                    <div key={cur} style={{ display: 'grid', gridTemplateColumns: '0.5fr 1.2fr 1.2fr 1.2fr 0.8fr 1fr', gap: '1rem', alignItems: 'end', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', position: 'relative' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--primary)', paddingBottom: '0.5rem' }}>{cur}</div>
                                        <div>
                                            <label className="muted-title" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem' }}>閒置金額</label>
                                            <input
                                                type="number"
                                                value={plan.amount || ''}
                                                onChange={e => {
                                                    const val = Number(e.target.value);
                                                    setIdleFundsConfig(prev => ({ ...prev, [cur]: { ...prev[cur], amount: val } }));
                                                }}
                                                className="pool-input"
                                                placeholder="輸入數值"
                                                style={{ fontSize: '1.1rem', color: '#FFFFFF', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                                            />
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', minHeight: '1em' }}>
                                                {plan.amount > 0 ? formatDisplayAmount(plan.amount) : ''}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="muted-title" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem' }}>開始月份</label>
                                            <input
                                                type="month"
                                                value={plan.startMonth}
                                                onChange={e => setIdleFundsConfig(prev => ({ ...prev, [cur]: { ...prev[cur], startMonth: e.target.value } }))}
                                                onClick={(e) => (e.target as any).showPicker?.()}
                                                className="input-field"
                                                style={{ background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-main)', padding: '4px 8px', fontSize: '0.85rem', width: '100%', cursor: 'pointer' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="muted-title" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem' }}>結束月份</label>
                                            <input
                                                type="month"
                                                value={plan.endMonth}
                                                onChange={e => setIdleFundsConfig(prev => ({ ...prev, [cur]: { ...prev[cur], endMonth: e.target.value } }))}
                                                onClick={(e) => (e.target as any).showPicker?.()}
                                                className="input-field"
                                                style={{ background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-main)', padding: '4px 8px', fontSize: '0.85rem', width: '100%', cursor: 'pointer' }}
                                            />
                                        </div>
                                        <div style={{ textAlign: 'center', paddingBottom: '0.3rem' }}>
                                            <div className="muted-title" style={{ fontSize: '0.7rem' }}>期間</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 600 }}>{months} <span style={{ fontSize: '0.7rem' }}>月</span></div>
                                        </div>
                                        <div style={{ textAlign: 'right', paddingBottom: '0.3rem' }}>
                                            <div className="muted-title" style={{ fontSize: '0.7rem' }}>預計每月投入</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                                                {monthlyAmt > 0 ? formatDisplayAmount(monthlyAmt) : '0'}
                                            </div>
                                        </div>
                                        {cur !== 'TWD' && (
                                            <button
                                                onClick={() => {
                                                    setConfirmModal({
                                                        title: '移除幣別規劃',
                                                        message: `確定要移除 ${cur} 的閒置資金規劃嗎？`,
                                                        onConfirm: () => {
                                                            setIdleFundsConfig(prev => {
                                                                const next = { ...prev };
                                                                next[cur] = { amount: 0, startMonth: '', endMonth: '' };
                                                                return next;
                                                            });
                                                            setVisibleCurrencies(prev => prev.filter(c => c !== cur));
                                                            setConfirmModal(null);
                                                        }
                                                    });
                                                }}
                                                className="remove-btn"
                                                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {visibleCurrencies.length < 3 && (
                                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                                    {!visibleCurrencies.includes('USD') && (
                                        <button onClick={() => setVisibleCurrencies(prev => [...prev, 'USD'])} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                                            <Plus size={14} /> 新增 USD 規劃
                                        </button>
                                    )}
                                    {!visibleCurrencies.includes('JPY') && (
                                        <button onClick={() => setVisibleCurrencies(prev => [...prev, 'JPY'])} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                                            <Plus size={14} /> 新增 JPY 規劃
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
                        <button onClick={handleSyncPrices} className="btn-secondary" style={{ fontSize: '0.875rem' }}>
                            <RefreshCw size={16} className={isSaving ? 'animate-spin' : ''} /> 同步報價
                        </button>
                        <button onClick={handleSaveConfig} className="btn-secondary" style={{ fontSize: '0.875rem' }}>
                            <Save size={16} /> 儲存草稿
                        </button>
                        <button onClick={handleExecutePlan} disabled={isSaving || items.length === 0} className="btn-primary" style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: (isSaving || items.length === 0) ? 0.5 : 1 }}>
                            <CheckCircle2 size={16} /> 確認執行本月計畫
                        </button>
                    </div>
                </div>

                {/* --- Right Column: Insights --- */}
                <div className="command-center-sidebar">

                    <div className="glass-card chart-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="chart-header">
                            <div className="title-group">
                                <PieIcon size={18} color="var(--primary)" />
                                <h3>本月配置分佈</h3>
                            </div>
                        </div>
                        <div style={{ height: '220px', position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationPieData}
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {allocationPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ background: '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', color: '#1e293b' }}
                                        itemStyle={{ color: '#1e293b' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>資產預覽總計</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                    $ {thisMonthTotalInBase.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Historical Trend Stacked Bar Chart */}
            <div className="glass-card chart-card wide" style={{ marginTop: '2rem' }}>
                <div className="chart-header">
                    <div className="title-group">
                        <BarChart2 size={20} color="var(--primary)" />
                        <h3>歷史投資配置蹤跡 (Past 12 Months)</h3>
                    </div>
                </div>
                <div style={{ height: '350px', width: '100%', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {historicalTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historicalTrendData.slice(-12)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(val) => `$${(val / 1000).toLocaleString()}k`} />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    contentStyle={{ background: '#FFFFFF', border: 'none', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', color: '#1e293b' }}
                                    itemStyle={{ color: '#1e293b' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                {Object.keys(CATEGORY_COLORS).map((cat) => (
                                    <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS]} barSize={40} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ opacity: 0.5, marginBottom: '0.5rem' }}><BarChart2 size={40} /></div>
                            <p>尚無歷史快照。點擊下方「確認執行」後將產生首筆記錄。</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Confirm Modal */}
            {confirmModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(10px)' }}>
                    <div className="glass-card" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--primary)', padding: '2rem', animation: 'modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
                            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px', borderRadius: '12px' }}>
                                <AlertCircle size={24} color="var(--primary)" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{confirmModal.title}</h3>
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>{confirmModal.message}</p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmModal(null)} className="btn-secondary" style={{ flex: 1 }}>取消</button>
                            <button onClick={confirmModal.onConfirm} className="btn-primary" style={{ flex: 1 }}>確認</button>
                        </div>
                    </div>
                </div>
            )}

            {isGoalModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(10px)' }}>
                    <div className="glass-card" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--primary)', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>設定每月投資目標</h3>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="muted-title" style={{ display: 'block', marginBottom: '0.6rem' }}>目標金額 (TWD)</label>
                            <input
                                type="number"
                                value={tempGoal}
                                onChange={e => setTempGoal(Number(e.target.value))}
                                className="pool-input"
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsGoalModalOpen(false)} className="btn-secondary">取消</button>
                            <button onClick={handleSaveGoal} className="btn-primary">儲存</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {
                toast && (
                    <div style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        padding: '12px 24px',
                        background: toast.type === 'success' ? 'var(--primary)' : toast.type === 'error' ? '#475569' : '#6366f1',
                        color: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                        zIndex: 1200,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        animation: 'slide-in 0.3s ease-out',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ borderRadius: '50%', background: 'rgba(255,255,255,0.2)', padding: '2px' }}>
                            <CheckCircle2 size={16} />
                        </div>
                        <span style={{ fontWeight: 500 }}>{toast.message}</span>
                    </div>
                )
            }

            <style>{`
                @keyframes slide-in {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes modal-pop {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .dashboard-container { padding: 1rem 0; }
                
                .command-center-layout { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
                @media (min-width: 1024px) { .command-center-layout { grid-template-columns: 2fr 1fr; } }
                
                .command-center-sidebar { display: flex; flex-direction: column; }
                
                .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
                .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }
                .chart-card.wide { grid-column: span 1; }
                @media (min-width: 1200px) { .chart-card.wide { grid-column: span 2; } }

                .stat-card { padding: 1.5rem; }
                .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .muted-title { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }
                .big-value { font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem; letter-spacing: -1px; }
                .card-footer { display: flex; alignItems: center; gap: 0.4rem; font-size: 0.85rem; }

                .progress-container { height: 8px; margin: 1.5rem 0 1rem; }
                .progress-bar-bg { background: rgba(255,255,255,0.05); border-radius: 99px; height: 100%; overflow: hidden; }
                .progress-bar-fill { background: linear-gradient(90deg, var(--primary), #818cf8); height: 100%; box-shadow: none; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
                .progress-labels { display: flex; justify-content: space-between; font-size: 0.85rem; }

                .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding: 1rem 1.5rem 0; }
                .title-group { display: flex; align-items: center; gap: 0.6rem; }
                .chart-box { padding: 0 1rem 1.5rem; position: relative; }
                .donut-center { position: absolute; transform: translate(-50%, -50%); text-align: center; pointer-events: none; left: 50%; }
                .center-val { font-size: 1.2rem; font-weight: 700; color: var(--text-white); }

                .toggle-group { display: flex; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 2px; }
                .toggle-btn { padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; color: var(--text-muted); transition: all 0.2s; background: none; border: none; cursor: pointer; }
                .toggle-btn.active { background: var(--primary); color: white; box-shadow: none; }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justifyContent: center; backdrop-filter: blur(8px); }
                .modal-content { padding: 2rem; background: var(--surface); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
                .modal-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
                .input-label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.6rem; }
                .w-full { width: 100%; }
                .icon-btn { color: var(--primary); background: none; border: none; cursor: pointer; display: flex; align-items: center; }
                .bold { font-weight: 600; }
                .muted { color: var(--text-muted); }
                .pool-input {
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid rgba(255,255,255,0.1);
                    color: var(--text-white);
                    font-size: 1.8rem;
                    font-weight: 800;
                    width: 100%;
                    outline: none;
                    padding: 0 0.2rem;
                    transition: border-bottom 0.3s;
                }
                .pool-input:focus {
                    border-bottom-color: var(--primary);
                }
                input[type="month"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    cursor: pointer;
                }
            `}</style>
        </div >
    );
}
