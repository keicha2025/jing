import { useState, useEffect } from 'react';
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
    LineChart
} from 'lucide-react';
import { auth } from '../firebase';
import { getHoldings, getMonthlyConfig, getUserSettings, getSnapshots, saveUserSettings } from '../services/db';
import { Holding, MonthlyConfig, UserSettings, Snapshot, AIStrategy, AITool } from '../types';

const INITIAL_STRATEGIES: AIStrategy[] = [
    {
        id: 'all-round-check',
        name: '全方位資產回顧',
        description: '每月 1 號生成快照後，進行整體的策略對齊。',
        iconType: 'BrainCircuit',
        promptTemplate: `角色定義：你是一位專精於全球資產配置（Global Asset Allocation）與定期定額（DCA）策略的資深投資分析師。

我的現況數據 (以 \${baseCurrency} 計價)：
- 總資產規模：\${totalValue}
- 本月可用閒置資金：\${idleFunds}
- 目前的庫存組合：
\${currentHoldingsList}

本月執行計畫：
- 定期定額配置：
\${monthlyAllocationList}
- 本月投資心得與調整原因：
\${rationale}

- 本月與上月配置變動 (MoM Diff)：
\${varianceAnalysis}

請根據以上數據進行分析並給予建議：
1. 決策校準：根據我的「投資心得與調整原因」，評估這次的配置是否有盲點？
2. 資金運用效率：閒置資金是否有更好的停泊或分批投入策略？
3. 資產配置與 DCA 優化：目前的台股/美股/現金比例是否健康？計算這筆投入對整體平均成本的潛在影響，並給出下個月的微調建議。`
    },
    {
        id: 'rebalance-check',
        name: '再平衡操作指南',
        description: '當資產偏離目標比例時，計算具體的買賣份額。',
        iconType: 'Target',
        promptTemplate: `角色定義：你是一位量化投資專家，專長於資產再平衡（Portfolio Rebalancing）與風險控管。

資產現況：
- 總資產規模：\${totalValue}
- 目前各類別權重：
\${currentWeightBreakdown}

資產配置目標：
- 台股：40%
- 美股：40%
- 現金與避險：20%

請檢視我的數據並產出：
1. 偏離度分析：哪些資產過重或過輕？
2. 執行指令：若要回歸目標比例，我應該【買入/賣出】哪些標的與具體金額？
3. 稅務與成本考量：在操作時需要注意什麼？`
    },
    {
        id: 'goal-projection',
        name: '理財目標達標率預測',
        description: '結合複利計算，估算距離財務自由還有多遠。',
        iconType: 'Zap',
        promptTemplate: `角色定義：你是一位致力於幫助客戶達成財務自由（FIRE）的理財規劃師（CFP）。

我的理財目標：
\${financialGoal}

目前的資源：
- 現有總資產：\${totalValue} \${baseCurrency}
- 每月固定投入額：\${totalMonthlyInvestment} \${baseCurrency}
- 過去 6 個月資產走勢：
\${historicalTrends}

請幫我計算與評估：
1. 達標時程預測：以年化報酬率 5%, 7%, 10% 分別預估達成目標所需的年數。
2. 缺口分析：目前的投入強度是否足夠？
3. 加速方案：若想提前 3 年達成目標，我應該如何調整我的月投入或資產配置？`
    }
];

const DEFAULT_TOOLS: AITool[] = [
    { id: 'gemini', name: 'Google Gemini', url: 'https://gemini.google.com' },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com' },
    { id: 'claude', name: 'Claude AI', url: 'https://claude.ai/chats' }
];

