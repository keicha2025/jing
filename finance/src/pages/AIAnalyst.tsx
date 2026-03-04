import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    ExternalLink,
    Copy,
    Cpu,
    BrainCircuit,
    TrendingUp,
    Target,
    Save,
    Settings,
    Check,
    CheckCircle2,
    Plus,
    Edit2,
    Trash2,
    X,
    Zap,
    Activity,
    Compass,
    PieChart,
    Clock,
    RotateCcw,
    LineChart,
    MessageSquare,
    Sparkles,
    ChevronRight,
    Search,
    History,
    ShieldCheck,
    BarChart3
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { auth } from '../firebase';
import { getMonthlyConfig, getUserSettings, getSnapshots, saveUserSettings, saveMonthlyConfig } from '../services/db';
import { MonthlyConfig, UserSettings, Snapshot, AIStrategy, AITool } from '../types';

const INITIAL_STRATEGIES: AIStrategy[] = [
    {
        id: 'discipline',
        name: '投資紀律與偏離檢查',
        description: '診斷變動合理性、偏差警示與行為心理學建議。',
        iconType: 'ShieldCheck',
        promptTemplate: ''
    },
    {
        id: 'market',
        name: '分批進場之風險評估',
        description: '水位分析、換匯效率與當月閒置金處理策略。',
        iconType: 'Compass',
        promptTemplate: ''
    },
    {
        id: 'projection',
        name: '目標達成率與未來推估',
        description: '複利動能模擬、里程碑分析與五年趨勢。',
        iconType: 'Target',
        promptTemplate: ''
    },
    {
        id: 'cashflow',
        name: '閒置資金與現金流壓力測試',
        description: '安全邊際評估、投入比診斷與防禦建議。',
        iconType: 'Activity',
        promptTemplate: ''
    }
];

const DEFAULT_TOOLS: AITool[] = [];

