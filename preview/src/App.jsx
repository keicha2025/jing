import React, { useState, useRef, useEffect } from 'react';
import {
    Play,
    Pause,
    RotateCcw,
    RotateCw,
    Upload,
    List,
    Volume2,
    Repeat,
    Music,
    Trash2,
    X,
    FastForward,
    Rewind,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const App = () => {
    const [files, setFiles] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isLoop, setIsLoop] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isDbLoading, setIsDbLoading] = useState(true);

    const audioRef = useRef(null);
    const fileInputRef = useRef(null);

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];

    // IndexedDB Setup
    const openDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AudioPlayerDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    };

    const saveFileToDB = async (fileObj) => {
        const db = await openDB();
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        await store.put(fileObj);
    };

    const loadFilesFromDB = async () => {
        const db = await openDB();
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const request = store.getAll();
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result);
        });
    };

    const deleteFileFromDB = async (id) => {
        const db = await openDB();
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        await store.delete(id);
    };

    const clearAllFilesFromDB = async () => {
        const db = await openDB();
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        await store.clear();
    };

    // Load files on mount
    useEffect(() => {
        const init = async () => {
            try {
                const storedFiles = await loadFilesFromDB();
                if (storedFiles.length > 0) {
                    const filesWithUrls = storedFiles.map(f => ({
                        ...f,
                        url: URL.createObjectURL(f.blob)
                    }));
                    setFiles(filesWithUrls);
                    setCurrentTrackIndex(0);
                }
            } catch (err) {
                console.error("Failed to load from DB", err);
            } finally {
                setIsDbLoading(false);
            }
        };
        init();
    }, []);

    // Initialize audio listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleEnded = () => {
            if (isLoop) {
                audio.play();
            } else {
                handleNext();
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [currentTrackIndex, isLoop, files]);

    // Update playback rate when speed changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed, currentTrackIndex]);

    const handleFileUpload = async (e) => {
        const uploadedFiles = Array.from(e.target.files).filter(file =>
            file.type.includes('audio') || file.name.endsWith('.m4a')
        );

        const newFiles = await Promise.all(uploadedFiles.map(async (file) => {
            const id = Math.random().toString(36).substr(2, 9);
            const name = file.name.replace(/\.[^/.]+$/, "");
            const fileObj = {
                id,
                name,
                blob: file, // Store the actual File/Blob
                type: file.type
            };
            await saveFileToDB(fileObj);
            return {
                ...fileObj,
                url: URL.createObjectURL(file)
            };
        }));

        setFiles(prev => [...prev, ...newFiles]);
        if (currentTrackIndex === null && newFiles.length > 0) {
            setCurrentTrackIndex(0);
        }
    };

    const togglePlay = () => {
        if (currentTrackIndex === null) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handlePrev = () => {
        if (files.length === 0) return;
        const nextIndex = currentTrackIndex === 0 ? files.length - 1 : currentTrackIndex - 1;
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true);
    };

    const handleNext = () => {
        if (files.length === 0) return;
        const nextIndex = (currentTrackIndex + 1) % files.length;
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true);
    };

    const skipTime = (seconds) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
        }
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const formatTime = (time) => {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const removeTrack = async (e, index) => {
        e.stopPropagation();
        const trackToRemove = files[index];
        await deleteFileFromDB(trackToRemove.id);

        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        if (index === currentTrackIndex) {
            setCurrentTrackIndex(null);
            setIsPlaying(false);
        } else if (index < currentTrackIndex) {
            setCurrentTrackIndex(currentTrackIndex - 1);
        }
    };

    const clearAllData = async () => {
        if (window.confirm("確定要清除所有快取的音檔嗎？")) {
            await clearAllFilesFromDB();
            setFiles([]);
            setCurrentTrackIndex(null);
            setIsPlaying(false);
            window.location.reload(); // Force reload to clear blobs
        }
    };

    const currentTrack = currentTrackIndex !== null ? files[currentTrackIndex] : null;

    return (
        <div className="min-h-screen bg-neutral-900 text-white font-sans selection:bg-indigo-500 overflow-hidden flex flex-col">
            {/* Dynamic Background Gradients */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Header - Compact */}
            <header className="relative z-20 p-4 flex items-center justify-between max-w-md mx-auto w-full">
                <button onClick={clearAllData} className="p-2.5 bg-white/5 hover:bg-white/10 text-neutral-500 hover:text-white rounded-xl transition-all flex items-center gap-2">
                    <Trash2 size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">清除快取</span>
                </button>
                <span className="font-bold text-base tracking-tight opacity-70">Personal Audio Player</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowPlaylist(true)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                        <List size={20} />
                    </button>
                    <button onClick={() => setIsLoop(!isLoop)} className={`p-2.5 rounded-xl transition-all ${isLoop ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 text-neutral-500'}`}>
                        <Repeat size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-between p-4 max-w-md mx-auto w-full pb-10">

                {/* Track Info Card - Much Smaller for Mobile */}
                <div className="w-full h-32 mb-4 relative group">
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[30px] overflow-hidden shadow-xl flex items-center px-6">
                        {currentTrack ? (
                            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500 w-full">
                                <div className={`w-20 h-20 shrink-0 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg transition-transform duration-700 ${isPlaying ? 'rotate-animation' : ''}`}>
                                    <Music size={32} className="text-white/90" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-xl font-bold truncate leading-tight">
                                        {currentTrack.name}
                                    </h1>
                                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mt-1">
                                        {isPlaying ? 'Playing' : 'Paused'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 w-full">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                                    <Upload size={24} className="text-neutral-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-neutral-400 font-medium text-sm">尚未選擇音檔</p>
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        className="mt-1 text-indigo-400 text-xs font-bold uppercase tracking-wider"
                                    >
                                        立即上傳
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full mb-6 mt-auto">
                    <div className="flex justify-between mb-3 text-xs font-black tracking-tighter text-neutral-400 bg-white/5 py-1 px-3 rounded-full w-max mx-auto border border-white/5">
                        <span>{formatTime(currentTime)}</span>
                        <span className="mx-2 opacity-30">/</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-white transition-all active:h-4 shadow-inner"
                    />
                </div>

                {/* Speed Selector (Chips) - More compact */}
                <div className="w-full mb-6 overflow-x-auto no-scrollbar">
                    <div className="flex gap-2 min-w-max px-2">
                        {speeds.map(speed => (
                            <button
                                key={speed}
                                onClick={() => setPlaybackSpeed(speed)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all border ${playbackSpeed === speed
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                                    : 'bg-white/5 text-neutral-500 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {speed}x
                            </button>
                        ))}
                    </div>
                </div>

                {/* Major Controls - Mobile Optimized gaps */}
                <div className="flex items-center justify-center w-full gap-3 mb-6">
                    {/* Back 10s */}
                    <button
                        onClick={() => skipTime(-10)}
                        className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 border border-white/5 group"
                    >
                        <RotateCcw size={18} className="opacity-40 group-hover:text-white" />
                        <span className="text-[8px] font-bold mt-0.5 opacity-40">-10s</span>
                    </button>

                    {/* Back 3s */}
                    <button
                        onClick={() => skipTime(-3)}
                        className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border border-white/5 group"
                    >
                        <RotateCcw size={20} className="group-hover:text-indigo-400 transition-colors" />
                        <span className="text-[10px] font-bold mt-0.5 opacity-60">-3s</span>
                    </button>

                    {/* PLAY / PAUSE - BIG MASTER BUTTON */}
                    <button
                        onClick={togglePlay}
                        className="w-24 h-24 bg-white text-black rounded-[32px] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_15px_40px_rgba(255,255,255,0.1)] group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-neutral-200"></div>
                        <div className="relative z-10">
                            {isPlaying ?
                                <Pause size={40} fill="currentColor" strokeWidth={0} /> :
                                <Play size={40} fill="currentColor" strokeWidth={0} className="ml-1.5" />
                            }
                        </div>
                    </button>

                    {/* Forward 3s */}
                    <button
                        onClick={() => skipTime(3)}
                        className="w-14 h-14 bg-indigo-600/10 hover:bg-indigo-600/20 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border border-indigo-500/20 group"
                    >
                        <RotateCw size={20} className="text-indigo-400" />
                        <span className="text-[10px] font-bold mt-0.5 text-indigo-400">+3s</span>
                    </button>

                    {/* Forward 10s */}
                    <button
                        onClick={() => skipTime(10)}
                        className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex flex-col items-center justify-center transition-all active:scale-90 border border-white/5 group"
                    >
                        <RotateCw size={18} className="opacity-40 group-hover:text-white" />
                        <span className="text-[8px] font-bold mt-0.5 opacity-40">+10s</span>
                    </button>
                </div>

                {/* Extra Navigation Controls - Smaller */}
                <div className="flex items-center justify-center gap-12 mb-8">
                    <button onClick={handlePrev} className="p-2 text-neutral-500 hover:text-white transition-colors">
                        <ChevronLeft size={28} />
                    </button>
                    <button onClick={handleNext} className="p-2 text-neutral-500 hover:text-white transition-colors">
                        <ChevronRight size={28} />
                    </button>
                </div>

                {/* Volume Slider - Thinner for Mobile */}
                <div className="flex items-center gap-4 w-full px-4">
                    <Volume2 size={16} className="text-neutral-500" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVolume(val);
                            audioRef.current.volume = val;
                        }}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </main>

            {/* Hidden File Input & Audio element */}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".m4a,audio/*" multiple className="hidden" />
            <audio
                ref={audioRef}
                src={currentTrack?.url}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                autoPlay={isPlaying}
            />

            {/* Playlist Drawer */}
            <div className={`fixed inset-0 z-50 transition-all duration-500 ${showPlaylist ? 'visible' : 'invisible'}`}>
                <div
                    className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500 ${showPlaylist ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setShowPlaylist(false)}
                />
                <div className={`absolute bottom-0 left-0 right-0 bg-neutral-900 rounded-t-[48px] p-8 transition-transform duration-500 ease-out max-h-[85vh] overflow-hidden flex flex-col border-t border-white/10 ${showPlaylist ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold">播放清單</h2>
                            <p className="text-neutral-500 text-sm">{files.length} 首音檔</p>
                        </div>
                        <button onClick={() => setShowPlaylist(false)} className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {files.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-neutral-500">
                                <Music size={48} className="mb-4 opacity-20" />
                                <p>尚無檔案，請先上傳</p>
                            </div>
                        ) : (
                            files.map((file, index) => (
                                <div
                                    key={file.id}
                                    onClick={() => {
                                        setCurrentTrackIndex(index);
                                        setIsPlaying(true);
                                        setShowPlaylist(false);
                                    }}
                                    className={`flex items-center gap-4 p-5 rounded-3xl cursor-pointer transition-all ${index === currentTrackIndex ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${index === currentTrackIndex ? 'bg-indigo-600' : 'bg-white/10'}`}>
                                        {index === currentTrackIndex && isPlaying ? (
                                            <div className="flex gap-1 items-end h-5">
                                                <div className="w-1.5 bg-white animate-[bounce_1s_infinite]"></div>
                                                <div className="w-1.5 bg-white animate-[bounce_1.2s_infinite]"></div>
                                                <div className="w-1.5 bg-white animate-[bounce_0.8s_infinite]"></div>
                                            </div>
                                        ) : (
                                            <Music size={20} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold truncate ${index === currentTrackIndex ? 'text-indigo-400' : 'text-white'}`}>
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-neutral-500 uppercase tracking-tighter">M4A Local File</p>
                                    </div>
                                    <button onClick={(e) => removeTrack(e, index)} className="p-3 text-neutral-600 hover:text-red-400 transition-colors">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={() => fileInputRef.current.click()}
                        className="mt-8 w-full py-5 bg-white text-black font-black text-lg rounded-3xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-white/5"
                    >
                        <Upload size={24} />
                        新增音檔
                    </button>
                </div>
            </div>

            <style jsx="true">{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
};

export default App;