export default function AIAnalyst() {
    const [holdings, setHoldings] = useState<Holding[]>([]);
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
            const [h, c, s, sn] = await Promise.all([
                getHoldings(user.uid),
                getMonthlyConfig(user.uid),
                getUserSettings(user.uid),
                getSnapshots(user.uid)
            ]);

            setHoldings(h);
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

        const totalValue = holdings.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
        const holdingsList = holdings
            .map(h => `- ${h.name} (${h.category}): ${(h.shares * h.currentPrice).toLocaleString()} ${settings.baseCurrency}`)
            .join('\n');

        const monthlyAllocation = config?.items
            .map(a => `- ${a.ticker}: ${a.amount.toLocaleString()} ${settings.baseCurrency}`)
            .join('\n') || '尚未設定';

        const totalMonthly = config?.items.reduce((sum, a) => sum + a.amount, 0) || 0;

        // Simple variance analysis (MoM)
        let variance = '無歷史數據對比';
        if (snapshots.length >= 2) {
            const current = snapshots[0];
            const prev = snapshots[1];
            const diff = current.totalValueInBase - prev.totalValueInBase;
            variance = `資產總額變動: ${diff.toLocaleString()} ${settings.baseCurrency} (${(diff / prev.totalValueInBase * 100).toFixed(2)}%)`;
        }

        const trends = snapshots.slice(0, 6).reverse()
            .map(s => `${s.yearMonth}: ${s.totalValueInBase.toLocaleString()} ${settings.baseCurrency}`)
            .join('\n');

        // Asset weight breakdown
        const categories: Record<string, number> = {};
        holdings.forEach(h => {
            const val = h.shares * h.currentPrice;
            categories[h.category] = (categories[h.category] || 0) + val;
        });
        const weights = Object.entries(categories)
            .map(([cat, val]) => `- ${cat}: ${(val / totalValue * 100).toFixed(1)}%`)
            .join('\n');

        let prompt = strategy.promptTemplate
            .replace(/\${baseCurrency}/g, settings.baseCurrency)
            .replace(/\${totalValue}/g, `${totalValue.toLocaleString()} ${settings.baseCurrency}`)
            .replace(/\${currentHoldingsList}/g, holdingsList)
            .replace(/\${monthlyAllocationList}/g, monthlyAllocation)
            .replace(/\${varianceAnalysis}/g, variance)
            .replace(/\${financialGoal}/g, (settings.financialGoal || '未設定').toString())
            .replace(/\${totalMonthlyInvestment}/g, totalMonthly.toLocaleString())
            .replace(/\${historicalTrends}/g, trends)
            .replace(/\${currentWeightBreakdown}/g, weights)
            .replace(/\${idleFunds}/g, `${(config?.idleFunds || 0).toLocaleString()} ${settings.baseCurrency}`)
            .replace(/\${rationale}/g, config?.rationale || '無');

        setCurrentPrompt(prompt);
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
            id: `custom_\${Date.now()}`,
            name: '新策略',
            description: '描述您的分析邏輯...',
            iconType: 'BrainCircuit',
            promptTemplate: '輸入您的 Prompt 範本，可使用 \${totalValue} 等變數...'
        });
        setShowEditModal(true);
    };

    if (loading) return <div className="flex-center" style={{ height: '60vh' }}>載入分析數據中...</div>;

    const currentTool = aiTools.find(t => t.id === selectedToolId) || aiTools[0];

    return (
        <div className="animate-fade-in dashboard-container">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="gradient-text">AI 投資分析師</h1>
                    <p style={{ color: 'var(--text-muted)' }}>自定義 Prompt 範本與 AI 工具連動</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-secondary" onClick={handleAddStrategy}>
                        <Plus size={18} /> 新增模式
                    </button>
                    <button className="btn-secondary" onClick={() => setShowToolManager(true)}>
                        <Settings size={18} /> AI 工具管理
                    </button>
                </div>
            </header>

            <div className="ai-analyst-grid">
                {/* Left: Strategies */}
                <div className="strategies-side">
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <div className="section-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <BrainCircuit size={20} className="primary-icon" />
                                <h2>選擇分析模式</h2>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="icon-btn-ghost" title="恢復預設範本" onClick={handleResetDefaults}>
                                    <RotateCcw size={18} />
                                </button>
                                <button className="icon-btn-primary" onClick={handleAddStrategy}>
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {strategies.map(strategy => (
                                <div
                                    key={strategy.id}
                                    className={`strategy-item \${selectedStrategyId === strategy.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedStrategyId(strategy.id);
                                        generatePrompt(strategy);
                                    }}
                                >
                                    <div className="strategy-icon">{getIcon(strategy.iconType)}</div>
                                    <div className="strategy-info">
                                        <h4>{strategy.name}</h4>
                                        <p>{strategy.description}</p>
                                    </div>
                                    <div className="strategy-actions">
                                        <button className="icon-btn-ghost" onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingStrategy(strategy);
                                            setShowEditModal(true);
                                        }}><Edit2 size={16} /></button>
                                        <button className="icon-btn-ghost danger" onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteStrategy(strategy.id);
                                        }}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Preview & Go */}
                <div className="preview-side glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div className="section-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Cpu size={20} className="primary-icon" />
                            <h2>Prompt 預覽</h2>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <select
                                className="input-field"
                                style={{ width: 'auto', marginBottom: 0, padding: '0.4rem 2rem 0.4rem 1rem' }}
                                value={selectedToolId}
                                onChange={(e) => setSelectedToolId(e.target.value)}
                            >
                                {aiTools.map(tool => (
                                    <option key={tool.id} value={tool.id}>{tool.name}</option>
                                ))}
                            </select>
                            <button
                                className={`icon-btn-ghost \${isCopied ? 'copied' : ''}`}
                                onClick={() => {
                                    navigator.clipboard.writeText(currentPrompt);
                                    setIsCopied(true);
                                    setTimeout(() => setIsCopied(false), 2000);
                                }}
                            >
                                {isCopied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="preview-box">
                        {currentPrompt ? (
                            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{currentPrompt}</pre>
                        ) : (
                            <div className="empty-preview">
                                <BrainCircuit size={48} className="muted-icon" />
                                <p>選擇左側模式，產生的 Prompt 會自動複製。</p>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                        <button
                            className={`btn-primary w-full go-btn \${!currentPrompt ? 'disabled' : ''}`}
                            onClick={() => currentPrompt && window.open(currentTool.url, '_blank')}
                            disabled={!currentPrompt}
                        >
                            <ExternalLink size={18} /> 前往 {currentTool.name}
                        </button>
                    </div>
                </div>
            </div>

            {/* Strategy Edit Modal */}
            {showEditModal && editingStrategy && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ width: '600px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h3>編輯模式範本</h3>
                            <button className="icon-btn-ghost" onClick={() => setShowEditModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
                            <div className="form-group">
                                <label>模式名稱</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={editingStrategy.name}
                                    onChange={e => setEditingStrategy({ ...editingStrategy, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>簡單描述</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={editingStrategy.description}
                                    onChange={e => setEditingStrategy({ ...editingStrategy, description: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>選擇圖示</label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                    {iconOptions.map(opt => (
                                        <button
                                            key={opt.type}
                                            className={`icon-btn-ghost \${editingStrategy.iconType === opt.type ? 'active' : ''}`}
                                            onClick={() => setEditingStrategy({ ...editingStrategy, iconType: opt.type })}
                                            style={{
                                                border: editingStrategy.iconType === opt.type ? '1px solid var(--primary)' : '1px solid transparent',
                                                background: editingStrategy.iconType === opt.type ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
                                            }}
                                        >
                                            {opt.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Prompt 範本 (支援 {'\${totalValue}'} 等變數)</label>
                                <textarea
                                    className="input-field"
                                    style={{ height: '300px', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                    value={editingStrategy.promptTemplate}
                                    onChange={e => setEditingStrategy({ ...editingStrategy, promptTemplate: e.target.value })}
                                />
                            </div>
                            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.75rem', color: 'var(--primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                                    <AlertCircle size={14} /> 可用變數：
                                </div>
                                {'\${baseCurrency}, \${totalValue}, \${idleFunds}, \${rationale}, \${currentHoldingsList}, \${monthlyAllocationList}, \${varianceAnalysis}, \${financialGoal}, \${totalMonthlyInvestment}, \${historicalTrends}, \${currentWeightBreakdown}'}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <button className="btn-primary w-full" onClick={handleSaveStrategy}>
                                <Save size={18} /> 儲存範本
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Tool Manager Modal */}
            {showToolManager && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content" style={{ width: '500px' }}>
                        <div className="modal-header">
                            <h3>管理 AI 工具</h3>
                            <button className="icon-btn-ghost" onClick={() => setShowToolManager(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {aiTools.map((tool, index) => (
                                    <div key={tool.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="text"
                                                className="input-field"
                                                style={{ marginBottom: '0.5rem' }}
                                                placeholder="工具名稱"
                                                value={tool.name}
                                                onChange={e => {
                                                    const newTools = [...aiTools];
                                                    newTools[index].name = e.target.value;
                                                    setAiTools(newTools);
                                                }}
                                            />
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="URL"
                                                value={tool.url}
                                                onChange={e => {
                                                    const newTools = [...aiTools];
                                                    newTools[index].url = e.target.value;
                                                    setAiTools(newTools);
                                                }}
                                            />
                                        </div>
                                        <button className="icon-btn-ghost danger" style={{ marginTop: '0.5rem' }} onClick={async () => {
                                            const user = auth.currentUser;
                                            const newTools = aiTools.filter((_, i) => i !== index);
                                            setAiTools(newTools);
                                            if (settings && user) await saveUserSettings(user.uid, { ...settings, aiTools: newTools });
                                        }}><Trash2 size={18} /></button>
                                    </div>
                                ))}
                            </div>
                            <button className="btn-secondary w-full" style={{ marginTop: '1.5rem' }} onClick={() => {
                                setAiTools([...aiTools, { id: `tool_\${Date.now()}`, name: '新工具', url: 'https://...' }]);
                            }}>
                                <Plus size={18} /> 新增工具
                            </button>
                        </div>
                        <div className="modal-footer" style={{ padding: '1.5rem' }}>
                            <button className="btn-primary w-full" onClick={async () => {
                                const user = auth.currentUser;
                                if (settings && user) await saveUserSettings(user.uid, { ...settings, aiTools: aiTools });
                                setShowToolManager(false);
                            }}>
                                <Save size={18} /> 儲存所有變更
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
