import { useState, useEffect, useMemo } from 'react';
import { auth, functions } from '../firebase';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getMonthlyConfig, getUserSettings, saveUserSettings, getSnapshots, saveMonthlyConfig, saveSnapshot, getLatestSnapshot } from '../services/db';
import { MonthlyConfig, UserSettings, Snapshot, MonthlyConfigItem } from '../types';
import { Target, TrendingUp, PieChart as PieIcon, Edit2, Save, X, Layers, Activity, Calendar, BarChart2, Plus, Zap, AlertCircle, Trash2, CheckCircle2, Download, RefreshCw } from 'lucide-react';
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
    const [items, setItems] = useState<MonthlyConfigItem[]>([]);
    const [idleFunds, setIdleFunds] = useState<number>(0);
    const [rationale, setRationale] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [showExecutionBanner, setShowExecutionBanner] = useState(false);

    // --- Generic UI States ---
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [tempGoal, setTempGoal] = useState<number>(0);

    // --- Dynamic Pool Logic ---
    const remainingMonths = useMemo(() => {
        if (!settings?.targetEndMonth) return 1;
        const [year, month] = settings.targetEndMonth.split('-').map(Number);
        const targetDate = new Date(year, month - 1, 1);
        const today = new Date();
        const diff = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
        return Math.max(1, diff);
    }, [settings?.targetEndMonth]);

    const suggestedMonthly = useMemo(() => {
        if (!settings?.totalInvestmentPool) return 0;
        const spent = settings.totalInvestmentSpent || 0;
        return (settings.totalInvestmentPool - spent) / remainingMonths;
    }, [settings?.totalInvestmentPool, settings?.totalInvestmentSpent, remainingMonths]);

    const remainingFunds = idleFunds - items.reduce((sum, i) => sum + i.amount * (i.currency === 'USD' ? 33 : i.currency === 'JPY' ? 0.22 : 1), 0);

    useEffect(() => {
        const fetchData = async () => {
            if (auth.currentUser) {
                const [cData, sData, snapData] = await Promise.all([
                    getMonthlyConfig(auth.currentUser.uid),
                    getUserSettings(auth.currentUser.uid),
                    getSnapshots(auth.currentUser.uid)
                ]);
                setSettings(sData);
                setSnapshots(snapData.reverse()); // Sort oldest to newest for charts

                if (cData) {
                    setConfig(cData);
                    setItems(cData.items || []);
                    setIdleFunds(cData.idleFunds || 0);
                    setRationale(cData.rationale || '');
                } else {
                    // Template Inheritance: Try to fetch latest snapshot
                    const latestSnap = await getLatestSnapshot(auth.currentUser.uid);
                    if (latestSnap && latestSnap.allocationSnapshot) {
                        setItems(latestSnap.allocationSnapshot.map((a: any) => ({
                            category: a.category,
                            ticker: a.ticker,
                            amount: 0,
                            currency: a.currency
                        })));
                    } else {
                        setItems([]);
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
    }, []);

    // --- Handlers for Monthly Config ---
    const handleAddItem = () => {
        setItems([...items, { category: '台股', ticker: '', amount: 0, currency: 'TWD' }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSaveConfig = async () => {
        if (!auth.currentUser) return;
        setIsSaving(true);
        await saveMonthlyConfig(auth.currentUser.uid, {
            uid: auth.currentUser.uid,
            configName: config?.configName || '本月計畫',
            items,
            idleFunds,
            rationale,
            updatedAt: Timestamp.now()
        });
        setConfig({ ...config, uid: auth.currentUser.uid, configName: config?.configName || '本月計畫', items, idleFunds, rationale, updatedAt: Timestamp.now() } as MonthlyConfig);
        setIsSaving(false);
        alert('配置已儲存！');
    };

    const handleSyncPrices = async () => {
        if (!auth.currentUser) return;
        const tickers = items.map(i => i.ticker).filter(t => t);
        if (tickers.length === 0) {
            alert('請先在配置中輸入標的代碼（如 2330.TW 或 AAPL）。');
            return;
        }

        setIsSaving(true);
        try {
            const getPriceFn = httpsCallable(functions, 'getStockPrice');
            // We just sync prices to help the UI estimate things, no holdings to update anymore
            await getPriceFn({ symbols: tickers });
            alert('已獲取最新市場報價！');
        } catch (err) {
            console.error('Sync failed:', err);
            alert('價格同步失敗，請稍後再試。');
        }
        setIsSaving(false);
    };

    const handleExportMarkdown = () => {
        const date = new Date().toLocaleDateString();
        const content = `# JING Finance 投資計畫報告 (${date})

## 💰 預算狀態
- **本月計畫總額 (Plan Total):** $ ${thisMonthTotalInBase.toLocaleString()}
- **總資金池支出進度:** ${poolProgress.toFixed(1)}% ($ ${(settings?.totalInvestmentSpent || 0).toLocaleString()} / $ ${(settings?.totalInvestmentPool || 0).toLocaleString()})

## 📊 配置明細
${items.map(i => `- [${i.category}] ${i.ticker || '未填寫'}: $ ${i.amount.toLocaleString()} (${i.currency})`).join('\n')}

## 🧠 投資心得與風險考量 (Rationale)
${rationale || '本月尚未填寫心得。'}

---
*Generated by JING Insight | 動態投資執行中心*
`;

        navigator.clipboard.writeText(content);
        alert('報表 Markdown 已複製到剪貼簿！');
    };

    const handleExecutePlan = async () => {
        if (!auth.currentUser) return;
        if (!confirm('確認執行本月計畫？此動作將產生當月投資快照並更新可用投資池進度。')) return;

        setIsSaving(true);

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

            // 2. Update spent in settings
            if (settings && auth.currentUser) {
                const newSpent = (settings.totalInvestmentSpent || 0) + currentTotalInvestedInBase;
                const newSettings = { ...settings, totalInvestmentSpent: newSpent };
                setSettings(newSettings);
                await saveUserSettings(auth.currentUser.uid, newSettings);
            }

            alert('執行成功！已記錄您的本月投資紀律。');
            setShowExecutionBanner(false);

        } catch (e) {
            console.error(e);
            alert('執行失敗，請重試。');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Computed Data ---
    const thisMonthTotalInBase = useMemo(() => {
        return items.reduce((sum, i) => {
            const rate = i.currency === 'USD' ? (settings?.manualExchangeRates?.['USD'] || 33) :
                i.currency === 'JPY' ? (settings?.manualExchangeRates?.['JPY'] || 0.22) : 1;
            return sum + (i.amount * rate);
        }, 0);
    }, [items, settings]);

    const poolProgress = settings?.totalInvestmentPool ? ((settings.totalInvestmentSpent || 0) / settings.totalInvestmentPool) * 100 : 0;

    const allocationPieData = useMemo(() => {
        const map: { [key: string]: number } = {};
        items.forEach(i => {
            const rate = i.currency === 'USD' ? (settings?.manualExchangeRates?.['USD'] || 33) :
                i.currency === 'JPY' ? (settings?.manualExchangeRates?.['JPY'] || 0.22) : 1;
            const valInBase = i.amount * rate;
            map[i.category] = (map[i.category] || 0) + valInBase;
        });
        if (remainingFunds > 0) {
            map['未分配資金'] = remainingFunds;
        }
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [items, remainingFunds, settings]);

    const historicalTrendData = useMemo(() => {
        return snapshots.map(s => {
            const categorySum: { [key: string]: number } = {};
            if (s.allocationSnapshot) {
                s.allocationSnapshot.forEach(a => {
                    const rate = a.currency === 'USD' ? (settings?.manualExchangeRates?.['USD'] || 33) :
                        a.currency === 'JPY' ? (settings?.manualExchangeRates?.['JPY'] || 0.22) : 1;
                    const TWDValue = a.amount * rate;
                    categorySum[a.category] = (categorySum[a.category] || 0) + TWDValue;
                });
            }
            return {
                name: s.yearMonth,
                ...categorySum,
                total: s.totalInvestedInBase || 0
            };
        });
    }, [snapshots, settings]);

    const handleUpdateGoal = async () => {
        if (auth.currentUser) {
            await saveUserSettings(auth.currentUser.uid, { financialGoal: tempGoal });
            setSettings(prev => prev ? { ...prev, financialGoal: tempGoal } : null);
            setIsGoalModalOpen(false);
        }
    };

    if (loading) {
        return <div className="flex-center" style={{ height: '60vh' }}>Loading...</div>;
    }

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

                    {/* Total Pool & Suggested Monthly Bar */}
                    <div className="glass-card stat-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', padding: '1.2rem 2rem' }}>
                        <div>
                            <h3 className="muted-title" style={{ marginBottom: '0.4rem' }}>預計投入總資金</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>$</span>
                                <input
                                    type="number"
                                    value={settings?.totalInvestmentPool || 0}
                                    onChange={async e => {
                                        const val = Number(e.target.value);
                                        const user = auth.currentUser;
                                        if (user && settings) {
                                            const newSettings = { ...settings, totalInvestmentPool: val };
                                            setSettings(newSettings);
                                            await saveUserSettings(user.uid, newSettings);
                                        }
                                    }}
                                    className="pool-input"
                                />
                            </div>
                        </div>
                        <div>
                            <h3 className="muted-title" style={{ marginBottom: '0.4rem' }}>目標結束月份</h3>
                            <input
                                type="month"
                                value={settings?.targetEndMonth || ''}
                                onChange={async e => {
                                    const val = e.target.value;
                                    const user = auth.currentUser;
                                    if (user && settings) {
                                        const newSettings = { ...settings, targetEndMonth: val };
                                        setSettings(newSettings);
                                        await saveUserSettings(user.uid, newSettings);
                                    }
                                }}
                                className="input-field"
                                style={{ background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h3 className="muted-title" style={{ marginBottom: '0.4rem' }}>本月建議投入</h3>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                $ {Math.round(suggestedMonthly).toLocaleString()}
                                <button
                                    onClick={() => setIdleFunds(Math.round(suggestedMonthly))}
                                    className="flex-center"
                                    style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                                >
                                    套用
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Budget Picker */}
                    <div className="glass-card stat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1.2rem 2rem', background: 'rgba(99, 102, 241, 0.05)' }}>
                        <div>
                            <h3 className="muted-title" style={{ marginBottom: '0.4rem' }}>本月預定投入預算</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>$</span>
                                <input
                                    type="number"
                                    value={idleFunds}
                                    onChange={e => setIdleFunds(Number(e.target.value))}
                                    className="pool-input"
                                    style={{ color: 'var(--text-main)', width: '150px' }}
                                />
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>剩餘未分配額度</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: remainingFunds >= 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                $ {remainingFunds.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Allocation Table */}
                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div className="title-group">
                                <Target size={18} color="var(--primary)" />
                                <h3>本月定額配置計畫表</h3>
                            </div>
                            <button onClick={handleAddItem} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                <Plus size={16} /> 新增項目
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {items.map((item, index) => (
                                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr auto', gap: '0.8rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                                    <select
                                        className="input-field-lite"
                                        value={item.category}
                                        onChange={(e) => {
                                            const newItems = [...items];
                                            newItems[index].category = e.target.value;
                                            setItems(newItems);
                                        }}
                                    >
                                        <option>台股</option>
                                        <option>美股</option>
                                        <option>基金</option>
                                        <option>現金</option>
                                        <option>其他</option>
                                    </select>

                                    <input
                                        className="input-field-lite"
                                        value={item.ticker}
                                        placeholder="標的代號"
                                        onChange={(e) => {
                                            const newItems = [...items];
                                            newItems[index].ticker = e.target.value;
                                            setItems(newItems);
                                        }}
                                    />

                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>$</span>
                                        <input
                                            type="number"
                                            className="input-field-lite"
                                            style={{ paddingLeft: '24px' }}
                                            value={item.amount}
                                            onChange={(e) => {
                                                const newItems = [...items];
                                                newItems[index].amount = Number(e.target.value);
                                                setItems(newItems);
                                            }}
                                        />
                                    </div>

                                    <select
                                        className="input-field-lite"
                                        value={item.currency}
                                        onChange={(e) => {
                                            const newItems = [...items];
                                            newItems[index].currency = e.target.value;
                                            setItems(newItems);
                                        }}
                                    >
                                        <option>TWD</option>
                                        <option>USD</option>
                                        <option>JPY</option>
                                    </select>

                                    <button onClick={() => handleRemoveItem(index)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {items.length === 0 && <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>尚未新增任何投資。</div>}
                        </div>
                    </div>

                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="title-group" style={{ marginBottom: '1rem' }}>
                            <Edit2 size={18} color="var(--primary)" />
                            <h3>投資日誌與心得</h3>
                        </div>
                        <textarea
                            className="input-field"
                            style={{ width: '100%', minHeight: '100px', fontSize: '0.95rem' }}
                            placeholder="記錄這個月的投資思考：為什麼進行這些調整？這將作為 AI 分析您投資紀律的重要依據。"
                            value={rationale}
                            onChange={e => setRationale(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={handleSyncPrices} className="btn-secondary">
                            <RefreshCw size={18} className={isSaving ? 'animate-spin' : ''} /> 同步報價
                        </button>
                        <button onClick={handleSaveConfig} className="btn-secondary">
                            <Save size={18} /> 儲存草稿
                        </button>
                        <button onClick={handleExecutePlan} disabled={isSaving || items.length === 0} className="btn-primary">
                            <CheckCircle2 size={18} /> 確認執行本月計畫
                        </button>
                    </div>
                </div>

                {/* --- Right Column: Insights --- */}
                <div className="command-center-sidebar">
                    <div className="glass-card stat-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-header">
                            <h3 className="muted-title">總資金池投入進度</h3>
                            <Activity size={18} color="var(--primary)" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                            <div className="big-value" style={{ fontSize: '1.8rem' }}>{poolProgress.toFixed(1)}%</div>
                            <div className="muted" style={{ fontSize: '0.8rem' }}>
                                $ {(settings?.totalInvestmentSpent || 0).toLocaleString()} / $ {(settings?.totalInvestmentPool || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="progress-container">
                            <div className="progress-bar-bg" style={{ height: '8px' }}>
                                <div className="progress-bar-fill" style={{ width: `${Math.min(poolProgress, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>

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
                                        contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--surface-border)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>計畫總計</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                    $ {thisMonthTotalInBase.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <div className="title-group" style={{ marginBottom: '1rem' }}>
                            <AlertCircle size={18} color="var(--primary)" />
                            <h3 style={{ fontSize: '0.9rem' }}>紀律提示</h3>
                        </div>
                        <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                            <li>本月分配應優先考慮長期資產配置穩定性。</li>
                            <li>若本月盈餘較多，可考慮手動上調「本月實際預算」。</li>
                            <li>執行後，系統將自動產生不可變動的歷史快照。</li>
                        </ul>
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
                <div style={{ height: '350px', width: '100%', marginTop: '1.5rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historicalTrendData.slice(-12)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(val) => `$${(val / 1000).toLocaleString()}k`} />
                            <RechartsTooltip
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--surface-border)', borderRadius: '12px' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            {Object.keys(CATEGORY_COLORS).map((cat, idx) => (
                                <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat]} barSize={40} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Modal for Goal Setting */}
            {isGoalModalOpen && (
                <div className="modal-overlay flex-center">
                    <div className="glass-card modal-content" style={{ width: '400px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>設定財務目標</h2>
                        <div style={{ marginBottom: '2rem' }}>
                            <label className="muted-title" style={{ display: 'block', marginBottom: '0.5rem' }}>目標總資產 (TWD)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={tempGoal}
                                onChange={e => setTempGoal(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsGoalModalOpen(false)} className="btn-secondary">取消</button>
                            <button onClick={handleUpdateGoal} className="btn-primary">儲存目標</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
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
        </div>
    );
}
