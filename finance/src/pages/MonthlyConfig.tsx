import { useState, useEffect, useMemo, useCallback } from 'react';
import { auth } from '../firebase';
import { getMonthlyConfig, saveMonthlyConfig } from '../services/db';
import { MonthlyConfig, MonthlyConfigItem } from '../types';
import { Save, Copy, FileText, Plus, Trash2, Zap, CheckCircle2 } from 'lucide-react';
import Dropdown from '../components/Dropdown';
import ConfirmModal from '../components/ConfirmModal';

export default function MonthlyConfigPage() {
    const [config, setConfig] = useState<MonthlyConfig | null>(null);
    const [items, setItems] = useState<MonthlyConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [markdownText, setMarkdownText] = useState('');
    const [status, setStatus] = useState<{ [key: string]: string | null }>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
    // Use string-based amount state to prevent floating-point rounding during typing
    const [amountInputs, setAmountInputs] = useState<string[]>([]);

    // --- Summary Calculations (Mutual listening) ---
    const summaries = useMemo(() => {
        const map: Record<string, number> = {};
        items.forEach(item => {
            const key = `${item.category}-${item.currency}`;
            map[key] = (map[key] || 0) + item.amount;
        });
        return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    }, [items]);

    const triggerStatus = useCallback((key: string, message: string) => {
        setStatus(prev => ({ ...prev, [key]: 'EXIT' }));
        setTimeout(() => {
            setStatus(prev => ({ ...prev, [key]: message }));
            setTimeout(() => {
                setStatus(prev => ({ ...prev, [key]: 'RESTORE' }));
                setTimeout(() => {
                    setStatus(prev => ({ ...prev, [key]: null }));
                }, 200);
            }, 2000);
        }, 100);
    }, []);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (type === 'error') {
            setToast({ message, type });
            setTimeout(() => setToast(null), 3000);
        }
    }, []);

    useEffect(() => {
        const fetchConfig = async () => {
            if (auth.currentUser) {
                const data = await getMonthlyConfig(auth.currentUser.uid);
                if (data) {
                    setConfig(data);
                    const loadedItems = data.items || [];
                    setItems(loadedItems);
                    setAmountInputs(loadedItems.map(i => String(i.amount)));
                    setMarkdownText(generateMarkdown(loadedItems));
                }
            }
            setLoading(false);
        };
        fetchConfig();
    }, []);

    // Also update markdown text whenever items change if not in MD edit mode
    useEffect(() => {
        if (!isEditMode) {
            setMarkdownText(generateMarkdown(items));
        }
    }, [items, isEditMode]);

    const handleAddItem = () => {
        const newItem: MonthlyConfigItem = { category: '台股', ticker: '', amount: 0, currency: 'TWD' };
        setItems(prev => [...prev, newItem]);
        setAmountInputs(prev => [...prev, '0']);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
        setAmountInputs(prev => prev.filter((_, i) => i !== index));
    };

    // Update a field in items array immutably
    const handleUpdateItem = (index: number, field: keyof MonthlyConfigItem, value: string | number) => {
        setItems(prev => {
            const updated = prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            );
            return updated;
        });
    };

    // Handle amount input change — keep as string while typing, commit to number on blur
    const handleAmountInput = (index: number, raw: string) => {
        setAmountInputs(prev => prev.map((v, i) => i === index ? raw : v));
    };

    const handleAmountBlur = (index: number) => {
        const raw = amountInputs[index] ?? '';
        const num = parseFloat(raw);
        const finalNum = isNaN(num) ? 0 : Math.round(num); // round to avoid float jitter
        setAmountInputs(prev => prev.map((v, i) => i === index ? String(finalNum) : v));
        handleUpdateItem(index, 'amount', finalNum);
    };

    const handleSave = async () => {
        if (auth.currentUser) {
            try {
                // Sync any un-committed amount inputs before saving
                const finalItems = items.map((item, i) => {
                    const raw = amountInputs[i] ?? '';
                    const num = parseFloat(raw);
                    return { ...item, amount: isNaN(num) ? 0 : Math.round(num) };
                });
                await saveMonthlyConfig(auth.currentUser.uid, {
                    configName: config?.configName || '預設配置',
                    items: finalItems,
                });
                setItems(finalItems);
                triggerStatus('save', '配置已保存');
            } catch (e) {
                console.error(e);
                showToast('保存失敗', 'error');
            }
        }
    };

    const handleSmartSort = () => {
        const priority: { [key: string]: number } = { '台股': 1, '美股': 2, '基金': 3, '現金': 4, '其他': 5 };
        const combined = items.map((item, i) => ({ item, amtStr: amountInputs[i] ?? '0' }));
        combined.sort((a, b) => {
            const pa = priority[a.item.category] || 99;
            const pb = priority[b.item.category] || 99;
            if (pa !== pb) return pa - pb;
            // Enhanced secondary sort: Amount (High to Low)
            if (b.item.amount !== a.item.amount) return b.item.amount - a.item.amount;
            return a.item.ticker.localeCompare(b.item.ticker);
        });
        setItems(combined.map(c => c.item));
        setAmountInputs(combined.map(c => c.amtStr));
        triggerStatus('sort', '已智慧排序');
    };

    const generateMarkdown = (currentItems: MonthlyConfigItem[]) => {
        let md = `| 類別 | 代號 | 金額 | 幣別 |\n`;
        md += `| :--- | :--- | :--- | :--- |\n`;
        currentItems.forEach(item => {
            const displayTicker = item.category === '台股' && !item.ticker.endsWith('.TW')
                ? `${item.ticker}.TW`
                : item.ticker;
            md += `| ${item.category} | ${displayTicker} | ${item.amount} | ${item.currency} |\n`;
        });

        // Add Category Summaries to Markdown
        const map: Record<string, number> = {};
        currentItems.forEach(item => {
            const key = `${item.category}-${item.currency}`;
            map[key] = (map[key] || 0) + item.amount;
        });

        md += `\n### 類別總計\n`;
        Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).forEach(([key, total]) => {
            md += `- ${key}: ${total.toLocaleString()} ${key.split('-')[1]}\n`;
        });

        return md;
    };

    const handleMarkdownChange = (text: string) => {
        setMarkdownText(text);
        const lines = text.split('\n');
        const newItems: MonthlyConfigItem[] = [];

        lines.forEach(line => {
            if (line.includes('|') && !line.includes('---') && !line.toLowerCase().includes('類別')) {
                const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
                if (parts.length >= 4) {
                    newItems.push({
                        category: parts[0] as any,
                        ticker: parts[1],
                        amount: Number(parts[2]) || 0,
                        currency: parts[3]
                    });
                }
            }
        });

        if (newItems.length > 0 || text.trim() === '') {
            setItems(newItems);
            setAmountInputs(newItems.map(i => String(i.amount)));
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateMarkdown(items));
        triggerStatus('copy', 'Markdown 已複製');
    };

    if (loading) {
        return <div className="flex-center" style={{ height: '60vh' }}>Loading...</div>;
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', flexDirection: 'column' }}>
                <div style={{ width: '100%' }}>
                    <h1 className="text-gradient">每月投資配置</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>設定您的定期定額策略並匯出日誌</p>
                </div>
                <div className="config-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', position: 'relative' }}>
                    <button onClick={handleSmartSort} className="btn-accent-ghost" style={{ flex: 1, minWidth: '120px', padding: '0.5rem', position: 'relative', overflow: 'hidden' }}>
                        <div className={`status-btn-content ${status.sort === 'EXIT' ? 'exit' : (status.sort === 'RESTORE' ? 'enter' : (status.sort ? 'hidden' : ''))}`}>
                            <Zap size={16} /> <span className="action-label">智慧排序</span>
                        </div>
                        {status.sort && status.sort !== 'EXIT' && status.sort !== 'RESTORE' && (
                            <div className="status-btn-content enter" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}>
                                <CheckCircle2 size={16} /> {status.sort}
                            </div>
                        )}
                    </button>
                    <button onClick={copyToClipboard} className="btn-ghost" style={{ flex: 1, minWidth: '120px', padding: '0.5rem', position: 'relative', overflow: 'hidden' }}>
                        <div className={`status-btn-content ${status.copy === 'EXIT' ? 'exit' : (status.copy === 'RESTORE' ? 'enter' : (status.copy ? 'hidden' : ''))}`}>
                            <Copy size={16} /> <span className="action-label">複製 MD</span>
                        </div>
                        {status.copy && status.copy !== 'EXIT' && status.copy !== 'RESTORE' && (
                            <div className="status-btn-content enter" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}>
                                <CheckCircle2 size={16} /> {status.copy}
                            </div>
                        )}
                    </button>
                    <button onClick={handleSave} className="btn-primary" style={{ flex: '1 0 100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.75rem', position: 'relative', overflow: 'hidden' }}>
                        <div className={`status-btn-content ${status.save === 'EXIT' ? 'exit' : (status.save === 'RESTORE' ? 'enter' : (status.save ? 'hidden' : ''))}`}>
                            <Save size={16} /> 保存配置
                        </div>
                        {status.save && status.save !== 'EXIT' && status.save !== 'RESTORE' && (
                            <div className="status-btn-content enter" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}>
                                <CheckCircle2 size={16} /> {status.save}
                            </div>
                        )}
                    </button>
                </div>
            </div>

            <div className="glass-card">
                {/* 1. Category Summaries (Read-only, Real-time) */}
                <div style={{
                    display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
                    marginBottom: '1.25rem', padding: '0.75rem',
                    background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    {summaries.length > 0 ? summaries.map(([key, total]: [string, number]) => (
                        <div key={key} style={{
                            padding: '4px 10px', borderRadius: '6px',
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                            fontSize: '0.75rem', color: 'var(--text-main)', display: 'flex', gap: '6px'
                        }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{key}</span>
                            <span>{total.toLocaleString()}</span>
                        </div>
                    )) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>尚未輸入配置項目</div>
                    )}
                </div>

                {/* 2. Table Header */}
                <div className="table-header" style={{
                    display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr auto', gap: '1rem',
                    alignItems: 'center', marginBottom: '1rem',
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}>
                    {['類別', '代號', '金額', '幣別', ''].map((h, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                </div>

                {/* 3. Scrollable Table Body */}
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '0.75rem',
                    maxHeight: '420px', overflowY: 'auto', paddingRight: '4px'
                }}>
                    {items.map((item, index) => (
                        <div key={index} className="investment-row" style={{
                            display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr auto', gap: '1rem', alignItems: 'center',
                            padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                            background: 'rgba(255,255,255,0.02)',
                            transition: 'background 0.2s'
                        }}>
                            <div className="col-category">
                                <Dropdown
                                    value={item.category}
                                    options={[
                                        { label: '美股', value: '美股' },
                                        { label: '台股', value: '台股' },
                                        { label: '基金', value: '基金' },
                                        { label: '現金', value: '現金' },
                                        { label: '其他', value: '其他' }
                                    ]}
                                    onChange={(val) => handleUpdateItem(index, 'category', val)}
                                />
                            </div>
                            <div className="col-ticker" style={{ position: 'relative' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        className="input-field"
                                        value={item.ticker}
                                        onChange={(e) => handleUpdateItem(index, 'ticker', e.target.value)}
                                        style={{
                                            width: '100%', color: 'var(--text-main)',
                                            paddingRight: item.category === '台股' ? '2.5rem' : '0.5rem',
                                            paddingLeft: '0.5rem'
                                        }}
                                        placeholder={item.category === '台股' ? "2330" : "VOO"}
                                    />
                                    {item.category === '台股' && (
                                        <span style={{
                                            position: 'absolute', right: '0.5rem',
                                            color: 'var(--text-muted)', fontWeight: 600,
                                            pointerEvents: 'none', fontSize: '0.75rem'
                                        }}>.TW</span>
                                    )}
                                </div>
                            </div>
                            <div className="col-amount">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="input-field"
                                    value={amountInputs[index] ?? String(item.amount)}
                                    onChange={(e) => handleAmountInput(index, e.target.value)}
                                    onBlur={() => handleAmountBlur(index)}
                                    style={{ width: '100%', color: 'var(--text-main)', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}
                                    placeholder="0"
                                />
                            </div>
                            <div className="col-currency">
                                <Dropdown
                                    value={item.currency}
                                    options={[
                                        { label: 'TWD', value: 'TWD' },
                                        { label: 'USD', value: 'USD' },
                                        { label: 'JPY', value: 'JPY' }
                                    ]}
                                    onChange={(val) => handleUpdateItem(index, 'currency', val)}
                                />
                            </div>
                            <div className="col-action">
                                <button
                                    onClick={() => setConfirmDeleteIndex(index)}
                                    className="icon-btn danger"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleAddItem}
                        className="flex-center"
                        style={{
                            gap: '0.5rem', color: 'var(--primary)', padding: '1rem',
                            border: '1px dashed rgba(99,102,241,0.4)', borderRadius: '0.75rem',
                            marginTop: '0.5rem', width: '100%', fontSize: '0.875rem',
                            background: 'rgba(99,102,241,0.05)', fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        <Plus size={16} /> 新增配置項目
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }} className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} color="var(--primary)" />
                        <h3 style={{ color: 'var(--text-main)' }}>Markdown 編輯器</h3>
                    </div>
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        style={{
                            padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '0.5rem',
                            background: isEditMode ? 'var(--primary)' : 'rgba(255,255,255,0.07)',
                            border: '1px solid ' + (isEditMode ? 'transparent' : 'rgba(255,255,255,0.1)'),
                            color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isEditMode ? '鎖定並同步' : '進入 MD 編輯模式'}
                    </button>
                </div>

                {isEditMode ? (
                    <textarea
                        value={markdownText}
                        onChange={(e) => handleMarkdownChange(e.target.value)}
                        placeholder="| 類別 | 代號 | 金額 | 幣別 |"
                        style={{
                            width: '100%', minHeight: '200px',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--primary)',
                            borderRadius: '0.75rem', padding: '1.5rem',
                            color: '#e2e8f0', fontFamily: 'monospace',
                            fontSize: '0.9rem', lineHeight: '1.6',
                            outline: 'none', resize: 'vertical'
                        }}
                    />
                ) : (
                    <pre style={{
                        background: 'rgba(0,0,0,0.3)', padding: '1.5rem',
                        borderRadius: '0.75rem', overflowX: 'auto',
                        fontSize: '0.9rem', lineHeight: '1.6',
                        color: '#cbd5e1', cursor: 'pointer'
                    }} onClick={() => setIsEditMode(true)}>
                        {markdownText || generateMarkdown(items)}
                    </pre>
                )}
                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    提示：修改 Markdown 表格內容會即時更新上方的視覺化清單。
                </p>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    padding: '12px 24px',
                    background: toast.type === 'error' ? '#64748b' : 'var(--primary)',
                    color: 'white', borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                    zIndex: 1200, display: 'flex', alignItems: 'center', gap: '12px',
                    animation: 'mc-slide-in 0.3s ease-out',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontWeight: 500
                }}>
                    <CheckCircle2 size={16} />
                    <span>{toast.message}</span>
                </div>
            )}

            {confirmDeleteIndex !== null && (
                <ConfirmModal
                    title="刪除配置"
                    message={`確定要刪除「${items[confirmDeleteIndex]?.ticker || '未命名項目'}」嗎？`}
                    onConfirm={() => {
                        handleRemoveItem(confirmDeleteIndex);
                        setConfirmDeleteIndex(null);
                    }}
                    onCancel={() => setConfirmDeleteIndex(null)}
                />
            )}
            <style>{`
                @keyframes mc-slide-in {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @media (min-width: 640px) {
                    .config-actions { flex-direction: row !important; }
                    .config-actions button { flex: none !important; width: auto !important; }
                }
                @media (max-width: 640px) {
                    .table-header { display: none !important; }
                    .investment-row { 
                        grid-template-columns: 1fr 1fr !important; 
                        gap: 1rem !important; 
                        padding: 1.25rem 1rem !important;
                        border: 1px solid rgba(255,255,255,0.05);
                        position: relative;
                    }
                    /* Row 1: Category | Currency */
                    .col-category { grid-column: span 1; order: 1; }
                    .col-currency { grid-column: span 1; order: 2; }
                    
                    /* Row 2: Ticker | Amount */
                    .col-ticker { grid-column: span 1; order: 3; }
                    .col-amount { grid-column: span 1; order: 4; }
                    
                    .col-action { 
                        position: absolute; 
                        top: 0.5rem; 
                        right: 0.5rem; 
                    }
                    .action-label { display: none; }
                }
            `}</style>
        </div>
    );
}
