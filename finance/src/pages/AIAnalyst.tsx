import { useState, useEffect, useMemo } from 'react';
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
    Plus,
    Edit2,
    Trash2,
    X,
    AlertCircle,
    Zap,
    Activity,
    Compass,
    PieChart,
    Clock,
    RotateCcw,
    LineChart,
    ChevronRight,
    MessageSquare,
    Sparkles
} from 'lucide-react';
import { auth } from '../firebase';
import { getMonthlyConfig, getUserSettings, getSnapshots, saveUserSettings } from '../services/db';
import { MonthlyConfig, UserSettings, Snapshot, AIStrategy, AITool } from '../types';

const INITIAL_STRATEGIES: AIStrategy[] = [
    {
        id: 'monthly-discipline',
        name: '本月紀律校準',
        description: '分析本月投資原因與實際執行計畫的契合度。',
        iconType: 'BrainCircuit',
        promptTemplate: `角色定義：你是一位專精於行為財務學與資產配置的資深投資教練。

我的本月配置現況 (以 \${baseCurrency} 計價)：
- 預定投入總預算：\${idleFunds}
- 實際執行配置列表：
\${monthlyAllocationList}

- 投資心得與調整原因 (Rationale)：
\${rationale}

歷史成長軌跡：
\${historicalTrends}

請根據以上數據進行「紀律面」分析：
1. 決策一致性：根據我的「投資原因」，評估這次的標的選擇是否符合我自述的邏輯？是否有過度情緒化或追高殺跌的跡象？
2. 資金池管理：目前的投入金額對比建議的每月額度，是否過於積極或保守？
3. 優化動議：下個月在「心理建設」或「比例微調」上，可以有什麼具體的精進動作？`
    },
    {
        id: 'allocation-visualizer',
        name: '資產權重透視',
        description: '計算當前計畫在不同幣別與標的間的分配健康度。',
        iconType: 'Target',
        promptTemplate: `角色定義：你是一位精確的資產配置系統專家。

本月計畫詳情：
- 計畫總額：\${totalMonthlyInvestment} \${baseCurrency}
- 配置詳細：
\${monthlyAllocationList}

請產出：
1. 配置結構分析：目前的幣別風險 (TWD/USD/JPY) 以及標的標的分散程度。
2. 紀律評估：此配置是否遵循了穩定投入的原則？
3. 下月預演：若市況變動，是否有預留足夠的現金彈性？`
    },
    {
        id: 'goal-path',
        name: '財務目標路徑預測',
        description: '結合複利計算，估算距離財務自由還有多遠。',
        iconType: 'Zap',
        promptTemplate: `角色定義：你是一位理財規劃師（CFP）。

我的理財目標：
\${financialGoal} TWD

目前的資源與速度：
- 每月平均投入額：\${totalMonthlyInvestment} \${baseCurrency}
- 歷史月度投入走勢：
\${historicalTrends}

請幫我計算與評估：
1. 達標時程預測：以年化報酬率 5%, 7%, 10% 分別預估達成目標所需的剩餘年數。
2. 速度分析：目前的投入強度是否足夠？
3. 加速方案：若想提前 3 年達成目標，我應該如何調整我的月投入預算？`
    }
];

const DEFAULT_TOOLS: AITool[] = [
    { id: 'gemini', name: 'Google Gemini', url: 'https://gemini.google.com' },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com' },
    { id: 'claude', name: 'Claude AI', url: 'https://claude.ai/chats' }
];

