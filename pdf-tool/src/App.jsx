import React, { useState } from 'react';
import {
    Upload, FileText, Cpu, Zap, Layers, ChevronRight,
    Settings2, Info, Sun, Moon, ArrowRight, Loader2,
    LogIn, LogOut, User, Shield, Cloud, ArrowDownCircle, Sliders,
    RefreshCw
} from 'lucide-react';
import { PDFDocument, PDFName, PDFDict, PDFStream, PDFRawStream } from 'pdf-lib';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const WHITELIST = ['wj209ing@gmail.com'];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://pdf-flattener-1082284355568.us-central1.run.app';

const App = () => {
    const [view, setView] = useState('flatten'); // 'flatten' or 'compress'
    const [user, setUser] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(true);

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const isWhitelisted = user && WHITELIST.includes(user.email);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed:", error);
            alert("登入失敗: " + error.message);
        }
    };

    const handleLogout = () => signOut(auth);
    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const commonProps = { user, isWhitelisted, isDarkMode, handleLogin, handleLogout, toggleTheme };

    return (
        <div className={`min-h-screen transition-colors duration-700 font-sans selection:bg-indigo-500/30 ${isDarkMode ? 'bg-[#0a0a0a] text-white' : 'bg-[#fafafa] text-zinc-900'}`}>
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-opacity duration-1000 ${isDarkMode ? 'bg-indigo-900/20 opacity-100' : 'bg-indigo-500/10 opacity-60'}`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-opacity duration-1000 ${isDarkMode ? 'bg-blue-900/10 opacity-100' : 'bg-blue-500/5 opacity-60'}`} />
            </div>

            {/* Navigation */}
            <nav className="relative z-20 flex justify-between items-center px-6 md:px-10 py-6 md:py-8 max-w-7xl mx-auto">
                <div className="flex items-center space-x-8">
                    <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-white' : 'bg-zinc-900 shadow-xl'}`}>
                            <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-black' : 'bg-white'} animate-pulse`} />
                        </div>
                        <span className="text-xl font-black tracking-tighter italic">FLATMODERN</span>
                    </div>

                    {/* View Switcher */}
                    <div className={`hidden md:flex p-1 rounded-full border ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-100 border-black/5'}`}>
                        <button
                            onClick={() => setView('flatten')}
                            className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'flatten' ? (isDarkMode ? 'bg-white text-black' : 'bg-zinc-900 text-white') : 'opacity-40 hover:opacity-100'}`}
                        >
                            Flatten
                        </button>
                        <button
                            onClick={() => setView('compress')}
                            className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'compress' ? (isDarkMode ? 'bg-white text-black' : 'bg-zinc-900 text-white') : 'opacity-40 hover:opacity-100'}`}
                        >
                            Compress
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {user ? (
                        <div className="flex items-center space-x-3">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-[9px] font-bold opacity-50 uppercase tracking-widest">{user.displayName}</span>
                                {isWhitelisted && <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">Pro Access</span>}
                            </div>
                            <button onClick={handleLogout} className={`p-2.5 rounded-full border transition-all duration-500 ${isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-black/5 hover:bg-black/5'}`} title="登出">
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleLogin} className={`flex items-center space-x-2 px-5 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${isDarkMode ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
                            <User size={14} />
                            <span>Login</span>
                        </button>
                    )}
                    <button onClick={toggleTheme} className={`p-2.5 rounded-full border transition-all duration-500 ${isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-black/5 hover:bg-black/5'}`}>
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </nav>

            {/* Mobile View Switcher */}
            <div className="md:hidden flex justify-center px-6 mb-4">
                <div className={`flex p-1 rounded-full border w-full ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-100 border-black/5'}`}>
                    <button onClick={() => setView('flatten')} className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'flatten' ? (isDarkMode ? 'bg-white text-black' : 'bg-zinc-900 text-white') : 'opacity-40'}`}>Flatten</button>
                    <button onClick={() => setView('compress')} className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'compress' ? (isDarkMode ? 'bg-white text-black' : 'bg-zinc-900 text-white') : 'opacity-40'}`}>Compress</button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={view}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                    {view === 'flatten' ? <FlattenView {...commonProps} /> : <CompressView {...commonProps} />}
                </motion.div>
            </AnimatePresence>

            <footer className={`relative z-10 border-t py-16 px-8 text-center transition-colors duration-500 ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
                <p className="text-[10px] font-bold tracking-[0.5em] uppercase opacity-20">FlatModern Engineering / Cloud-Native PDF Solutions</p>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-10 mt-2">© 2025 FLATMODERN STUDIO</p>
            </footer>
        </div>
    );
};

const FlattenView = ({ isWhitelisted, isDarkMode, user, handleLogin }) => {
    const [selectedEngine, setSelectedEngine] = useState('ghostscript');
    const [quality, setQuality] = useState('high');
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [result, setResult] = useState(null);

    const engines = [
        {
            id: 'ghostscript',
            name: 'Ghostscript',
            subtitle: 'Industrial Precision',
            description: '工業級點陣化技術，徹底移除所有交互層。' + (!isWhitelisted ? ' (需 Pro 權限)' : ''),
            icon: <Cpu className="w-5 h-5" />,
            tag: '推薦使用'
        },
        {
            id: 'nodejs',
            name: 'Node.js Core',
            subtitle: 'Speed & Scale',
            description: '基於 pdf-lib 的輕量化處理，專為 Web 優化，處理速度極快。',
            icon: <Zap className="w-5 h-5" />,
            tag: '高效能'
        }
    ];

    const executeFlattening = async () => {
        if (!file) return;
        if (selectedEngine !== 'nodejs' && !isWhitelisted) {
            alert('此引擎僅限白名單使用者使用。請先登入或連繫管理員。');
            return;
        }
        setIsProcessing(true);
        try {
            if (selectedEngine === 'nodejs') {
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const form = pdfDoc.getForm();
                form.flatten();
                const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                setResult({ blob, size: blob.size, name: `flattened_node_${file.name}` });
            } else {
                const formData = new FormData();
                formData.append('file', file);
                const dpi = quality === 'low' ? 72 : quality === 'medium' ? 150 : 600;
                const endpoint = `/flatten/ghostscript?quality=${quality}&dpi=${dpi}`;
                const response = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', body: formData });
                if (!response.ok) throw new Error('後端處理失敗');
                const blob = await response.blob();
                setResult({ blob, size: blob.size, name: `flattened_gs_${file.name}` });
            }
        } catch (error) {
            alert(`扁平化失敗: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadFile = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-20">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-20">
                <div className="lg:col-span-7">
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
                        Flatten <br />
                        <span className={isDarkMode ? 'text-zinc-600' : 'text-zinc-300'}>Every Layer.</span>
                    </h1>
                    <p className={`text-lg md:text-xl max-w-lg mb-12 font-light ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>極簡、精確、不可逆。為現代數位流程重新定義 PDF 扁平化體驗。</p>
                    <label
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setFile(f); }}
                        className={`relative group cursor-pointer aspect-video lg:h-96 backdrop-blur-3xl border rounded-[2.5rem] flex flex-col items-center justify-center p-8 transition-all duration-500 ${isDarkMode ? 'bg-zinc-900/40 border-white/10' : 'bg-white/80 border-black/5 shadow-2xl'}`}
                    >
                        <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                        />
                        {result ? (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center w-full">
                                <h3 className="text-2xl font-black mb-2">處理完成</h3>
                                <div className="flex justify-center items-center space-x-6 mb-8 mt-4">
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase font-bold opacity-30">Original</p>
                                        <p className="text-lg font-black italic">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <ArrowRight className="opacity-20" size={16} />
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase font-bold text-indigo-500">Flattened</p>
                                        <p className="text-lg font-black italic">{(result.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <div className="flex space-x-3 justify-center">
                                    <button onClick={() => { setFile(null); setResult(null); }} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'}`}>重新開始</button>
                                    <button onClick={() => downloadFile(result.blob, result.name)} className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${isDarkMode ? 'bg-white text-black' : 'bg-zinc-900 text-white shadow-xl'}`}>即刻下載</button>
                                </div>
                            </motion.div>
                        ) : file ? (
                            <div className="text-center animate-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 mx-auto mb-6"><FileText size={40} /></div>
                                <p className="text-xl font-bold mb-1">{file.name}</p>
                                <p className="text-[10px] uppercase tracking-widest opacity-40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }} className="mt-4 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity underline">移除檔案</button>
                            </div>
                        ) : (
                            <>
                                <div className={`p-6 rounded-full mb-6 ${isDarkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}><Upload size={32} /></div>
                                <p className="text-lg font-bold uppercase tracking-tight">Drag & Drop PDF</p>
                            </>
                        )}
                    </label>
                </div>
                <div className="lg:col-span-5 space-y-8 pt-10">
                    <div className="space-y-4">
                        {engines.map(engine => (
                            <div key={engine.id} onClick={() => setSelectedEngine(engine.id)} className={`p-6 rounded-3xl border cursor-pointer transition-all duration-500 ${selectedEngine === engine.id ? (isDarkMode ? 'bg-white text-black scale-[1.02]' : 'bg-zinc-900 text-white scale-[1.02]') : (isDarkMode ? 'bg-zinc-900/30 border-white/5 opacity-60' : 'bg-white border-black/5 opacity-60')}`}>
                                <div className="flex justify-between mb-4">
                                    <div className={selectedEngine === engine.id ? (isDarkMode ? 'text-black' : 'text-white') : 'text-zinc-500'}>{engine.icon}</div>
                                    {selectedEngine === engine.id && <ChevronRight size={16} strokeWidth={3} />}
                                </div>
                                <h4 className="text-xl font-black mb-1">{engine.name}</h4>
                                <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${selectedEngine === engine.id ? 'opacity-50' : 'text-indigo-500'}`}>{engine.subtitle}</p>
                                <p className="text-xs opacity-70 leading-relaxed">{engine.description}</p>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <div className={`p-1.5 rounded-2xl flex space-x-2 ${isDarkMode ? 'bg-zinc-900/50 border border-white/5' : 'bg-zinc-100 border border-black/5'}`}>
                            {[{ id: 'low', label: 'Standard' }, { id: 'medium', label: 'High' }, { id: 'high', label: 'Ultra' }].map(q => (
                                <button key={q.id} onClick={() => setQuality(q.id)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${quality === q.id ? (isDarkMode ? 'bg-white text-black shadow-lg' : 'bg-zinc-900 text-white shadow-lg') : 'opacity-40 hover:opacity-100'}`}>{q.label}</button>
                            ))}
                        </div>
                    </div>
                    <button disabled={!file || isProcessing} onClick={executeFlattening} className={`w-full py-7 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] transition-all duration-700 ${file && !isProcessing ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-white shadow-2xl') : 'bg-zinc-800/20 text-zinc-600 cursor-not-allowed'}`}>
                        {isProcessing ? 'Processing...' : 'Run Flatten'}
                    </button>
                </div>
            </div>
        </main>
    );
};