export default function AIAnalyst() {
    const [config, setConfig] = useState<MonthlyConfig | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(true);

    const [strategies, setStrategies] = useState<AIStrategy[]>(INITIAL_STRATEGIES);
    const [aiTools, setAiTools] = useState<AITool[]>(DEFAULT_TOOLS);
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
    const [currentPrompt, setCurrentPrompt] = useState<string>('');
    const [isCopied, setIsCopied] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingStrategy, setEditingStrategy] = useState<AIStrategy | null>(null);
    const [showToolManager, setShowToolManager] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

    // User Fundamentals State
    const [horizon, setHorizon] = useState('');
    const [risk, setRisk] = useState('');
    const [psychology, setPsychology] = useState('');
    const [manualIdle, setManualIdle] = useState<string>('');
    const [notes, setNotes] = useState('');

    const editorRef = useRef<HTMLTextAreaElement>(null);
    // Debounce timer ref for auto-save fundamentals
    const fundamentalsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [btnStatus, setBtnStatus] = useState<{ [key: string]: string | null }>({});

    const triggerBtnStatus = useCallback((key: string, message: string) => {
        setBtnStatus(prev => ({ ...prev, [key]: 'EXIT' }));
        setTimeout(() => {
            setBtnStatus(prev => ({ ...prev, [key]: message }));
            setTimeout(() => {
                setBtnStatus(prev => ({ ...prev, [key]: 'RESTORE' }));
                setTimeout(() => {
                    setBtnStatus(prev => ({ ...prev, [key]: null }));
                }, 200);
            }, 2000);
        }, 100);
    }, []);

    const [sidebarToast, setSidebarToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const showSidebarToast = (msg: string, ok = true) => {
        // Only show if it's not a button-triggered action (or keep for errors)
        if (!ok) {
            setSidebarToast({ msg, ok });
            setTimeout(() => setSidebarToast(null), 2500);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // ─── Auto-save fundamentals (debounce 800ms) ───────────────────────────────
    // Fires whenever any fundamentals field changes; silently syncs to Firestore.
    useEffect(() => {
        if (fundamentalsTimerRef.current) clearTimeout(fundamentalsTimerRef.current);
        fundamentalsTimerRef.current = setTimeout(async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                // Ensure ALL fundamentals are passed to background sync
                await saveMonthlyConfig(user.uid, {
                    investmentHorizon: horizon,
                    riskTolerance: risk,
                    investmentPsychology: psychology,
                    manualIdleFunds: manualIdle,
                    investmentNotes: notes
                });
                // Auto-save no longer toasts to keep UI clean per "button-centric" feedback rule
            } catch {
                // silent fail — user can still manually re-trigger
            }
        }, 800);
        return () => {
            if (fundamentalsTimerRef.current) clearTimeout(fundamentalsTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [horizon, risk, psychology, manualIdle, notes]);

    // ─── Reactive Interconnection (Mutual listening) ──────────────────────────
    // Recalculates the draft prompt in real-time when fundamentals or config changes,
    // ensuring the "Studio" experience stays in sync without requiring re-clicks.
    useEffect(() => {
        if (!selectedStrategyId) return;
        const currentStrategy = strategies.find(s => s.id === selectedStrategyId);
        if (currentStrategy) {
            // Regeneration bypasses the clipboard and status animations to avoid UX noise
            generatePrompt(currentStrategy, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStrategyId, horizon, risk, psychology, manualIdle, notes, config, settings]);

    const loadData = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const [c, s, sn] = await Promise.all([
                getMonthlyConfig(user.uid),
                getUserSettings(user.uid),
                getSnapshots(user.uid)
            ]);

            setConfig(c);
            setSettings(s);
            setSnapshots(sn);

            if (c) {
                setHorizon(c.investmentHorizon || '');
                setRisk(c.riskTolerance || '');
                setPsychology(c.investmentPsychology || '');
                setManualIdle(c.manualIdleFunds?.toString() || '');
                setNotes(c.investmentNotes || '');
            }

            if (s?.aiStrategies?.length) {
                setStrategies(s.aiStrategies);
            }
            if (s?.aiTools?.length) {
                setAiTools(s.aiTools);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generatePrompt = (strategy: AIStrategy, skipClipboard = false) => {
        if (!settings || !config) return;

        const idleNum = parseFloat(manualIdle.replace(/[^0-9.]/g, '')) || 0;
        const totalInvested = config.items.reduce((sum, i) => sum + i.amount, 0);
        const remainingFunds = idleNum - totalInvested;

        const data = {
            items: config.items,
            lastMonthSummary: snapshots[0] ? snapshots[0].allocationSnapshot.map(a => `${a.ticker}: ${a.amount}`).join(', ') : '無歷史紀錄',
            userEmotion: psychology || '中性',
            idleFunds: manualIdle,
            remainingFunds: remainingFunds,
            notes: notes || '無',
            userGoal: settings.financialGoal,
            manualRates: settings.manualExchangeRates || {}
        };

        const systemContext = `
# 角色設定
你是一位擁有 20 年經驗的「量化投資策略師」與「行為金融學顧問」。
你的目標是分析使用者的「每月定期定額配置」，給予精確、具批判性且具備執行力的回饋。

# 使用者基本面
- 投資期限：${horizon || '未設定'}
- 風險承受度：${risk || '未設定'}
- 當前投資心理狀態：${psychology || '未設定'}
- 本月閒置投資金：${manualIdle || '無說明'}
- 使用者備註：${data.notes}

# 本月分配清單 (Monthly Allocation)
${data.items.map(item => `- ${item.ticker}: ${item.currency} ${item.amount}`).join('\n')}
`;

        const modeInstructions: Record<string, string> = {
            discipline: `
## 分析模式：【投資紀律與偏離檢查】
### 任務說明：
請對照上個月的配置 [${data.lastMonthSummary}]。
1. **變動診斷**：分析本月加碼或減碼的比例是否具備策略合理性，還是受近期新聞/情緒影響？
2. **偏差警示**：如果配置高度集中於單一標的，請指出其潛在的「集中風險」。
3. **心理防線**：針對使用者目前的「${data.userEmotion}」情緒，給予一段關於「忽略波動、專注長期」的行為心理學建議。
`,
            market: `
## 分析模式：【分批進場之風險評估】
### 任務說明：
1. **價格水位分析**：利用目前市價與近期趨勢，分析使用者本月的「購買力」。是買在相對高點還是在低位佈局？
2. **資金效率**：評估分配在不同幣別 (${Object.keys(data.manualRates).join(', ')}) 的金額，在當前匯率背景下是否符合換匯效率？
3. **戰術執行**：若使用者本月有「剩餘閒置金 ${data.remainingFunds}」，建議應該如何處理？是保留觀望還是進場攤平？
`,
            projection: `
## 分析模式：【目標達成率與未來推估】
### 任務說明：
1. **複利動能模擬**：假設年化回報率為 7% (保守) 與 10% (樂觀)，根據目前的配置金額，計算 10、20 年後的資產成長規模。
2. **里程碑分析**：離使用者設定的理財目標 [${data.userGoal}] 還有多遠？目前的每月投入額度是否需要上調？
3. **動力賦能**：請生成一個簡單的 ASCII 圖表或 Markdown 表格，展示未來五年的成長趨勢，以強化使用者的投資紀律。
`,
            cashflow: `
## 分析模式：【閒置資金與現金流壓力測試】
### 任務說明：
1. **安全邊際評估**：使用者本月留存現金 ${data.remainingFunds}，請評估在面對市場突發下跌 20% 時，這筆現金緩衝是否充足？
2. **投入比例診斷**：本月投入額度佔總閒置金的比例為 ${parseFloat(data.idleFunds) > 0 ? (((parseFloat(data.idleFunds) - data.remainingFunds) / parseFloat(data.idleFunds)) * 100).toFixed(1) : 0}%。這在當前的經濟環境下是否過於激進？
3. **生活防禦建議**：結合定期定額策略，若下個月突發急用現金需求，建議優先暫停哪一部分的配置以保持現金流？
`
        };

        const formatRequirement = `
---
### 輸出格式規範：
- 請使用繁體中文，語氣保持「專業、冷靜、且略帶啟發性」。
- 輸出內容必須包含：### [診斷報告]、### [執行建議]、### [教練對話紀錄]。
- 內容長度請控制在 800-1000 字左右，確保細節充足。
- 嚴禁回覆「這是不錯的計畫」等空洞評語，必須指出優缺點。
`;

        const instruction = strategy.promptTemplate || modeInstructions[strategy.id] || modeInstructions['discipline'];
        const fullPrompt = systemContext + instruction + formatRequirement;

        setCurrentPrompt(fullPrompt);

        // Use skipClipboard to avoid polluting user's clipboard during auto-updates
        if (!skipClipboard) {
            navigator.clipboard.writeText(fullPrompt);
            triggerBtnStatus('copy', '已複製');
        }
    };

    const handleSaveStrategy = async () => {
        const user = auth.currentUser;
        if (!user || !editingStrategy || !settings) return;

        const newStrategies = strategies.map(s => s.id === editingStrategy.id ? editingStrategy : s);
        if (!strategies.find(s => s.id === editingStrategy.id)) {
            newStrategies.push(editingStrategy);
        }

        setStrategies(newStrategies);
        await saveUserSettings(user.uid, { ...settings, aiStrategies: newStrategies });
        setShowEditModal(false);
    };

    const iconOptions = [
        { type: 'ShieldCheck', icon: <ShieldCheck size={20} /> },
        { type: 'Compass', icon: <Compass size={20} /> },
        { type: 'Target', icon: <Target size={20} /> },
        { type: 'Activity', icon: <Activity size={20} /> },
        { type: 'BrainCircuit', icon: <BrainCircuit size={20} /> },
        { type: 'Zap', icon: <Zap size={20} /> },
        { type: 'BarChart3', icon: <BarChart3 size={20} /> }
    ];

    const getIcon = (type: string) => {
        const option = iconOptions.find(o => o.type === type);
        return option ? option.icon : <Cpu size={18} />;
    };

    const handleSaveFundamentals = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            await saveMonthlyConfig(user.uid, {
                investmentHorizon: horizon,
                riskTolerance: risk,
                investmentPsychology: psychology,
                manualIdleFunds: manualIdle,
                investmentNotes: notes
            });
            triggerBtnStatus('saveF', '背景已儲存');
        } catch (error) {
            console.error('Failed to save fundamentals:', error);
            showSidebarToast('儲存失敗，請稍後再試', false);
        }
    };

    const handleSelectStrategy = (s: AIStrategy) => {
        setSelectedStrategyId(s.id);
        generatePrompt(s);
    };

    const handleDeleteStrategy = (id: string) => {
        setConfirmModal({
            title: '刪除確認',
            message: '確定要刪除此模式嗎？',
            onConfirm: async () => {
                const user = auth.currentUser;
                if (user && settings) {
                    const newStrategies = strategies.filter(s => s.id !== id);
                    setStrategies(newStrategies);
                    await saveUserSettings(user.uid, { ...settings, aiStrategies: newStrategies });
                    if (selectedStrategyId === id) setSelectedStrategyId(null);
                }
                setConfirmModal(null);
            }
        });
    };

    const handleResetDefaults = () => {
        setConfirmModal({
            title: '重設確認',
            message: '確定要將所有策略恢復為預設嗎？',
            onConfirm: async () => {
                const user = auth.currentUser;
                if (user && settings) {
                    setStrategies(INITIAL_STRATEGIES);
                    await saveUserSettings(user.uid, { ...settings, aiStrategies: INITIAL_STRATEGIES });
                }
                setConfirmModal(null);
            }
        });
    };

    const handleAddStrategy = () => {
        setEditingStrategy({
            id: `custom_${Date.now()}`,
            name: '新策略',
            description: '描述您的邏輯...',
            iconType: 'BrainCircuit',
            promptTemplate: ''
        });
        setShowEditModal(true);
    };

    if (loading) return <div className="flex-center" style={{ height: '60vh' }}>載入分析數據中...</div>;

    return (
        <div className="immersive-analyst">
            <style>{`
                .immersive-analyst {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 90px);
                    background: transparent;
                    color: white;
                }

                .studio-layout {
                    display: grid;
                    /* Layout adjusted to 1:1 ratio for background vs editor on desktop */
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 280px;
                    gap: 1.25rem;
                    height: 100%;
                    padding: 1.25rem;
                    overflow: hidden;
                }

                @media (max-width: 1100px) {
                    .studio-layout {
                        grid-template-columns: 1fr 1fr;
                        grid-template-rows: 1fr auto;
                    }
                    .tools-panel {
                        grid-column: 1 / -1;
                        max-height: 220px;
                        overflow-y: auto;
                    }
                }

                @media (max-width: 768px) {
                    .studio-layout {
                        display: flex;
                        flex-direction: column;
                        height: auto;         /* FIX #2: allow natural height on mobile, enables vertical scroll */
                        overflow-y: auto;
                    }
                    /* FIX #2b: iOS Safari ignores overflow:hidden on flex children — allow overflow */
                    .studio-glass-panel {
                        overflow: visible;
                    }
                    .tools-panel { max-height: none; }
                }

                .studio-glass-panel {
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.4);
                }

                .panel-header {
                    padding: 1rem 1.25rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.02);
                }

                .fundamentals-box {
                    padding: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .f-group { display: flex; flex-direction: column; gap: 4px; }
                .f-group label { font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; }
                .f-input {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    padding: 6px 10px;
                    color: white;
                    font-size: 0.85rem;
                }

                .save-f-btn {
                    padding: 8px;
                    background: var(--primary);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                /* ── icon-btn-ghost: WHITE icons, visible on dark background ──────── */
                .icon-btn-ghost {
                    display: inline-flex; align-items: center; justify-content: center;
                    padding: 8px; border-radius: 8px; border: none; background: transparent;
                    color: rgba(255,255,255,0.7);   /* WHITE — not dark grey */
                    cursor: pointer; transition: all 0.2s;
                    min-width: 32px; min-height: 32px;
                }
                .icon-btn-ghost:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                }
                .icon-btn-ghost.danger:hover {
                    background: rgba(100,116,139,0.15);
                    color: rgba(248,250,252,0.9);
                }

                /* ── f-select: styled native dropdown aligned with f-input ──────── */
                .f-select {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px;
                    padding: 6px 28px 6px 10px;
                    color: white;
                    font-size: 0.85rem;
                    font-family: inherit;
                    appearance: none;
                    -webkit-appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 6px center;
                    background-size: 14px;
                    width: 100%;
                    cursor: pointer;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .f-select:focus { border-color: var(--primary); }
                .f-select option { background: #0f172a; color: white; }


                /* KEY FIX: sidebar itself follows a fixed layout but lets the body handle content overspill */
                .studio-sidebar {
                    height: 100%;
                    overflow: hidden !important; /* Panel itself shouldn't scroll, its body should */
                }

                /* sidebar-body: scrollable container for ALL sidebar content */
                .sidebar-body {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    overflow-y: auto !important;
                    min-height: 0;
                    padding-bottom: 2rem; /* space for notes area and buttons */
                }
                .sidebar-body::-webkit-scrollbar { display: none; }

                .scroll-content { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
                .scroll-content::-webkit-scrollbar { display: none; }


                .mode-item-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 1rem;
                    padding: 1rem;
                    text-align: left;
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }
                .mode-item-card:hover { background: rgba(255, 255, 255, 0.04); transform: translateY(-2px); }
                .mode-item-card.active { border-color: var(--primary); background: rgba(99, 102, 241, 0.1); }

                .mode-icon-box {
                    width: 36px; height: 36px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(255, 255, 255, 0.03); color: var(--text-muted);
                }
                .active .mode-icon-box { background: var(--primary); color: white; }

                .mode-info .name { font-weight: 600; font-size: 0.9rem; margin-bottom: 2px; }
                .mode-info .desc { font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; }

                .editor-toolbar { padding: 0.75rem 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center; }
                .editor-area { flex: 1; padding: 1.25rem; display: flex; flex-direction: column; }
                .prompt-textarea {
                    flex: 1; background: transparent; border: none; color: white;
                    font-family: 'JetBrains Mono', monospace; font-size: 1rem;
                    line-height: 1.6; resize: none; outline: none;
                }

                /* FIX #3: prevent textarea from collapsing to 0px in mobile stacked layout */
                @media (max-width: 768px) {
                    .editor-area { min-height: 260px; }
                    .prompt-textarea { min-height: 220px; flex: none; height: auto; }
                }

                .ai-tool-btn {
                    width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px;
                    color: white; display: flex; align-items: center; justify-content: space-between;
                    text-decoration: none; transition: all 0.2s;
                }
                .ai-tool-btn:hover { background: rgba(255, 255, 255, 0.06); border-color: var(--primary); }

                .giant-action-btn {
                    width: 100%; height: 50px; background: linear-gradient(135deg, var(--primary), var(--accent));
                    color: white; border: none; border-radius: 12px; font-weight: 700;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.3); transition: all 0.2s;
                    cursor: pointer;
                }
                .giant-action-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.4); }
                .giant-action-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }

                .pulse-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    /* Brand color (Indigo) replaces green — design language §7 */
                    background: var(--primary);
                    box-shadow: 0 0 10px var(--primary);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse { 0% { opacity: 0.4; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.4; transform: scale(0.9); } }

            `}</style>

            <div className="studio-layout">
                {/* 1. Sidebar */}
                <aside className="studio-glass-panel studio-sidebar">
                    {/* Single sticky header at very top */}
                    <div className="panel-header" style={{ position: 'sticky', top: 0, zIndex: 2, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)' }}>
                        <div className="flex-center" style={{ gap: '8px' }}>
                            <Settings size={16} color="var(--primary)" />
                            <h3 style={{ fontSize: '0.85rem', margin: 0 }}>投資背景</h3>
                        </div>
                    </div>

                    {/* sidebar-body: scrollable container for ALL sidebar content */}
                    <div className="sidebar-body">
                        {/* -- Investment Fundamentals -- */}
                        <div className="fundamentals-box">
                            {/* 投資期限 — select options */}
                            <div className="f-group">
                                <label>投資期限</label>
                                <select className="f-select" value={horizon} onChange={e => setHorizon(e.target.value)}>
                                    <option value="">— 選擇 —</option>
                                    <option value="1–3 年">1–3 年</option>
                                    <option value="3–5 年">3–5 年</option>
                                    <option value="5–10 年">5–10 年</option>
                                    <option value="10–20 年">10–20 年</option>
                                    <option value="20 年以上">20 年以上</option>
                                </select>
                            </div>
                            {/* 風險承受 — select options */}
                            <div className="f-group">
                                <label>風險承受</label>
                                <select className="f-select" value={risk} onChange={e => setRisk(e.target.value)}>
                                    <option value="">— 選擇 —</option>
                                    <option value="保守（< 10% 波動）">保守（&lt; 10% 波動）</option>
                                    <option value="穩健（10–20% 波動）">穩健（10–20% 波動）</option>
                                    <option value="積極（20–30% 波動）">積極（20–30% 波動）</option>
                                    <option value="高積極（> 30% 波動）">高積極（&gt; 30% 波動）</option>
                                </select>
                            </div>
                            {/* 當前心理 — select options */}
                            <div className="f-group">
                                <label>當前心理</label>
                                <select className="f-select" value={psychology} onChange={e => setPsychology(e.target.value)}>
                                    <option value="">— 選擇 —</option>
                                    <option value="平靜理性">平靜理性</option>
                                    <option value="輕微焦慮">輕微焦慮</option>
                                    <option value="明顯焦慮">明顯焦慮</option>
                                    <option value="過度樂觀">過度樂觀</option>
                                    <option value="恐慌">恐慌</option>
                                    <option value="無特別感受">無特別感受</option>
                                </select>
                            </div>
                            {/* 閒置資金 — free text input */}
                            <div className="f-group">
                                <label>閒置資金</label>
                                <input type="text" className="f-input" placeholder="例：5萬加幣、需觀察" value={manualIdle} onChange={e => setManualIdle(e.target.value)} />
                            </div>
                            {/* 備註 — custom notes */}
                            <div className="f-group">
                                <label>備註</label>
                                <textarea
                                    className="f-input"
                                    style={{ height: '60px', resize: 'none' }}
                                    placeholder="其他補充資訊..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                            {/* Manual save button (auto-save also runs on change) */}
                            <button className="save-f-btn" onClick={handleSaveFundamentals} style={{ position: 'relative', overflow: 'hidden' }}>
                                <div className={`status-btn-content ${btnStatus.saveF === 'EXIT' ? 'exit' : (btnStatus.saveF === 'RESTORE' ? 'enter' : (btnStatus.saveF ? 'hidden' : ''))}`}>
                                    <Save size={14} /> 立即儲存
                                </div>
                                {btnStatus.saveF && btnStatus.saveF !== 'EXIT' && btnStatus.saveF !== 'RESTORE' && (
                                    <div className="status-btn-content enter" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}>
                                        <CheckCircle2 size={14} /> {btnStatus.saveF}
                                    </div>
                                )}
                            </button>
                            {/* Brand-colored inline toast — NO green */}
                            {sidebarToast && (
                                <div style={{
                                    padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                                    background: sidebarToast.ok ? 'rgba(99,102,241,0.2)' : 'rgba(100,116,139,0.25)',
                                    border: `1px solid ${sidebarToast.ok ? 'rgba(99,102,241,0.5)' : 'rgba(100,116,139,0.4)'}`,
                                    color: sidebarToast.ok ? '#a5b4fc' : '#94a3b8',
                                    textAlign: 'center'
                                }}>
                                    {sidebarToast.msg}
                                </div>
                            )}
                        </div>

                        {/* -- Strategy Library -- */}
                        <div className="panel-header" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex-center" style={{ gap: '8px' }}>
                                <Sparkles size={16} color="var(--primary)" />
                                <h3 style={{ fontSize: '0.85rem', margin: 0 }}>策略庫</h3>
                            </div>
                            <div className="flex-center" style={{ gap: '4px' }}>
                                <button className="icon-btn-ghost" onClick={handleResetDefaults} title="恢復預設"><RotateCcw size={14} /></button>
                                <button className="icon-btn-ghost" onClick={handleAddStrategy} title="新增"><Plus size={16} /></button>
                            </div>
                        </div>

                        <div className="scroll-content">
                            {strategies.map(s => (
                                <div key={s.id} className={`mode-item-card ${selectedStrategyId === s.id ? 'active' : ''}`} onClick={() => handleSelectStrategy(s)}>
                                    <div className="mode-icon-box">{getIcon(s.iconType)}</div>
                                    <div className="mode-info">
                                        <div className="name">{s.name}</div>
                                        <div className="desc">{s.description}</div>
                                    </div>
                                    {selectedStrategyId === s.id && (
                                        <div className="abs-top-right flex-center" style={{ padding: '8px', gap: '4px' }}>
                                            <button className="icon-btn-ghost" onClick={(e) => { e.stopPropagation(); setEditingStrategy(s); setShowEditModal(true); }}><Edit2 size={12} /></button>
                                            <button className="icon-btn-ghost danger" onClick={(e) => { e.stopPropagation(); handleDeleteStrategy(s.id); }}><Trash2 size={12} /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>{/* end sidebar-body */}
                </aside>


                {/* 2. Main Area */}
                <main className="studio-glass-panel">
                    <div className="editor-toolbar">
                        <div className="flex-center" style={{ gap: '10px' }}>
                            <MessageSquare size={16} color="var(--secondary)" />
                            <h3 style={{ fontSize: '0.9rem', margin: 0 }}>Prompt 編輯器</h3>
                        </div>
                        <button className={`btn-secondary ${btnStatus.copy ? 'active' : ''}`} onClick={() => { navigator.clipboard.writeText(currentPrompt); triggerBtnStatus('copy', '已複製'); }} style={{ height: '32px', fontSize: '0.8rem', position: 'relative', overflow: 'hidden', minWidth: '100px' }}>
                            <div className={`status-btn-content ${btnStatus.copy === 'EXIT' ? 'exit' : (btnStatus.copy === 'RESTORE' ? 'enter' : (btnStatus.copy ? 'hidden' : ''))}`}>
                                <Copy size={14} /> 複製 Prompt
                            </div>
                            {btnStatus.copy && btnStatus.copy !== 'EXIT' && btnStatus.copy !== 'RESTORE' && (
                                <div className="status-btn-content enter" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}>
                                    <CheckCircle2 size={14} /> {btnStatus.copy}
                                </div>
                            )}
                        </button>
                    </div>
                    <div className="editor-area">
                        {currentPrompt ? (
                            <textarea ref={editorRef} className="prompt-textarea" value={currentPrompt} onChange={e => setCurrentPrompt(e.target.value)} />
                        ) : (
                            <div className="empty-state flex-center flex-column" style={{ opacity: 0.3, height: '100%' }}>
                                <BrainCircuit size={48} />
                                <p>請選擇分析模式以開始</p>
                            </div>
                        )}
                    </div>
                </main>

                {/* 3. Right Panel */}
                <aside className="studio-glass-panel tools-panel">
                    <div className="panel-header">
                        <div className="flex-center" style={{ gap: '8px' }}>
                            <Zap size={16} color="var(--accent)" />
                            <h3 style={{ fontSize: '0.85rem', margin: 0 }}>前往 AI 工具</h3>
                        </div>
                        <button className="icon-btn-ghost" onClick={() => setShowToolManager(true)}><Settings size={16} /></button>
                    </div>

                    <div className="scroll-content" style={{ padding: '1.25rem' }}>
                        {aiTools.length > 0 ? aiTools.map(tool => (
                            <a key={tool.id} href={tool.url} target="_blank" rel="noreferrer" className="ai-tool-btn" style={{ marginBottom: '10px' }}>
                                <div className="flex-center" style={{ gap: '10px' }}>
                                    <Sparkles size={16} />
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{tool.name}</span>
                                </div>
                                <ChevronRight size={14} opacity={0.5} />
                            </a>
                        )) : (
                            <div className="empty-tools" style={{ textAlign: 'center', padding: '1.5rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                尚未設定工具
                                <button className="btn-primary" style={{ width: '100%', marginTop: '1rem', height: '32px' }} onClick={() => setShowToolManager(true)}>立即設定</button>
                            </div>
                        )}

                        <div className="status-indicator" style={{ marginTop: '1.5rem' }}>
                            <div className="flex-center" style={{ gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {/* Indigo pulse-dot replaces green — design language §7 */}
                                <div className={currentPrompt ? 'pulse-dot' : ''} style={{ width: '8px', height: '8px', background: currentPrompt ? 'var(--primary)' : 'rgba(100,116,139,0.4)', borderRadius: '50%', flexShrink: 0 }}></div>
                                {currentPrompt ? 'Prompt 已就緒' : '待命'}
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <button className="giant-action-btn" disabled={!currentPrompt || aiTools.length === 0} onClick={() => window.open(aiTools[0].url, '_blank')}>
                                <ExternalLink size={18} /> 快速啟動分析
                            </button>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.5 }}>
                                建議先點擊「複製 Prompt」<br />再啟動 AI 工具貼上對話
                            </p>
                        </div>
                    </div>
                    <div style={{ marginTop: 'auto', padding: '1rem', textAlign: 'center', opacity: 0.3, fontSize: '0.6rem' }}>
                        JING LAB AI STUDIO v4.0.0
                    </div>
                </aside>
            </div>

            {/* Modals */}
            {showEditModal && editingStrategy && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>策略編輯</h3>
                            <button className="icon-btn-ghost" onClick={() => setShowEditModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="form-group">
                                <label>名稱</label>
                                <input className="input-field w-full" value={editingStrategy.name} onChange={e => setEditingStrategy({ ...editingStrategy, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>描述</label>
                                <input className="input-field w-full" value={editingStrategy.description} onChange={e => setEditingStrategy({ ...editingStrategy, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>圖示</label>
                                <div className="flex-wrap" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    {iconOptions.map(opt => (
                                        <button key={opt.type} className={`icon-opt ${editingStrategy.iconType === opt.type ? 'active' : ''}`} onClick={() => setEditingStrategy({ ...editingStrategy, iconType: opt.type })}>
                                            {opt.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>自訂 Prompt (選填)</label>
                                <textarea className="input-field w-full" style={{ height: '120px' }} value={editingStrategy.promptTemplate} onChange={e => setEditingStrategy({ ...editingStrategy, promptTemplate: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary w-full" onClick={handleSaveStrategy}><Save size={18} /> 儲存變更</button>
                        </div>
                    </div>
                </div>
            )}

            {showToolManager && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>工具管理</h3>
                            <button className="icon-btn-ghost" onClick={() => setShowToolManager(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            {aiTools.map((tool, idx) => (
                                /* FIX #4: flex-wrap allows name+url to stack on narrow screens; min-width:0 prevents overflow */
                                <div key={tool.id} style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <input
                                        className="input-field"
                                        style={{ flex: '0 0 88px', minWidth: 0 }}
                                        value={tool.name}
                                        placeholder="名稱"
                                        onChange={e => {
                                            const nt = [...aiTools]; nt[idx].name = e.target.value; setAiTools(nt);
                                        }}
                                    />
                                    <input
                                        className="input-field"
                                        style={{ flex: '1 1 160px', minWidth: 0 }}
                                        value={tool.url}
                                        placeholder="https://..."
                                        onChange={e => {
                                            const nt = [...aiTools]; nt[idx].url = e.target.value; setAiTools(nt);
                                        }}
                                    />
                                    <button className="icon-btn-ghost danger" onClick={() => setAiTools(aiTools.filter(t => t.id !== tool.id))}><Trash2 size={16} /></button>
                                </div>
                            ))}
                            <button className="btn-secondary w-full" onClick={() => setAiTools([...aiTools, { id: Date.now().toString(), name: 'New Tool', url: 'https://' }])}>
                                <Plus size={16} /> 新增工具
                            </button>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary w-full" onClick={async () => {
                                const user = auth.currentUser;
                                // FIX #5: spread existing settings to prevent aiStrategies and other fields from being overwritten
                                if (user && settings) await saveUserSettings(user.uid, { ...settings, aiTools });
                                setShowToolManager(false);
                            }}><Save size={18} /> 儲存設定</button>
                        </div>
                    </div>
                </div>
            )}

            {confirmModal && (
                <ConfirmModal
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
        </div>
    );
}
