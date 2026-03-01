import { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase';
import { Timestamp } from 'firebase/firestore';
import { getHoldings, getMonthlyConfig, getUserSettings, saveUserSettings, getSnapshots, saveMonthlyConfig, saveHolding, saveSnapshot } from '../services/db';
import { Holding, MonthlyConfig, UserSettings, Snapshot, MonthlyConfigItem } from '../types';
import { Target, TrendingUp, PieChart as PieIcon, Edit2, Save, X, Layers, Activity, Calendar, BarChart2, Plus, Zap, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    BarChart, Bar, Legend, ReferenceLine
} from 'recharts';

// Custom Colors for Premium Look
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
const CATEGORY_COLORS: { [key: string]: string } = {
    '台股': '#6366f1',
    '美股': '#8b5cf6',
    '基金': '#ec4899',
    '現金': '#22c55e',
    '其他': '#94a3b8'
};
const CURRENCY_COLORS: { [key: string]: string } = {
    'TWD': '#6366f1',
    'USD': '#8b5cf6',
    'JPY': '#ec4899'
};

export default function Dashboard() {
    // --- Data States ---
    const [holdings, setHoldings] = useState<Holding[]>([]);
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
    const [allocationDim, setAllocationDim] = useState<'category' | 'currency'>('category');
    const [donutShowPercent, setDonutShowPercent] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (auth.currentUser) {
                const [hData, cData, sData, snapData] = await Promise.all([
                    getHoldings(auth.currentUser.uid),
                    getMonthlyConfig(auth.currentUser.uid),
                    getUserSettings(auth.currentUser.uid),
                    getSnapshots(auth.currentUser.uid)
                ]);
                setHoldings(hData);
                setSettings(sData);
                setSnapshots(snapData.reverse()); // Sort oldest to newest for area chart

                if (cData) {
                    setConfig(cData);
                    setItems(cData.items || []);
                    setIdleFunds(cData.idleFunds || 0);
                    setRationale(cData.rationale || '');
                } else if (sData) {
                    // Fallback to base settings or empty arrays if no config
                    setItems([]);
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
            configName: config?.configName || '本月計畫',
            items,
            idleFunds,
            rationale
        });
        setConfig({ ...config, uid: auth.currentUser.uid, configName: config?.configName || '本月計畫', items, idleFunds, rationale } as MonthlyConfig);
        setIsSaving(false);
        alert('配置已儲存！');
    };

    const handleExecutePlan = async () => {
        if (!auth.currentUser) return;
        if (!confirm('確認執行本月計畫？此動作會將安排好的資金轉移至真實庫存，並產生當月快照。')) return;

        setIsSaving(true);

        try {
            // 1. Update Holdings
            const updatedHoldings = [...holdings];
            for (const item of items) {
                // Determine conversion via mock currentPrice (in a real app, integrate live price API here)
                const priceMatch = holdings.find(h => h.ticker === item.ticker)?.currentPrice || 1;

                const existingIndex = updatedHoldings.findIndex(h => h.ticker === item.ticker && h.category === item.category);
                if (existingIndex >= 0) {
                    const h = updatedHoldings[existingIndex];
                    const addedShares = item.amount / priceMatch;
                    const newShares = h.shares + addedShares;
                    // Weighted average cost formula
                    const newTotalCost = (h.shares * h.avgCost) + item.amount;
                    h.avgCost = newTotalCost / newShares;
                    h.shares = newShares;
                    await saveHolding(h);
                } else {
                    const newHolding: Partial<Holding> = {
                        uid: auth.currentUser.uid,
                        ticker: item.ticker,
                        name: item.ticker, // Could fetch name later
                        category: item.category,
                        shares: item.amount / priceMatch,
                        avgCost: priceMatch,
                        currency: item.currency,
                        currentPrice: priceMatch
                    };
                    await saveHolding(newHolding);
                    updatedHoldings.push(newHolding as Holding); // Optimistic 
                }
            }

            setHoldings(updatedHoldings);

            // 2. Generate Snapshot
            const now = new Date();
            const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            let totalVal = 0;
            const snapHoldings = updatedHoldings.map(h => {
                const price = h.currentPrice || h.avgCost || 0;
                const subTWD = h.shares * price * (h.currency === 'USD' ? 33 : 1);
                totalVal += subTWD;
                return {
                    ticker: h.ticker,
                    shares: h.shares,
                    price: price,
                    subtotal: h.shares * price
                };
            });

            const newSnapshot: Snapshot = {
                uid: auth.currentUser.uid,
                yearMonth,
                totalValueInBase: totalVal + remainingFunds, // Include idle remaining cash
                holdingsSnapshot: snapHoldings,
                allocationSnapshot: items.map(i => ({ ticker: i.ticker, amount: i.amount, currency: i.currency })),
                isAutoGenerated: false,
                createdAt: Timestamp.now()
            };

            await saveSnapshot(newSnapshot);
            setSnapshots([...snapshots, newSnapshot]);

            // 3. Clear existing Monthly Config logic, wait for next month or retain for editing
            alert('執行成功！庫存已更新，並為您建立了快照。');
            setShowExecutionBanner(false);

        } catch (e) {
            console.error(e);
            alert('執行失敗，請重試。');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Computed Data for Dashboard ---

    // Total active invested assets
    const totalAssetsTWD = holdings.reduce((sum, h) => {
        const price = h.currentPrice || h.avgCost || 0;
        const subtotal = h.shares * price;
        return sum + (h.currency === 'USD' ? subtotal * 33 : subtotal);
    }, 0);

    // Monthly Config Allocation logic
    const totalAllocated = items.reduce((sum, item) => sum + (item.currency === 'USD' ? item.amount * 33 : item.amount), 0);
    const remainingFunds = idleFunds - totalAllocated;

    const goalProgress = settings?.financialGoal ? ((totalAssetsTWD + idleFunds) / settings.financialGoal) * 100 : 0;

    // Charts Computed Data
    const allocationData = useMemo(() => {
        const map: { [key: string]: number } = {};
        holdings.forEach(h => {
            const dim = allocationDim === 'category' ? h.category : h.currency;
            const price = h.currentPrice || h.avgCost || 0;
            const valueTWD = h.shares * price * (h.currency === 'USD' ? 33 : 1);
            map[dim] = (map[dim] || 0) + valueTWD;
        });
        // Include remaining idle funds dynamically as Cash/TWD
        if (remainingFunds > 0) {
            const dim = allocationDim === 'category' ? '現金' : 'TWD';
            map[dim] = (map[dim] || 0) + remainingFunds;
        }
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [holdings, allocationDim, remainingFunds]);

    const growthChartData = useMemo(() => {
        return snapshots.map(s => ({
            name: s.yearMonth,
            value: s.totalValueInBase
        }));
    }, [snapshots]);

    const monthlyMagnitudeData = useMemo(() => {
        // Build stacked bar chart identifying "bravery" over time
        return snapshots.slice(-12).map(s => {
            const categorySum: { [key: string]: number } = { TWD: 0, USD: 0, JPY: 0 };
            if (s.allocationSnapshot) {
                s.allocationSnapshot.forEach(a => {
                    const TWDValue = a.amount * (a.currency === 'USD' ? 33 : a.currency === 'JPY' ? 0.22 : 1);
                    categorySum[a.currency] = (categorySum[a.currency] || 0) + TWDValue;
                });
            }
            return {
                name: s.yearMonth,
                '台幣投資': categorySum['TWD'],
                '外幣投資 (USD/JPY)': categorySum['USD'] + categorySum['JPY']
            };
        });
    }, [snapshots]);

    // Performance Data (Heatmap style bar chart)
    const performanceData = useMemo(() => {
        return holdings
            .map(h => {
                const price = h.currentPrice || h.avgCost;
                const pl = h.avgCost > 0 ? ((price - h.avgCost) / h.avgCost) * 100 : 0;
                return {
                    name: h.ticker,
                    pl: parseFloat(pl.toFixed(2)),
                    value: h.shares * price * (h.currency === 'USD' ? 33 : 1)
                };
            })
            .sort((a, b) => b.pl - a.pl);
    }, [holdings]);


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
                            <strong style={{ display: 'block', color: 'var(--text-white)' }}>月底執行提醒</strong>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>下個月的投資計畫時間已到，請檢閱下方配置並點擊「確認執行」。</span>
                        </div>
                    </div>
                    <button onClick={() => setShowExecutionBanner(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                </div>
            )}

            <header style={{ marginBottom: '2rem' }}>
                <h1 className="text-gradient" style={{ fontSize: '2rem' }}>本月投資指揮中心</h1>
                <p style={{ color: 'var(--text-muted)' }}>您的專屬財務決策引擎，計畫未來比紀錄過去更有價值。</p>
            </header>

            <div className="command-center-layout">
                {/* --- Left Column: Execution Editor --- */}
                <div className="command-center-main">

                    {/* Idle Funds Top Bar */}
                    <div className="glass-card stat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1.2rem 2rem' }}>
                        <div>
                            <h3 className="muted-title" style={{ marginBottom: '0.4rem' }}>本月可用總資金設定</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>$</span>
                                <input
                                    type="number"
                                    value={idleFunds}
                                    onChange={e => setIdleFunds(Number(e.target.value))}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: '2px solid rgba(255,255,255,0.1)',
                                        color: 'var(--text-white)',
                                        fontSize: '2rem',
                                        fontWeight: '800',
                                        width: '200px',
                                        outline: 'none',
                                        padding: '0 0.5rem'
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>剩餘未分配額度</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: remainingFunds >= 0 ? 'var(--success)' : 'var(--error)' }}>
                                $ {remainingFunds.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Editor Table */}
                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div className="title-group">
                                <Target size={18} color="var(--primary)" />
                                <h3>本月定額配置計畫</h3>
                            </div>
                            <button onClick={handleAddItem} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                <Plus size={16} style={{ display: 'inline', marginRight: '4px' }} /> 新增標的
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {items.map((item, index) => (
                                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr auto', gap: '0.8rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px' }}>
                                    <select
                                        className="input-field"
                                        style={{ height: '36px' }}
                                        value={item.category}
                                        onChange={(e) => {
                                            const newItems = [...items];
                                            newItems[index].category = e.target.value;
                                            setItems(newItems);
                                        }}
                                    >
                                        <option>美股</option>
                                        <option>台股</option>
                                        <option>基金</option>
                                        <option>其他</option>
                                    </select>

                                    <input
                                        className="input-field"
                                        style={{ height: '36px' }}
                                        value={item.ticker}
                                        placeholder="代號 (e.g. 2330.TW)"
                                        onChange={(e) => {
                                            const newItems = [...items];
                                            newItems[index].ticker = e.target.value;
                                            setItems(newItems);
                                        }}
                                    />

                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>$</span>
                                        <input
                                            type="number"
                                            className="input-field"
                                            style={{ height: '36px', paddingLeft: '24px' }}
                                            value={item.amount}
                                            placeholder="金額"
                                            onChange={(e) => {
                                                const newItems = [...items];
                                                newItems[index].amount = Number(e.target.value);
                                                setItems(newItems);
                                            }}
                                        />
                                    </div>

                                    <select
                                        className="input-field"
                                        style={{ height: '36px' }}
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

                                    <button onClick={() => handleRemoveItem(index)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}

                            {items.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    點擊右上角新增您的第一筆配置安排。
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rationale Log */}
                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="title-group" style={{ marginBottom: '1rem' }}>
                            <Edit2 size={18} color="var(--primary)" />
                            <h3>本月心得與決策原因</h3>
                        </div>
                        <textarea
                            className="input-field"
                            style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
                            placeholder="記錄這個月的投資思考：為什麼提高美股比重？受到哪些新聞影響？這會是 AI 分析你的投資性格的重要資料。"
                            value={rationale}
                            onChange={e => setRationale(e.target.value)}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                        <button onClick={handleSaveConfig} disabled={isSaving} className="btn-primary" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <Save size={18} style={{ marginRight: '8px' }} /> 儲存草稿
                        </button>
                        <button onClick={handleExecutePlan} disabled={isSaving || remainingFunds < 0 || items.length === 0} className="btn-primary" style={{ position: 'relative', overflow: 'hidden' }}>
                            <CheckCircle2 size={18} style={{ marginRight: '8px' }} /> 確認寫入並執行
                        </button>
                    </div>
                </div>

                {/* --- Right Column: Insights --- */}
                <div className="command-center-sidebar">
                    <div className="glass-card stat-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-header">
                            <h3 className="muted-title">總市值預估 (包含未分配現金)</h3>
                            <TrendingUp size={18} color="var(--primary)" />
                        </div>
                        <div className="big-value" style={{ fontSize: '1.8rem' }}>$ {(totalAssetsTWD + idleFunds).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>

                        <div className="progress-container" style={{ marginTop: '2rem' }}>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill" style={{ width: `${Math.min(goalProgress, 100)}%` }}></div>
                            </div>
                        </div>
                        <div className="progress-labels" style={{ marginTop: '0.5rem' }}>
                            <span className="bold">{goalProgress.toFixed(1)}% 目標達成</span>
                            <span className="muted" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setIsGoalModalOpen(true)}>
                                <Edit2 size={10} /> 編輯目標
                            </span>
                        </div>
                    </div>

                    {/* Asset Allocation Donut */}
                    <div className="glass-card chart-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="chart-header" style={{ padding: '0 0 1rem 0' }}>
                            <div className="title-group">
                                <PieIcon size={16} color="var(--primary)" />
                                <h3 style={{ fontSize: '1rem' }}>資產與板塊分佈</h3>
                            </div>
                            <div className="toggle-group" style={{ transform: 'scale(0.85)', transformOrigin: 'right top' }}>
                                <button className={`toggle-btn ${allocationDim === 'category' ? 'active' : ''}`} onClick={() => setAllocationDim('category')}>類別</button>
                                <button className={`toggle-btn ${allocationDim === 'currency' ? 'active' : ''}`} onClick={() => setAllocationDim('currency')}>幣別</button>
                            </div>
                        </div>
                        <div className="chart-box" style={{ padding: 0, height: '220px', cursor: 'pointer' }} onClick={() => setDonutShowPercent(!donutShowPercent)}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationData}
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {allocationData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={allocationDim === 'category' ? (CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]) : (CURRENCY_COLORS[entry.name] || COLORS[index % COLORS.length])}
                                            />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="donut-center" style={{ top: '50%' }}>
                                <div className="center-val" style={{ fontSize: '1rem' }}>
                                    {donutShowPercent ? `${((allocationData.reduce((s, e) => s + e.value, 0) / (totalAssetsTWD + remainingFunds)) * 100).toFixed(0)}%` : '總覽'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Magnitude Bar Chart */}
                    <div className="glass-card chart-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="chart-header" style={{ padding: '0 0 1rem 0' }}>
                            <div className="title-group">
                                <Calendar size={16} color="var(--primary)" />
                                <h3 style={{ fontSize: '1rem' }}>過去投入蹤跡</h3>
                            </div>
                        </div>
                        <div className="chart-box" style={{ padding: 0, height: '200px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyMagnitudeData} margin={{ left: -20, right: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                    <YAxis hide />
                                    <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                                    <Bar dataKey="台幣投資" stackId="a" fill="#6366f1" radius={[0, 0, 2, 2]} />
                                    <Bar dataKey="外幣投資 (USD/JPY)" stackId="a" fill="#ec4899" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Growth Chart area */}
            <div className="glass-card chart-card wide" style={{ marginTop: '2rem' }}>
                <div className="chart-header">
                    <div className="title-group">
                        <Layers size={18} color="var(--primary)" />
                        <h3>歷史資產增長趨勢 (Historical Value)</h3>
                    </div>
                </div>
                <div className="chart-box">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={growthChartData.length > 0 ? growthChartData : [{ name: 'Jan', value: 0 }, { name: 'Feb', value: totalAssetsTWD }]}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `$${(v / 10000).toFixed(0)}w`} />
                            <RechartsTooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Goal Setting Modal - Custom styles from previous */}
            {isGoalModalOpen && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ width: '400px' }}>
                        <div className="modal-header">
                            <h2>設定理財目標</h2>
                            <button onClick={() => setIsGoalModalOpen(false)} className="icon-btn"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <label className="input-label">目標金額 (TWD)</label>
                            <input type="number" className="input-field" value={tempGoal} onChange={(e) => setTempGoal(Number(e.target.value))} />
                        </div>
                        <button onClick={handleUpdateGoal} className="btn-primary w-full"><Save size={18} /> 確認更新</button>
                    </div>
                </div>
            )}

            <style>{`
                .dashboard-container { padding: 1rem 0; }
                
                .command-center-layout { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
                @media (min-width: 1024px) { .command-center-layout { grid-template-columns: 2fr 1fr; } }
                
                .command-center-sidebar { display: flex; flex-direction: column; }
                
                /* Keep legacy styles */
                .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
                .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }
                .chart-card.wide { grid-column: span 1; }
                @media (min-width: 1200px) { .chart-card.wide { grid-column: span 2; } }

                .stat-card { padding: 1.5rem; }
                .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .muted-title { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }
                .big-value { font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem; letter-spacing: -1px; }
                .card-footer { display: flex; alignItems: center; gap: 0.4rem; font-size: 0.85rem; }
                .card-footer.success { color: var(--success); }

                .progress-container { height: 8px; margin: 1.5rem 0 1rem; }
                .progress-bar-bg { background: rgba(255,255,255,0.05); border-radius: 99px; height: 100%; overflow: hidden; }
                .progress-bar-fill { background: linear-gradient(90deg, var(--primary), #818cf8); height: 100%; box-shadow: 0 0 15px var(--primary); transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
                .progress-labels { display: flex; justify-content: space-between; font-size: 0.85rem; }

                .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding: 1rem 1.5rem 0; }
                .title-group { display: flex; align-items: center; gap: 0.6rem; }
                .chart-box { padding: 0 1rem 1.5rem; position: relative; }
                .donut-center { position: absolute; transform: translate(-50%, -50%); text-align: center; pointer-events: none; left: 50%; }
                .center-val { font-size: 1.2rem; font-weight: 700; color: var(--text-white); }

                .toggle-group { display: flex; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 2px; }
                .toggle-btn { padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; color: var(--text-muted); transition: all 0.2s; background: none; border: none; cursor: pointer; }
                .toggle-btn.active { background: var(--primary); color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justifyContent: center; backdrop-filter: blur(8px); }
                .modal-content { padding: 2rem; background: var(--surface); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
                .modal-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
                .input-label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.6rem; }
                .w-full { width: 100%; }
                .icon-btn { color: var(--primary); background: none; border: none; cursor: pointer; display: flex; align-items: center; }
                .bold { font-weight: 600; }
                .muted { color: var(--text-muted); }
            `}</style>
        </div>
    );
}