const CompressView = ({ isWhitelisted, isDarkMode, user, handleLogin }) => {
    const [selectedLevel, setSelectedLevel] = useState('recommended');
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);

    const levels = [
        { id: 'extreme', title: 'Extreme', subtitle: '最低畫質，最高壓縮', description: '將圖片降至 72 DPI，適合郵件附件傳輸。', icon: <Zap className="w-5 h-5" />, tag: '最快' },
        { id: 'recommended', title: 'Recommended', subtitle: '平衡畫質與體積', description: '維持 150 DPI，大部分文件的最佳選擇。', icon: <FileText className="w-5 h-5" />, tag: '最佳平衡' },
        { id: 'high', title: 'High Quality', subtitle: '保留細節，輕微壓縮', description: '300 DPI 原生品質，僅優化檔案結構。', icon: <FileText className="w-5 h-5" />, tag: '無損感' }
    ];

    const executeCompression = async () => {
        if (!file) return;
        if (!isWhitelisted) {
            alert('壓縮功能僅限白名單專業版使用者。請先登入或聯繫管理員。');
            return;
        }
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_BASE_URL}/compress/ghostscript?quality=${selectedLevel}`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('雲端壓縮失敗');
            const blob = await response.blob();
            setResult({ blob, size: blob.size, name: `compressed_cloud_${file.name}` });
        } catch (error) {
            alert(`壓縮失敗: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadFile = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-20">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-20">
                <div className="lg:col-span-6">
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none mb-8">Reduce <br /><span className={isDarkMode ? 'text-zinc-600' : 'text-zinc-300'}>Without Regret.</span></h1>
                    <p className={`text-lg md:text-xl mb-12 font-light ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>針對不同的使用場景，精準重構您的 PDF 體積。</p>

                    <label
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setFile(f); }}
                        className={`relative aspect-video rounded-[3rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${isDarkMode ? 'bg-zinc-900/20 border-white/10 hover:border-indigo-500' : 'bg-white border-black/10 hover:border-indigo-500 shadow-sm'}`}
                    >
                        <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                        />
                        {result ? (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center w-full px-6">
                                <h3 className="text-xl font-black mb-8">壓縮任務完成</h3>
                                <div className="grid grid-cols-3 items-center gap-4 mb-10">
                                    <div className="text-right">
                                        <p className="text-[8px] uppercase font-bold opacity-30 tracking-widest mb-1">Before</p>
                                        <p className="text-md font-black italic">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <div className="flex flex-col items-center opacity-20">
                                        <ArrowRight size={20} />
                                        <p className="text-[8px] font-black">{((1 - result.size / file.size) * 100).toFixed(0)}% OFF</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[8px] uppercase font-bold text-indigo-500 tracking-widest mb-1">After</p>
                                        <p className="text-md font-black italic">{(result.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <div className="flex space-x-3 justify-center">
                                    <button onClick={() => { setFile(null); setResult(null); }} className={`p-5 rounded-2xl border ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'}`}><RefreshCw size={16} /></button>
                                    <button onClick={() => downloadFile(result.blob, result.name)} className={`px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest ${isDarkMode ? 'bg-white text-black' : 'bg-zinc-900 text-white shadow-xl'}`}>即刻下載</button>
                                </div>
                            </motion.div>
                        ) : file ? (
                            <div className="text-center">
                                <FileText size={48} className="text-indigo-500 mx-auto mb-4" />
                                <p className="text-lg font-bold">{file.name}</p>
                                <p className="text-[10px] opacity-40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }} className="mt-4 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity underline">移除檔案</button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 p-5 rounded-full bg-indigo-500/10 text-indigo-500"><ArrowDownCircle size={40} /></div>
                                <p className="text-xl font-bold">放置 PDF 於此</p>
                                {!isWhitelisted && <p className="text-[9px] uppercase font-bold tracking-widest opacity-40 mt-2 text-indigo-500">PRO ONLY</p>}
                            </>
                        )}
                    </label>
                </div>
                <div className="lg:col-span-6 space-y-6 pt-10">
                    <div className="space-y-4">
                        {levels.map(level => (
                            <div key={level.id} onClick={() => setSelectedLevel(level.id)} className={`relative p-8 rounded-[2.5rem] border cursor-pointer transition-all duration-500 ${selectedLevel === level.id ? (isDarkMode ? 'bg-[#111] border-white/20' : 'bg-white border-zinc-900 shadow-2xl') : (isDarkMode ? 'bg-zinc-900/10 border-white/5 opacity-50' : 'bg-white border-black/5 opacity-60')}`}>
                                <div className="flex justify-between items-center mb-6">
                                    <div className={selectedLevel === level.id ? 'text-indigo-500' : 'text-zinc-500'}>{level.icon}</div>
                                    {level.tag && <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${selectedLevel === level.id ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{level.tag}</span>}
                                </div>
                                <h4 className="text-2xl font-black mb-1">{level.title}</h4>
                                <p className="text-[10px] uppercase font-bold text-indigo-500/70 mb-3">{level.subtitle}</p>
                                <p className="text-sm opacity-50 leading-relaxed font-light">{level.description}</p>
                            </div>
                        ))}
                    </div>
                    <button disabled={!file || isProcessing} onClick={executeCompression} className={`relative overflow-hidden w-full py-8 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] transition-all duration-700 ${file && !isProcessing ? (isDarkMode ? 'bg-white text-black' : 'bg-zinc-900 text-white shadow-2xl') : 'bg-zinc-800/20 text-zinc-600 cursor-not-allowed'}`}>
                        <span className="relative z-10 transition-all duration-500">
                            {isProcessing ? 'Processing Cloud Task...' : 'Start Cloud Compression'}
                        </span>
                    </button>
                </div>
            </div>
        </main >
    );
};

export default App;
