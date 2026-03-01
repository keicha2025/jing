import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { getHoldings, saveHolding, deleteHolding } from '../services/db';
import { Holding } from '../types';
import { Plus, Trash2, Edit2, RotateCw, FileText } from 'lucide-react';

export default function Holdings() {
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', ticker: '', category: '台股', shares: 0, avgCost: 0, currentPrice: 0 });
    const [isEditMode, setIsEditMode] = useState(false);
    const [markdownText, setMarkdownText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            if (auth.currentUser) {
                const data = await getHoldings(auth.currentUser.uid);
                setHoldings(data);
                setMarkdownText(generateMarkdown(data));
            }
            setLoading(false);
        };
        fetch();
    }, []);

    const generateMarkdown = (data: Holding[]) => {
        let md = `| 名稱 | 代號 | 類別 | 持股 | 成本 | 現價 |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
        data.forEach(h => {
            md += `| ${h.name} | ${h.ticker} | ${h.category} | ${h.shares} | ${h.avgCost} | ${h.currentPrice} |\n`;
        });
        return md;
    };

    useEffect(() => {
        if (!isEditMode) {
            setMarkdownText(generateMarkdown(holdings));
        }
    }, [holdings, isEditMode]);

    const handleAdd = async () => {
        if (auth.currentUser) {
            const ticker = newItem.category === '台股' ? `${newItem.ticker}.TW` : newItem.ticker;
            await saveHolding({ ...newItem, ticker, uid: auth.currentUser.uid });
            setIsModalOpen(false);
            setNewItem({ name: '', ticker: '', category: '台股', shares: 0, avgCost: 0, currentPrice: 0 });
            // Refresh
            const data = await getHoldings(auth.currentUser.uid);
            setHoldings(data);
        }
    };

    const handleDelete = async (id: string) => {
        if (auth.currentUser && confirm('確定要刪除此資產嗎？')) {
            await deleteHolding(id);
            setHoldings(holdings.filter(h => h.id !== id));
        }
    };

    const handleMarkdownChange = (text: string) => {
        setMarkdownText(text);
        const lines = text.split('\n');
        const newHoldings: Holding[] = [];

        lines.forEach(line => {
            if (line.includes('|') && !line.includes('---') && !line.includes('名稱')) {
                const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
                if (parts.length >= 6) {
                    newHoldings.push({
                        name: parts[0],
                        ticker: parts[1],
                        category: parts[2] as any,
                        shares: Number(parts[3]) || 0,
                        avgCost: Number(parts[4]) || 0,
                        currentPrice: Number(parts[5]) || 0,
                        currency: parts[2] === '台股' ? 'TWD' : 'USD',
                        uid: auth.currentUser?.uid || ''
                    });
                }
            }
        });

        if (newHoldings.length > 0) {
            setHoldings(newHoldings);
        }
    };

    const handleBulkSave = async () => {
        if (!auth.currentUser) return;
        setIsSaving(true);
        try {
            // Delete all existing and save new ones (simplest for bulk MD edit)
            // Or better: update/create
            for (const h of holdings) {
                await saveHolding(h);
            }
            alert('批量保存成功！');
            setIsEditMode(false);
        } catch (error) {
            console.error(error);
            alert('保存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateMarkdown(holdings));
        alert('Markdown 已複製到剪貼簿！');
    };

    return (
        <div className="animate-fade-in" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="text-gradient">目前庫存與資產</h1>
                    <p style={{ color: 'var(--text-muted)' }}>管理您的存量資產與持股情況</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={copyToClipboard} className="btn-primary flex-center" style={{ gap: '0.5rem', background: 'var(--surface)' }}>
                        <Edit2 size={18} /> 複製 MD
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
                        <Plus size={18} /> 新增資產
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)'
                }}>
                    <div className="glass-card" style={{ width: '400px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>新增資產</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>資產名稱</label>
                                <input className="input-field" style={{ width: '100%' }} value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. 台積電" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>類別</label>
                                <select className="input-field" style={{ width: '100%' }} value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                    <option>台股</option>
                                    <option>美股</option>
                                    <option>基金</option>
                                    <option>其他</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>代號</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        className="input-field"
                                        style={{ width: '100%', paddingRight: newItem.category === '台股' ? '3rem' : '1rem' }}
                                        value={newItem.ticker}
                                        onChange={e => setNewItem({ ...newItem, ticker: e.target.value })}
                                        placeholder={newItem.category === '台股' ? '2330' : 'AAPL'}
                                    />
                                    {newItem.category === '台股' && (
                                        <span style={{ position: 'absolute', right: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>.TW</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>持股數</label>
                                    <input type="number" className="input-field" style={{ width: '100%' }} value={newItem.shares} onChange={e => setNewItem({ ...newItem, shares: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>平均成本</label>
                                    <input type="number" className="input-field" style={{ width: '100%' }} value={newItem.avgCost} onChange={e => setNewItem({ ...newItem, avgCost: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--surface-border)' }}>取消</button>
                            <button onClick={handleAdd} className="btn-primary" style={{ flex: 1 }}>新增</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <th style={{ padding: '1.25rem' }}>資產名稱</th>
                            <th>代號</th>
                            <th>類別</th>
                            <th>持股數</th>
                            <th>平均成本</th>
                            <th>目前價格</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {holdings.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    尚未添加任何庫存資料
                                </td>
                            </tr>
                        ) : (
                            holdings.map(h => (
                                <tr key={h.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                                    <td style={{ padding: '1.25rem' }}>{h.name}</td>
                                    <td>{h.ticker}</td>
                                    <td>{h.category}</td>
                                    <td>{h.shares}</td>
                                    <td>{h.avgCost}</td>
                                    <td>{h.currentPrice}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button style={{ color: 'var(--error)' }} onClick={() => h.id && handleDelete(h.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="flex-center" style={{ gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <RotateCw size={16} /> 同步最新股價
                </button>
            </div>

            <div style={{ marginTop: '2rem' }} className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} color="var(--primary)" />
                        <h3>Markdown 批量編輯</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {isEditMode && (
                            <button
                                onClick={handleBulkSave}
                                disabled={isSaving}
                                className="btn-primary"
                                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'var(--primary)' }}
                            >
                                {isSaving ? '保存中...' : '儲存變更'}
                            </button>
                        )}
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
                            {isEditMode ? '返回預覽' : '編輯 MD 表格'}
                        </button>
                    </div>
                </div>

                {isEditMode ? (
                    <textarea
                        value={markdownText}
                        onChange={(e) => handleMarkdownChange(e.target.value)}
                        placeholder="| 名稱 | 代號 | 類別 | 持股 | 成本 | 現價 |"
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
                        {markdownText}
                    </pre>
                )}
                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    提示：修改 Markdown 內容會即時反映至上方表格，點擊「儲存變更」可同步至雲端資料庫。
                </p>
            </div>
        </div>
    );
}
