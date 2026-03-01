import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { getMonthlyConfig, saveMonthlyConfig } from '../services/db';
import { MonthlyConfig, MonthlyConfigItem } from '../types';
import { Save, Copy, FileText, Plus, Trash2 } from 'lucide-react';

export default function MonthlyConfigPage() {
    const [config, setConfig] = useState<MonthlyConfig | null>(null);
    const [items, setItems] = useState<MonthlyConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [markdownText, setMarkdownText] = useState('');

    useEffect(() => {
        const fetch = async () => {
            if (auth.currentUser) {
                const data = await getMonthlyConfig(auth.currentUser.uid);
                if (data) {
                    setConfig(data);
                    setItems(data.items);
                    setMarkdownText(generateMarkdown(data.items));
                }
            }
            setLoading(false);
        };
        fetch();
    }, []);

    // Also update markdown text whenever items change if not in MD edit mode
    useEffect(() => {
        if (!isEditMode) {
            setMarkdownText(generateMarkdown(items));
        }
    }, [items, isEditMode]);

    const handleAddItem = () => {
        setItems([...items, { category: '台股', ticker: '', amount: 0, currency: 'TWD' }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (auth.currentUser) {
            await saveMonthlyConfig(auth.currentUser.uid, {
                configName: '預設配置',
                items
            });
            alert('保存成功！');
        }
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
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateMarkdown(items));
        alert('Markdown 已複製到剪貼簿！');
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="text-gradient">每月投資配置</h1>
                    <p style={{ color: 'var(--text-muted)' }}>設定您的定期定額策略並匯出日誌</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={copyToClipboard} className="btn-primary flex-center" style={{ gap: '0.5rem', background: 'var(--surface)' }}>
                        <Copy size={18} /> 複製 MD
                    </button>
                    <button onClick={handleSave} className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
                        <Save size={18} /> 保存配置
                    </button>
                </div>
            </div>

            <div className="glass-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {items.map((item, index) => (
                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>類別</label>
                                <select
                                    className="input-field"
                                    style={{ width: '100%' }}
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
                            </div>
                            <div style={{ position: 'relative' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>代號</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        className="input-field"
                                        value={item.ticker}
                                        onChange={(e) => {
                                            const newItems = [...items];
                                            newItems[index].ticker = e.target.value;
                                            setItems(newItems);
                                        }}
                                        style={{
                                            width: '100%',
                                            paddingRight: item.category === '台股' ? '3rem' : '1rem'
                                        }}
                                        placeholder={item.category === '台股' ? "e.g. 2330" : "e.g. VOO"}
                                    />
                                    {item.category === '台股' && (
                                        <span style={{
                                            position: 'absolute',
                                            right: '1rem',
                                            color: 'var(--text-muted)',
                                            fontWeight: 600,
                                            pointerEvents: 'none',
                                            fontSize: '0.9rem'
                                        }}>
                                            .TW
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>金額</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={item.amount}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index].amount = Number(e.target.value);
                                        setItems(newItems);
                                    }}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>幣別</label>
                                <select
                                    className="input-field"
                                    style={{ width: '100%' }}
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
                            </div>
                            <button onClick={() => handleRemoveItem(index)} style={{ color: 'var(--error)', padding: '0.75rem' }}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}

                    <button onClick={handleAddItem} className="flex-center" style={{ gap: '0.5rem', color: 'var(--primary)', padding: '1rem', border: '1px dashed var(--primary)', borderRadius: '0.75rem', marginTop: '1rem' }}>
                        <Plus size={18} /> 新增配置項目
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }} className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} color="var(--primary)" />
                        <h3>Markdown 編輯器</h3>
                    </div>
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className="btn-primary"
                        style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            background: isEditMode ? 'var(--primary)' : 'var(--surface)',
                            border: isEditMode ? 'none' : '1px solid var(--border)'
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
                            width: '100%',
                            minHeight: '200px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--primary)',
                            borderRadius: '0.75rem',
                            padding: '1.5rem',
                            color: '#e2e8f0',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            lineHeight: '1.6',
                            outline: 'none',
                            resize: 'vertical'
                        }}
                    />
                ) : (
                    <pre style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        overflowX: 'auto',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        color: '#cbd5e1',
                        cursor: 'pointer'
                    }} onClick={() => setIsEditMode(true)}>
                        {markdownText || generateMarkdown(items)}
                    </pre>
                )}
                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    提示：修改 Markdown 表格內容會即時更新上方的視覺化清單。
                </p>
            </div>
        </div>
    );
}
