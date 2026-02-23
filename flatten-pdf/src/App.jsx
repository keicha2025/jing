import React, { useState } from 'react';
import {
    Upload, FileText, Cpu, Zap, Layers, ChevronRight,
    Check, Settings2, Info, Sun, Moon, ArrowRight, Loader2,
    LogIn, LogOut, User
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './lib/firebase';

const WHITELIST = ['wj209ing@gmail.com'];

const App = () => {
    const [selectedEngine, setSelectedEngine] = useState('python');
    const [quality, setQuality] = useState('high');
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [user, setUser] = useState(null);

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

    const engines = [
        {
            id: 'python',
            name: 'Python Engine',
            subtitle: 'Flexible & Intelligent',
            description: '使用 PyMuPDF 技術，提供最佳的向量路徑保留。' + (!isWhitelisted ? ' (需 Pro 權限)' : ''),
            icon: <Layers className="w-5 h-5" />,
            tag: '推薦使用'
        },
        {
            id: 'ghostscript',
            name: 'Ghostscript',
            subtitle: 'Industrial Precision',
            description: '工業級點陣化技術，徹底移除所有交互層。' + (!isWhitelisted ? ' (需 Pro 權限)' : ''),
            icon: <Cpu className="w-5 h-5" />,
            tag: '強力扁平化'
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

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const uploadedFile = e.dataTransfer.files[0];
            if (uploadedFile.type === 'application/pdf') {
                setFile(uploadedFile);
            } else {
                alert('請上傳 PDF 檔案');
            }
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const executeFlattening = async () => {
        if (!file) return;

        // Whitelist check for Python and Ghostscript
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
                const pdfBytes = await pdfDoc.save();

                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                downloadFile(blob, `flattened_node_${file.name}`);
            } else {
                // Backend integration for Python and Ghostscript
                const formData = new FormData();
                formData.append('file', file);

                // Use the precise Cloud Run URL verified via gcloud
                const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://pdf-flattener-1082284355568.us-central1.run.app';

                let endpoint = '';
                if (selectedEngine === 'python') {
                    const dpi = quality === 'low' ? 72 : quality === 'medium' ? 150 : 300;
                    endpoint = `/flatten/python?dpi=${dpi}`;
                } else {
                    endpoint = `/flatten/ghostscript?quality=${quality}`;
                }

                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || '後端處理失敗');
                }

                const blob = await response.blob();
                downloadFile(blob, `flattened_${selectedEngine}_${file.name}`);
            }
        } catch (error) {
            console.error('Flattening failed:', error);
            alert(`扁平化失敗: ${error.message}\n請確保選取的引擎相容您的檔案性質。`);
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
        <div className={`min-h-screen transition-colors duration-700 font-sans selection:bg-indigo-500/30 ${isDarkMode ? 'bg-[#0a0a0a] text-white' : 'bg-[#fafafa] text-zinc-900'
            }`}>

            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-opacity duration-1000 ${isDarkMode ? 'bg-indigo-900/20 opacity-100' : 'bg-indigo-500/10 opacity-60'
                    }`} />
                <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-opacity duration-1000 ${isDarkMode ? 'bg-blue-900/10 opacity-100' : 'bg-blue-500/5 opacity-60'
                    }`} />
            </div>

            {/* Navigation */}
            <nav className="relative z-20 flex justify-between items-center px-6 md:px-8 py-6 md:py-10 max-w-7xl mx-auto">
                <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 ${isDarkMode ? 'bg-white' : 'bg-zinc-900'
                        }`}>
                        <div className={`w-4 h-4 rounded-sm rotate-45 ${isDarkMode ? 'bg-black' : 'bg-white'}`} />
                    </div>
                    <span className="text-xl font-black tracking-tighter italic">FLATMODERN</span>
                </div>

                <div className="flex items-center space-x-4">
                    {user ? (
                        <div className="flex items-center space-x-3">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-[9px] font-bold opacity-50 uppercase tracking-widest">{user.displayName}</span>
                                {isWhitelisted && <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">Pro Access</span>}
                            </div>
                            <button
                                onClick={handleLogout}
                                className={`p-2.5 rounded-full border transition-all duration-500 ${isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-black/5 hover:bg-black/5'}`}
                                title="登出"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className={`flex items-center space-x-2 px-5 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${isDarkMode ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                                }`}
                        >
                            <User size={14} />
                            <span>Login</span>
                        </button>
                    )}

                    <button
                        onClick={toggleTheme}
                        className={`p-2.5 rounded-full border transition-all duration-500 ${isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-black/5 hover:bg-black/5'
                            }`}
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 pt-6 pb-20">
                <div className="grid lg:grid-cols-12 gap-10 lg:gap-20 items-start">

                    {/* Left Side: Upload & Info */}
                    <div className="lg:col-span-7">
                        <div className="inline-block px-3 py-1 mb-6 rounded-full border border-indigo-500/20 text-[10px] font-bold tracking-widest text-indigo-500 uppercase">
                            V2.4 Stable Build
                        </div>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-8 md:mb-10">
                            Flatten <br />
                            <span className={`transition-colors duration-500 ${isDarkMode ? 'text-zinc-600' : 'text-zinc-300'}`}>Every Layer.</span>
                        </h1>

                        <p className={`text-lg md:text-xl max-w-lg mb-10 md:mb-14 leading-relaxed font-light ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            極簡、精確、不可逆。為現代數位流程重新定義 PDF 扁平化體驗。
                        </p>

                        {/* Dropzone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('fileInput').click()}
                            className={`relative group cursor-pointer transition-all duration-700 ${isDragging ? 'scale-[0.97]' : 'scale-100'
                                }`}
                        >
                            <input
                                id="fileInput"
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-[2rem] blur transition-opacity duration-1000 ${isDragging ? 'opacity-40' : 'opacity-0 group-hover:opacity-10'
                                }`} />

                            <div className={`relative aspect-video lg:aspect-[16/9] lg:h-96 backdrop-blur-3xl border rounded-[2rem] flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden transition-all duration-500 ${isDarkMode
                                ? 'bg-zinc-900/40 border-white/10'
                                : 'bg-white/80 border-black/5 shadow-2xl shadow-black/[0.03]'
                                }`}>
                                {file ? (
                                    <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-700">
                                        <div className="relative">
                                            <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-500">
                                                <FileText size={48} />
                                            </div>
                                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-[#0a0a0a] flex items-center justify-center">
                                                <Check size={14} className="text-white" strokeWidth={4} />
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold tracking-tight mb-1">{file.name}</p>
                                            <p className={`text-xs uppercase tracking-widest opacity-40`}>{(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity underline underline-offset-8">Remove and retry</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`mb-8 p-6 rounded-full transition-colors duration-500 ${isDarkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}>
                                            <Upload size={40} />
                                        </div>
                                        <p className="text-xl font-bold tracking-tight mb-2 uppercase">Drag & Drop or Click</p>
                                        <p className={`text-sm tracking-wide opacity-40 font-medium`}>支援向量 PDF、表單與註解文件</p>
                                    </>
                                )}
                                <div className={`absolute inset-0 pointer-events-none opacity-[0.03] ${isDarkMode ? 'invert-0' : 'invert'}`} style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Engine Selection */}
                    <div className="lg:col-span-5 space-y-8 pt-10">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className={`text-[10px] uppercase tracking-[0.3em] font-black ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Select Processing Engine
                            </h3>
                            <Settings2 size={16} className="opacity-30" />
                        </div>

                        <div className="space-y-4">
                            {engines.map((engine) => (
                                <div
                                    key={engine.id}
                                    onClick={() => setSelectedEngine(engine.id)}
                                    className={`group relative p-6 md:p-8 rounded-3xl border transition-all duration-500 cursor-pointer overflow-hidden ${selectedEngine === engine.id
                                        ? (isDarkMode ? 'bg-white border-white scale-[1.02]' : 'bg-zinc-900 border-zinc-900 scale-[1.02] shadow-2xl shadow-black/20')
                                        : (isDarkMode ? 'bg-zinc-900/30 border-white/5 hover:border-white/20' : 'bg-white border-black/5 hover:border-black/10')
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-6">
                                        <div className={`transition-colors duration-500 ${selectedEngine === engine.id
                                            ? (isDarkMode ? 'text-black' : 'text-white')
                                            : (isDarkMode ? 'text-zinc-500' : 'text-zinc-400')
                                            }`}>
                                            {engine.icon}
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            {engine.tag && (
                                                <span className={`text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest font-black transition-colors duration-500 ${selectedEngine === engine.id
                                                    ? (isDarkMode ? 'bg-black/5 text-black' : 'bg-white/10 text-white')
                                                    : (isDarkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400')
                                                    }`}>
                                                    {engine.tag}
                                                </span>
                                            )}
                                            {selectedEngine === engine.id && (
                                                <div className={`animate-in fade-in zoom-in duration-500 ${isDarkMode ? 'text-black' : 'text-white'}`}>
                                                    <Check size={18} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className={`text-2xl font-black tracking-tight mb-1 transition-colors duration-500 ${selectedEngine === engine.id
                                            ? (isDarkMode ? 'text-black' : 'text-white')
                                            : (isDarkMode ? 'text-white' : 'text-zinc-900')
                                            }`}>
                                            {engine.name}
                                        </h4>
                                        <p className={`text-[10px] mb-4 uppercase tracking-[0.1em] font-bold transition-colors duration-500 ${selectedEngine === engine.id
                                            ? (isDarkMode ? 'text-black/50' : 'text-white/50')
                                            : 'text-indigo-500'
                                            }`}>
                                            {engine.subtitle}
                                        </p>
                                        <p className={`text-sm leading-relaxed transition-colors duration-500 ${selectedEngine === engine.id
                                            ? (isDarkMode ? 'text-black/70' : 'text-white/70')
                                            : (isDarkMode ? 'text-zinc-500' : 'text-zinc-500')
                                            }`}>
                                            {engine.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quality Selection */}
                        <div className="space-y-4">
                            <h3 className={`text-[10px] uppercase tracking-[0.3em] font-black ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                Select Output Quality (DPI)
                            </h3>
                            <div className={`p-2 rounded-2xl flex space-x-2 transition-colors duration-500 ${isDarkMode ? 'bg-zinc-900/50 border border-white/5' : 'bg-zinc-100 border border-black/5'
                                }`}>
                                {['low', 'medium', 'high'].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => setQuality(q)}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${quality === q
                                            ? (isDarkMode ? 'bg-white text-black shadow-lg' : 'bg-zinc-900 text-white shadow-lg')
                                            : (isDarkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900')
                                            }`}
                                    >
                                        {q === 'low' ? 'Standard' : q === 'medium' ? 'High' : 'Ultra'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            disabled={!file || isProcessing}
                            onClick={executeFlattening}
                            className={`w-full py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all duration-700 group relative overflow-hidden ${file && !isProcessing
                                ? (isDarkMode ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-500/20' : 'bg-zinc-900 text-white shadow-xl shadow-black/20')
                                : 'bg-zinc-800/20 text-zinc-600 cursor-not-allowed border border-white/5'
                                }`}
                        >
                            <div className="relative z-10 flex items-center justify-center">
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="animate-spin mr-3 w-4 h-4" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Execute Flattening
                                        <ArrowRight className={`ml-3 w-4 h-4 transition-transform duration-500 ${file ? 'group-hover:translate-x-2' : ''}`} />
                                    </>
                                )}
                            </div>
                            {file && !isProcessing && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            )}
                        </button>

                        <div className={`flex items-start space-x-4 p-6 rounded-3xl border transition-colors duration-500 ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-200'
                            }`}>
                            <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                            <p className={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-indigo-300/60' : 'text-indigo-600/70'}`}>
                                Note: 扁平化處理是不可逆的。一旦執行，所有表單欄位將永久合併至頁面內容流。
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className={`relative z-10 border-t py-16 px-8 transition-colors duration-500 ${isDarkMode ? 'border-white/5' : 'border-black/5'
                }`}>
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0">
                    <div className="flex flex-col items-center md:items-start space-y-2">
                        <p className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-30">
                            © 2025 FLATMODERN STUDIO
                        </p>
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-20">
                            Professional PDF Processing Utilities
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