export default function AIAnalyst() {
    const [config, setConfig] = useState<MonthlyConfig | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(true);

    const [strategies, setStrategies] = useState<AIStrategy[]>(INITIAL_STRATEGIES);
    const [aiTools, setAiTools] = useState<AITool[]>(DEFAULT_TOOLS);
    const [selectedToolId, setSelectedToolId] = useState('gemini');
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
    const [currentPrompt, setCurrentPrompt] = useState<string>('');
    const [isCopied, setIsCopied] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingStrategy, setEditingStrategy] = useState<AIStrategy | null>(null);
    const [showToolManager, setShowToolManager] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

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

    const iconOptions = [
        { type: 'BrainCircuit', icon: <BrainCircuit size={20} /> },
        { type: 'Target', icon: <Target size={20} /> },
        { type: 'Zap', icon: <Zap size={20} /> },
        { type: 'TrendingUp', icon: <TrendingUp size={20} /> },
        { type: 'Activity', icon: <Activity size={20} /> },
        { type: 'Compass', icon: <Compass size={20} /> },
        { type: 'PieChart', icon: <PieChart size={20} /> },
        { type: 'Clock', icon: <Clock size={20} /> },
        { type: 'LineChart', icon: <LineChart size={20} /> }
    ];

    const getIcon = (type: string) => {
        const option = iconOptions.find(o => o.type === type);
        return option ? option.icon : <Cpu size={18} />;
    };

    const generatePrompt = (strategy: AIStrategy) => {
        if (!settings) return;

        const monthlyAllocation = config?.items
            .map(a => `- ${a.ticker || '未指定'}: ${a.amount.toLocaleString()} ${a.currency} (${a.category})`)
            .join('\n') || '尚未設定';

        const totalMonthly = config?.items.reduce((sum, a) => {
            const rate = a.currency === 'USD' ? (settings.manualExchangeRates?.['USD'] || 33) :
                a.currency === 'JPY' ? (settings.manualExchangeRates?.['JPY'] || 0.22) : 1;
            return sum + (a.amount * rate);
        }, 0) || 0;

        const trends = snapshots.slice(0, 6)
            .map(s => `- ${s.yearMonth}: 投入 $${(s.totalInvestedInBase || 0).toLocaleString()} ${settings.baseCurrency}`)
            .join('\n');

        const idleFundsBreakdown = config?.idleFundsByCurrency
            ? Object.entries(config.idleFundsByCurrency)
                .filter(([_, data]) => (data as any).amount > 0)
                .map(([currency, data]) => `${(data as any).amount.toLocaleString()} ${currency}`)
                .join(', ') || '0'
            : '0';

        const prompt = strategy.promptTemplate
            .replace(/\${baseCurrency}/g, settings.baseCurrency)
            .replace(/\${monthlyAllocationList}/g, monthlyAllocation)
            .replace(/\${financialGoal}/g, (settings.financialGoal || '未設定').toString())
            .replace(/\${totalMonthlyInvestment}/g, totalMonthly.toLocaleString())
            .replace(/\${historicalTrends}/g, trends || '無歷史數據')
            .replace(/\${idleFunds}/g, idleFundsBreakdown)
            .replace(/\${rationale}/g, config?.rationale || '無');

        setCurrentPrompt(prompt);
        // Auto copy upon selection
        navigator.clipboard.writeText(prompt);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleSaveStrategy = async () => {
        const user = auth.currentUser;
        if (!user || !editingStrategy || !settings) return;

        let newStrategies;
        if (strategies.find(s => s.id === editingStrategy.id)) {
            newStrategies = strategies.map(s => s.id === editingStrategy.id ? editingStrategy : s);
        } else {
            newStrategies = [...strategies, editingStrategy];
        }

        setStrategies(newStrategies);
        await saveUserSettings(user.uid, { ...settings, aiStrategies: newStrategies });
        setShowEditModal(false);
    };

    const handleDeleteStrategy = async (id: string) => {
        const user = auth.currentUser;
        if (!user || !confirm('確定要刪除此模式嗎？') || !settings) return;
        const newStrategies = strategies.filter(s => s.id !== id);
        setStrategies(newStrategies);
        await saveUserSettings(user.uid, { ...settings, aiStrategies: newStrategies });
        if (selectedStrategyId === id) setSelectedStrategyId(null);
    };

    const handleResetDefaults = async () => {
        const user = auth.currentUser;
        if (!user || !confirm('確定要將所有 AI 策略恢復為系統推薦範本嗎？這將覆蓋您目前的修改。')) return;
        setStrategies(INITIAL_STRATEGIES);
        if (settings) {
            await saveUserSettings(user.uid, { ...settings, aiStrategies: INITIAL_STRATEGIES });
        }
    };

    const handleAddStrategy = () => {
        setEditingStrategy({
            id: `custom_${Date.now()}`,
            name: '新策略',
            description: '描述您的分析邏輯...',
            iconType: 'BrainCircuit',
            promptTemplate: '輸入您的 Prompt 範本，可使用 ${totalValue} 等變數...'
        });
        setShowEditModal(true);
    };

    if (loading) return <div className="flex-center" style={{ height: '60vh' }}>載入分析數據中...</div>;

    const currentTool = aiTools.find(t => t.id === selectedToolId) || aiTools[0];

    return (
        <div className="animate-fade-in analyst-container">
            <header className="analyst-header">
                <div>
                    <h1 className="text-gradient">AI 投資策略師</h1>
                    <p style={{ color: 'var(--text-muted)' }}>將您的資產數據轉化為深度的 AI 分析模式</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => setShowToolManager(true)}>
                        <Settings size={18} /> 工具設置
                    </button>
                    <button className="btn-primary" onClick={handleAddStrategy}>
                        <Plus size={18} /> 新增模式
                    </button>
                </div>
            </header>

            <div className="three-column-grid">
                {/* Column 1: Modes List */}
                <div className="column modes-column">
                    <div className="glass-card full-height">
                        <div className="column-header">
                            <div className="title-wrap">
                                <Sparkles size={18} color="var(--primary)" />
                                <h3>模式切換</h3>
                            </div>
                            <button className="icon-btn-ghost" onClick={handleResetDefaults} title="恢復預設">
                                <RotateCcw size={16} />
                            </button>
                        </div>
                        <div className="modes-list">
                            {strategies.map(strategy => (
                                <div
                                    key={strategy.id}
                                    className={`strategy-item ${selectedStrategyId === strategy.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedStrategyId(strategy.id);
                                        generatePrompt(strategy);
                                    }}
                                >
                                    <div className="strategy-icon-wrap">
                                        {getIcon(strategy.iconType)}
                                    </div>
                                    <div className="strategy-text">
                                        <div className="name">{strategy.name}</div>
                                        <div className="desc">{strategy.description}</div>
                                    </div>
                                    <div className="strategy-actions">
                                        <button className="action-btn" onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingStrategy(strategy);
                                            setShowEditModal(true);
                                        }}><Edit2 size={14} /></button>
                                        <button className="action-btn danger" onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteStrategy(strategy.id);
                                        }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Column 2: Prompt Editor */}
                <div className="column editor-column">
                    <div className="glass-card full-height editor-card">
                        <div className="column-header">
                            <div className="title-wrap">
                                <MessageSquare size={18} color="var(--secondary)" />
                                <h3>Prompt 預覽與編輯</h3>
                            </div>
                            <button
                                className={`copy-btn ${isCopied ? 'active' : ''}`}
                                onClick={() => {
                                    navigator.clipboard.writeText(currentPrompt);
                                    setIsCopied(true);
                                    setTimeout(() => setIsCopied(false), 2000);
                                }}
                            >
                                {isCopied ? <><Check size={16} /> 已複製</> : <><Copy size={16} /> 複製 Prompt</>}
                            </button>
                        </div>
                        <div className="editor-wrap">
                            {currentPrompt ? (
                                <textarea
                                    className="prompt-textarea"
                                    value={currentPrompt}
                                    onChange={(e) => setCurrentPrompt(e.target.value)}
                                />
                            ) : (
                                <div className="empty-editor">
                                    <BrainCircuit size={48} color="var(--surface-border)" />
                                    <p>請從左側選擇一個分析模式</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column 3: Tools & Actions */}
                <div className="column tools-column">
                    <div className="glass-card full-height">
                        <div className="column-header">
                            <div className="title-wrap">
                                <Cpu size={18} color="var(--accent)" />
                                <h3>AI 分析工具</h3>
                            </div>
                        </div>
                        <div className="tools-selection">
                            <label className="input-label">選擇首選 AI</label>
                            <select
                                className="input-field w-full"
                                value={selectedToolId}
                                onChange={(e) => setSelectedToolId(e.target.value)}
                                style={{ marginBottom: '1.5rem' }}
                            >
                                {aiTools.map(tool => (
                                    <option key={tool.id} value={tool.id}>{tool.name}</option>
                                ))}
                            </select>

                            <div className="tool-info-card">
                                <div className="tool-name">{currentTool.name}</div>
                                <div className="tool-status">
                                    <div className="status-dot"></div>
                                    READY TO ANALYZE
                                </div>
                            </div>
                        </div>

                        <div className="actions-footer">
                            <button
                                className={`btn-primary w-full launch-btn ${!currentPrompt ? 'disabled' : ''}`}
                                onClick={() => currentPrompt && window.open(currentTool.url, '_blank')}
                                disabled={!currentPrompt}
                            >
                                <ExternalLink size={18} /> 啟動分析室
                            </button>
                            <p className="hint-text">點擊後將會在新視窗開啟 AI 工具，請直接貼上已複製的 Prompt。</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals from before, slightly updated */}
            {showEditModal && editingStrategy && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ width: '600px', maxHeight: '90vh' }}>
                        <div className="modal-header">
                            <h3>模式與範本設定</h3>
                            <button className="icon-btn-ghost" onClick={() => setShowEditModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: 'calc(90vh - 150px)', overflowY: 'auto', padding: '1.5rem' }}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>模式名稱</label>
                                    <input type="text" className="input-field w-full" value={editingStrategy.name} onChange={e => setEditingStrategy({ ...editingStrategy, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>簡短描述</label>
                                    <input type="text" className="input-field w-full" value={editingStrategy.description} onChange={e => setEditingStrategy({ ...editingStrategy, description: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label>模式圖示</label>
                                <div className="icon-selector">
                                    {iconOptions.map(opt => (
                                        <button key={opt.type} className={`icon-opt ${editingStrategy.iconType === opt.type ? 'active' : ''}`} onClick={() => setEditingStrategy({ ...editingStrategy, iconType: opt.type })}>
                                            {opt.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label>Prompt 範本</label>
                                <textarea className="input-field w-full" style={{ height: '240px', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6' }} value={editingStrategy.promptTemplate} onChange={e => setEditingStrategy({ ...editingStrategy, promptTemplate: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '1.5rem' }}>
                            <button className="btn-primary w-full" onClick={handleSaveStrategy}><Save size={18} /> 儲存變更</button>
                        </div>
                    </div>
                </div>
            )}

            {showToolManager && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ width: '450px' }}>
                        <div className="modal-header">
                            <h3>工具連結管理</h3>
                            <button className="icon-btn-ghost" onClick={() => setShowToolManager(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '1.5rem' }}>
                            <div className="tool-list">
                                {aiTools.map((tool, index) => (
                                    <div key={tool.id} className="tool-edit-item">
                                        <div style={{ flex: 1 }}>
                                            <input type="text" className="input-field w-full" style={{ marginBottom: '8px' }} placeholder="工具名稱" value={tool.name} onChange={e => {
                                                const newTools = [...aiTools];
                                                newTools[index].name = e.target.value;
                                                setAiTools(newTools);
                                            }} />
                                            <input type="text" className="input-field w-full" placeholder="URL" value={tool.url} onChange={e => {
                                                const newTools = [...aiTools];
                                                newTools[index].url = e.target.value;
                                                setAiTools(newTools);
                                            }} />
                                        </div>
                                        <button className="icon-btn-ghost danger" onClick={() => {
                                            const newTools = aiTools.filter((_, i) => i !== index);
                                            setAiTools(newTools);
                                        }}><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                            <button className="btn-secondary w-full" style={{ marginTop: '1rem' }} onClick={() => setAiTools([...aiTools, { id: `tool_${Date.now()}`, name: 'New Tool', url: 'https://' }])}>
                                <Plus size={16} /> 新增連結
                            </button>
                        </div>
                        <div className="modal-footer" style={{ padding: '1.5rem' }}>
                            <button className="btn-primary w-full" onClick={async () => {
                                const user = auth.currentUser;
                                if (settings && user) await saveUserSettings(user.uid, { ...settings, aiTools });
                                setShowToolManager(false);
                            }}><Save size={18} /> 儲存並關閉</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .analyst-container { padding: 1rem 0; height: calc(100vh - 120px); display: flex; flex-direction: column; }
                .analyst-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-shrink: 0; }
                .header-actions { display: flex; gap: 0.8rem; }
                
                .three-column-grid { 
                    display: grid; 
                    grid-template-columns: 300px 1fr 280px; 
                    gap: 1.5rem; 
                    flex: 1; 
                    min-height: 0; /* Important for flex child */
                }
                
                .column { height: 100%; display: flex; flex-direction: column; }
                .full-height { flex: 1; display: flex; flex-direction: column; padding: 1.2rem; }
                
                .column-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; flex-shrink: 0; }
                .title-wrap { display: flex; align-items: center; gap: 0.6rem; }
                .title-wrap h3 { font-size: 1rem; color: var(--text-main); }
                
                /* Modes List Column */
                .modes-list { flex: 1; overflow-y: auto; padding-right: 4px; }
                .strategy-item { 
                    background: rgba(255,255,255,0.03); 
                    border: 1px solid transparent;
                    border-radius: 1rem; 
                    padding: 1rem; 
                    margin-bottom: 0.8rem;
                    cursor: pointer;
                    transition: var(--transition);
                    display: flex;
                    align-items: flex-start;
                    gap: 0.8rem;
                    position: relative;
                }
                .strategy-item:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.05); }
                .strategy-item.active { background: rgba(99, 102, 241, 0.1); border-color: var(--primary); }
                
                .strategy-icon-wrap { width: 36px; height: 36px; border-radius: 10px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
                .strategy-text { flex: 1; min-width: 0; }
                .strategy-text .name { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.2rem; color: var(--text-main); }
                .strategy-text .desc { font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                
                .strategy-actions { display: flex; flex-direction: column; gap: 4px; opacity: 0; transition: opacity 0.2s; }
                .strategy-item:hover .strategy-actions { opacity: 1; }
                .action-btn { padding: 4px; color: var(--text-muted); }
                .action-btn:hover { color: var(--text-main); }
                .action-btn.danger:hover { color: var(--error); }

                /* Editor Column */
                .editor-card { padding: 1.5rem; }
                .copy-btn { 
                    padding: 0.5rem 1rem; 
                    background: rgba(255,255,255,0.05); 
                    border-radius: 8px; 
                    font-size: 0.85rem; 
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    border: 1px solid transparent;
                }
                .copy-btn.active { color: var(--success); border-color: var(--success); background: rgba(16, 185, 129, 0.05); }
                .editor-wrap { flex: 1; min-height: 0; }
                .prompt-textarea { 
                    width: 100%; 
                    height: 100%; 
                    background: transparent; 
                    border: none; 
                    color: var(--text-main); 
                    font-family: inherit; 
                    font-size: 0.95rem; 
                    line-height: 1.6; 
                    resize: none; 
                    outline: none;
                    white-space: pre-wrap;
                }
                .empty-editor { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); gap: 1rem; opacity: 0.5; }

                /* Tools Column */
                .tools-selection { padding: 1rem 0; }
                .tool-info-card { 
                    background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.1)); 
                    border-radius: 1rem; 
                    padding: 1.5rem;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .tool-name { font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem; }
                .tool-status { display: flex; align-items: center; gap: 0.5rem; font-size: 10px; font-weight: 800; color: var(--secondary); letter-spacing: 1px; }
                .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--secondary); box-shadow: 0 0 10px var(--secondary); }
                
                .actions-footer { margin-top: auto; padding-top: 2rem; border-top: 1px solid var(--surface-border); }
                .launch-btn { height: 54px; font-size: 1.05rem; letter-spacing: 0.5px; }
                .hint-text { font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-top: 1rem; line-height: 1.5; padding: 0 0.5rem; }

                /* Modal Specifics */
                .icon-selector { display: flex; gap: 8px; flex-wrap: wrap; }
                .icon-opt { padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid transparent; color: var(--text-muted); }
                .icon-opt.active { background: rgba(99, 102, 241, 0.1); border-color: var(--primary); color: var(--primary); }
                
                .tool-edit-item { display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center; }
            `}</style>
        </div>
    );
}
