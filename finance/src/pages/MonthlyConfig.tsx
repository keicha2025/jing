import { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { getMonthlyConfig, saveMonthlyConfig } from '../services/db';
import { MonthlyConfig, MonthlyConfigItem } from '../types';
import { Save, Copy, FileText, Plus, Trash2, Zap, CheckCircle2 } from 'lucide-react';

export default function MonthlyConfigPage() {
    const [config, setConfig] = useState<MonthlyConfig | null>(null);
    const [items, setItems] = useState<MonthlyConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [markdownText, setMarkdownText] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    // Use string-based amount state to prevent floating-point rounding during typing
    const [amountInputs, setAmountInputs] = useState<string[]>([]);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
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
                showToast('配置已保存！');
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
            return a.item.ticker.localeCompare(b.item.ticker);
        });
        setItems(combined.map(c => c.item));
        setAmountInputs(combined.map(c => c.amtStr));
        showToast('已智慧排序', 'info');
    };

    const generateMarkdown = (currentItems: MonthlyConfigItem[]) => {
        let md = `| 類別 | 代號 | 金額 | 幣別 |\n`;
        md += `| :--- | :--- | :--- | :--- |\n`;
        currentItems.forEach(item => {
            md += `| ${item.category} | ${item.ticker} | ${item.amount} | ${item.currency} |\n`;
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
        showToast('Markdown 已複製到剪貼簿！', 'info');
    };

    if (loading) {
        return <div className="flex-center" style={{ height: '60vh' }}>Loading...</div>;
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="text-gradient">每月投資配置</h1>
                    <p style={{ color: 'var(--text-muted)' }}>設定您的定期定額策略並匯出日誌</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleSmartSort}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1rem', borderRadius: '0.75rem',
                            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
                            color: '#a5b4fc', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Zap size={16} /> 智慧排序
                    </button>
                    <button
                        onClick={copyToClipboard}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1rem', borderRadius: '0.75rem',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Copy size={16} /> 複製 MD
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                    >
                        <Save size={16} /> 保存配置
                    </button>
                </div>
            </div>

            <div className="glass-card">
                {/* Table Header */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem',
                    alignItems: 'center', marginBottom: '1rem',
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}>
                    {['類別', '代號', '金額', '幣別', ''].map((h, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {items.map((item, index) => (
                        <div key={index} style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'center',
                            padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                            background: 'rgba(255,255,255,0.02)',
                            transition: 'background 0.2s'
                        }}>
                            <div>
                                <select
                                    className="input-field"
                                    style={{ width: '100%', color: 'var(--text-main)' }}
                                    value={item.category}
                                    onChange={(e) => handleUpdateItem(index, 'category', e.target.value)}
                                >
                                    <option>美股</option>
                                    <option>台股</option>
                                    <option>基金</option>
                                    <option>現金</option>
                                    <option>其他</option>
                                </select>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        className="input-field"
                                        value={item.ticker}
                                        onChange={(e) => handleUpdateItem(index, 'ticker', e.target.value)}
                                        style={{
                                            width: '100%', color: 'var(--text-main)',
                                            paddingRight: item.category === '台股' ? '3rem' : '1rem'
                                        }}
                                        placeholder={item.category === '台股' ? "e.g. 2330" : "e.g. VOO"}
                                    />
                                    {item.category === '台股' && (
                                        <span style={{
                                            position: 'absolute', right: '1rem',
                                            color: 'var(--text-muted)', fontWeight: 600,
                                            pointerEvents: 'none', fontSize: '0.9rem'
                                        }}>.TW</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="input-field"
                                    value={amountInputs[index] ?? String(item.amount)}
                                    onChange={(e) => handleAmountInput(index, e.target.value)}
                                    onBlur={() => handleAmountBlur(index)}
                                    style={{ width: '100%', color: 'var(--text-main)' }}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <select
                                    className="input-field"
                                    style={{ width: '100%', color: 'var(--text-main)' }}
                                    value={item.currency}
                                    onChange={(e) => handleUpdateItem(index, 'currency', e.target.value)}
                                >
                                    <option>TWD</option>
                                    <option>USD</option>
                                    <option>JPY</option>
                                </select>
                            </div>
                            <button
                                onClick={() => handleRemoveItem(index)}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                                    padding: '0.5rem', borderRadius: '0.5rem',
                                    display: 'flex', alignItems: 'center',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                            >
                                <Trash2 size={16} />
                            </button>
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
                    background: toast.type === 'success' ? 'var(--primary)' : toast.type === 'error' ? '#475569' : 'rgba(99,102,241,0.85)',
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
            <style>{`
                @keyframes mc-slide-in {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
