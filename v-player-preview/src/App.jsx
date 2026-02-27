import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Play,
    Pause,
    RotateCcw,
    RotateCw,
    Maximize,
    Settings,
    List,
    Upload,
    X,
    Volume2,
    VolumeX,
    Trash2,
    Monitor,
    Columns,
    Square
} from 'lucide-react';

const PlayerSlot = ({
    id,
    videoFile,
    isActive,
    onSelect,
    onRemove,
    playbackSpeed,
    isMuted: globalMuted,
    volume: globalVolume,
    isSplitMode
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [slotSpeed, setSlotSpeed] = useState(playbackSpeed);
    const [slotMuted, setSlotMuted] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [hoverTime, setHoverTime] = useState(null);
    const [hoverPosition, setHoverPosition] = useState(0);
    const [lastTap, setLastTap] = useState(0);
    const [isPanning, setIsPanning] = useState(false);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [hasMoved, setHasMoved] = useState(false);

    const videoRef = useRef(null);
    const previewVideoRef = useRef(null);
    const controlsTimeoutRef = useRef(null);
    const slotContainerRef = useRef(null);

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    useEffect(() => {
        setSlotSpeed(playbackSpeed);
    }, [playbackSpeed]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleDurationChange = () => setDuration(video.duration);
        const handleEnded = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('ended', handleEnded);
        };
    }, [videoFile]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = slotSpeed;
        }
    }, [slotSpeed, videoFile]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = slotMuted || globalMuted;
            videoRef.current.volume = globalVolume;
        }
    }, [slotMuted, globalMuted, globalVolume]);

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                if (hoverTime === null && !showSettings) {
                    setShowControls(false);
                }
            }, 3000);
        }
    };

    const togglePlay = (e) => {
        if (e) e.stopPropagation();
        if (!videoFile) return;

        if (showSettings) {
            setShowSettings(false);
            return;
        }

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        videoRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const skip = (amount) => {
        if (videoRef.current) {
            videoRef.current.currentTime += amount;
        }
    };

    const handleDoubleTap = (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
            toggleFullscreen();
        }
        setLastTap(now);
    };

    const handlePanStart = (e) => {
        if (e.button !== 0 && !e.touches) return;
        // Prevent panning when clicking controls or progress bar area
        if (e.target.closest('.pointer-events-auto') || e.target.closest('input[type="range"]')) return;

        setIsPanning(true);
        setHasMoved(false);
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
    };

    const handlePanMove = useCallback((e) => {
        if (!isPanning) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (clientX === undefined || clientY === undefined) return;

        setHasMoved(true);
        setPanOffset({
            x: clientX - panStart.x,
            y: clientY - panStart.y
        });
    }, [isPanning, panStart]);

    const handlePanEnd = () => {
        setIsPanning(false);
    };

    useEffect(() => {
        if (isPanning) {
            window.addEventListener('mousemove', handlePanMove);
            window.addEventListener('mouseup', handlePanEnd);
            window.addEventListener('touchmove', handlePanMove, { passive: false });
            window.addEventListener('touchend', handlePanEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handlePanMove);
            window.removeEventListener('mouseup', handlePanEnd);
            window.removeEventListener('touchmove', handlePanMove);
            window.removeEventListener('touchend', handlePanEnd);
        };
    }, [isPanning, handlePanMove]);

    const toggleFullscreen = () => {
        const elem = slotContainerRef.current;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) elem.requestFullscreen();
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    const formatTime = (time) => {
        if (isNaN(time) || time === null) return "0:00";
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        const s = Math.floor(time % 60);
        return h > 0
            ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
            : `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleProgressInteraction = (clientX, currentTarget) => {
        if (!duration || !videoFile) return;
        const rect = currentTarget.getBoundingClientRect();
        const pos = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = pos / rect.width;
        const time = percentage * duration;

        setHoverTime(time);

        const popupWidth = 160;
        let popupLeft = pos;
        if (pos < popupWidth / 2) {
            popupLeft = popupWidth / 2;
        } else if (pos > rect.width - popupWidth / 2) {
            popupLeft = rect.width - popupWidth / 2;
        }

        setHoverPosition(popupLeft);

        if (previewVideoRef.current) {
            if (isNaN(previewVideoRef.current.currentTime) || Math.abs(previewVideoRef.current.currentTime - time) > 0.5) {
                previewVideoRef.current.currentTime = time;
            }
        }
        handleMouseMove();
    };

    const onTouchMove = (e) => {
        const touch = e.touches[0];
        handleProgressInteraction(touch.clientX, e.currentTarget);
    };

    if (!videoFile) {
        return (
            <div className="relative flex-1 bg-neutral-900 rounded-[32px] overflow-hidden flex flex-col items-center justify-center text-center p-8 border border-white/5 shadow-2xl">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                    <Upload size={24} className="text-neutral-500" />
                </div>
                <h3 className="text-lg font-bold mb-1">播放器 {id}</h3>
                <p className="text-neutral-500 text-sm max-w-[200px] mb-6">點擊側欄媒體庫選擇影片</p>
                <button
                    onClick={onSelect}
                    className="px-6 py-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-xl font-bold transition-all text-sm border border-indigo-600/30"
                >
                    選擇影片
                </button>
            </div>
        );
    }

    return (
        <div
            ref={slotContainerRef}
            className={`relative flex-1 bg-black rounded-[32px] overflow-hidden shadow-2xl group transition-all duration-500 ${isSplitMode ? 'border border-white/10' : ''}`}
            onMouseDown={handlePanStart}
            onTouchStart={(e) => {
                handleMouseMove();
                handlePanStart(e);
            }}
            onClick={(e) => {
                handleMouseMove();
                if (!hasMoved) handleDoubleTap(e);
            }}
        >
            <video
                ref={videoRef}
                src={videoFile.url}
                className={`h-full max-w-none select-none pointer-events-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{
                    transform: `translateX(${panOffset.x}px) scale(${zoom})`,
                    objectFit: 'cover'
                }}
                playsInline
            />

            <div className={`absolute inset-0 bg-black/40 transition-opacity duration-500 flex flex-col justify-between ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
                    <h2 className="text-sm font-semibold truncate max-w-[70%]">{videoFile.name}</h2>
                    <div className="flex gap-2">
                        <div className="flex bg-black/40 backdrop-blur-md rounded-lg overflow-hidden border border-white/10 p-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(1, prev - 0.1)); }}
                                className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-all"
                            >
                                <span className="text-xs font-bold">-</span>
                            </button>
                            <div className="px-2 flex items-center justify-center min-w-[36px]">
                                <span className="text-[10px] font-bold text-indigo-400">{Math.round(zoom * 100)}%</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(3, prev + 0.1)); }}
                                className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-all"
                            >
                                <span className="text-xs font-bold">+</span>
                            </button>
                        </div>
                        {isSplitMode && (
                            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-2 bg-white/10 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/10 rounded-lg transition-all">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-6 pointer-events-auto">
                    <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="p-5 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md transition-all active:scale-90">
                        <RotateCcw size={32} />
                    </button>
                    <button
                        onClick={togglePlay}
                        className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl"
                    >
                        {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="p-5 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md transition-all active:scale-90">
                        <RotateCw size={32} />
                    </button>
                </div>

                <div className="p-4 bg-gradient-to-t from-black/80 to-transparent space-y-3 pointer-events-auto">
                    {showSettings && (
                        <div className="absolute bottom-[100%] right-4 mb-2 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl min-w-[100px] animate-in slide-in-from-bottom-2 fade-in">
                            <h3 className="text-[10px] font-bold text-neutral-400 mb-2 uppercase tracking-wider">速度</h3>
                            <div className="flex flex-col gap-1">
                                {speeds.map(speed => (
                                    <button
                                        key={speed}
                                        onClick={(e) => { e.stopPropagation(); setSlotSpeed(speed); setShowSettings(false); }}
                                        className={`text-left px-2 py-1.5 rounded-lg text-xs font-semibold ${slotSpeed === speed ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-neutral-300'}`}
                                    >
                                        {speed}x
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div
                        className="group relative flex items-center py-2 cursor-pointer"
                        onMouseMove={(e) => handleProgressInteraction(e.clientX, e.currentTarget)}
                        onTouchMove={onTouchMove}
                        onTouchEnd={() => setHoverTime(null)}
                        onMouseLeave={() => setHoverTime(null)}
                    >
                        {hoverTime !== null && (
                            <div
                                className="absolute bottom-6 -translate-x-1/2 transition-opacity duration-200 pointer-events-none z-50"
                                style={{ left: `${hoverPosition}px` }}
                            >
                                <div className="relative w-[140px] aspect-video bg-neutral-950 rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/20 mb-2">
                                    <video
                                        ref={previewVideoRef}
                                        src={videoFile.url}
                                        className="w-full h-full object-cover"
                                        muted
                                        playsInline
                                    />
                                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-mono z-10">
                                        {formatTime(hoverTime)}
                                    </div>
                                </div>
                            </div>
                        )}
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-all group-hover:h-1.5 z-10"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-neutral-400">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setSlotMuted(!slotMuted); }} className="p-1.5 text-neutral-400 hover:text-white transition-colors">
                                {slotMuted || globalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className={`p-1.5 rounded-lg ${showSettings ? 'bg-indigo-500/20 text-white' : 'text-neutral-400 hover:text-white'}`}>
                                <Settings size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [videoFiles, setVideoFiles] = useState([]);
    const [viewMode, setViewMode] = useState('single'); // 'single', 'dual'
    const [splitRatio, setSplitRatio] = useState(50);
    const [slotVideos, setSlotVideos] = useState([null, null]);
    const [selectingSlot, setSelectingSlot] = useState(null);

    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isDbLoading, setIsDbLoading] = useState(true);
    const [isResizing, setIsResizing] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const fileInputRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // IndexedDB Boilerplate
    const openDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('VPlayerDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('videos')) {
                    db.createObjectStore('videos', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    };

    const saveFileToDB = async (fileObj) => {
        const db = await openDB();
        const tx = db.transaction('videos', 'readwrite');
        const store = tx.objectStore('videos');
        await store.put(fileObj);
    };

    const loadFilesFromDB = async () => {
        const db = await openDB();
        const tx = db.transaction('videos', 'readonly');
        const store = tx.objectStore('videos');
        const request = store.getAll();
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result);
        });
    };

    useEffect(() => {
        const init = async () => {
            try {
                const storedFiles = await loadFilesFromDB();
                if (storedFiles.length > 0) {
                    const filesWithUrls = storedFiles.map(f => ({
                        ...f,
                        url: URL.createObjectURL(f.blob)
                    }));
                    setVideoFiles(filesWithUrls);
                    setSlotVideos([filesWithUrls[0], null]);
                }
            } catch (err) {
                console.error("Failed to load from DB", err);
            } finally {
                setIsDbLoading(false);
            }
        };
        init();
    }, []);

    const handleFileUpload = async (e) => {
        const uploadedFiles = Array.from(e.target.files).filter(file => file.type.startsWith('video/'));
        const newVideos = await Promise.all(uploadedFiles.map(async (file) => {
            const id = Math.random().toString(36).substr(2, 9);
            const name = file.name.replace(/\.[^/.]+$/, "");
            const fileObj = { id, name, blob: file, type: file.type };
            await saveFileToDB(fileObj);
            return { ...fileObj, url: URL.createObjectURL(file) };
        }));
        setVideoFiles(prev => [...prev, ...newVideos]);
        if (slotVideos[0] === null && newVideos.length > 0) {
            setSlotVideos([newVideos[0], null]);
        }
    };

    const handleResize = useCallback((e) => {
        if (!isResizing) return;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        if (isMobile) {
            const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
            const percentage = (y / rect.height) * 100;
            setSplitRatio(Math.max(15, Math.min(85, percentage)));
        } else {
            const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
            const percentage = (x / rect.width) * 100;
            setSplitRatio(Math.max(15, Math.min(85, percentage)));
        }
    }, [isResizing, isMobile]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleResize);
            window.addEventListener('mouseup', () => setIsResizing(false));
            window.addEventListener('touchmove', handleResize);
            window.addEventListener('touchend', () => setIsResizing(false));
        }
        return () => {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('touchmove', handleResize);
        };
    }, [isResizing, handleResize]);

    const selectVideoForSlot = (video, slotIndex) => {
        const newSlots = [...slotVideos];
        newSlots[slotIndex] = video;
        setSlotVideos(newSlots);
        setShowPlaylist(false);
        setSelectingSlot(null);
    };

    if (isDbLoading) {
        return <div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
    }

    return (
        <div className="h-[100dvh] bg-black text-white font-sans overflow-hidden flex flex-col relative">
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-900 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-900 rounded-full blur-[150px]"></div>
            </div>

            <header className="relative z-20 p-5 flex justify-between items-center bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <Monitor size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black tracking-tight uppercase">V-Player</h1>
                        <p className="text-[10px] text-indigo-400 font-bold tracking-widest leading-none">Multi-View</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setViewMode(viewMode === 'single' ? 'dual' : 'single')}
                        className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold border ${viewMode === 'dual' ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/30' : 'bg-white/5 border-white/10 hover:bg-white/10 text-neutral-400 hover:text-white'}`}
                    >
                        {viewMode === 'dual' ? <Square size={16} /> : <Columns size={16} />}
                        <span className="hidden sm:inline">{viewMode === 'dual' ? '單視窗' : '分割視窗'}</span>
                    </button>
                    <button onClick={() => setShowPlaylist(true)} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
                        <List size={20} />
                    </button>
                </div>
            </header>

            <main className="relative z-10 flex-1 flex flex-col p-2 md:p-6 lg:p-10 select-none min-h-0 overflow-hidden">
                <div
                    ref={containerRef}
                    className={`flex-1 flex gap-4 relative overflow-hidden min-h-0 items-center justify-center ${isMobile ? 'flex-col' : 'flex-row'}`}
                >
                    <div
                        style={isMobile ? {
                            height: viewMode === 'dual' ? `${splitRatio}%` : 'auto',
                            width: '100%',
                            aspectRatio: viewMode === 'dual' ? 'auto' : '16/9'
                        } : {
                            width: viewMode === 'dual' ? `${splitRatio}%` : 'auto',
                            height: '100%',
                            aspectRatio: viewMode === 'dual' ? 'auto' : '16/9'
                        }}
                        className={`flex mb-1 transition-all duration-300 ease-out shrink-0 min-h-0 ${viewMode === 'single' ? 'max-w-full max-h-full' : 'max-h-full'}`}
                    >
                        <PlayerSlot
                            id={1}
                            videoFile={slotVideos[0]}
                            onSelect={() => { setSelectingSlot(0); setShowPlaylist(true); }}
                            onRemove={() => setSlotVideos([null, slotVideos[1]])}
                            playbackSpeed={playbackSpeed}
                            isMuted={isMuted}
                            volume={volume}
                            isSplitMode={viewMode === 'dual'}
                        />
                    </div>

                    {viewMode === 'dual' && (
                        <>
                            <div
                                className={`absolute z-30 group flex items-center justify-center cursor-pointer transition-all ${isMobile ? 'left-0 right-0 h-4 -translate-y-2' : 'top-0 bottom-0 w-4 -translate-x-2'}`}
                                style={isMobile ? { top: `${splitRatio}%`, left: 0, right: 0 } : { left: `${splitRatio}%`, top: 0, bottom: 0 }}
                                onMouseDown={() => setIsResizing(true)}
                                onTouchStart={() => setIsResizing(true)}
                            >
                                <div className={`${isMobile ? 'w-32 h-1' : 'w-1 h-32'} bg-indigo-600/30 group-hover:bg-indigo-500 rounded-full transition-all group-hover:scale-150`}></div>
                            </div>
                            <div className="flex-1 w-full flex min-h-0 min-w-0" style={isMobile ? { aspectRatio: viewMode === 'dual' ? '16/9' : 'auto' } : {}}>
                                <PlayerSlot
                                    id={2}
                                    videoFile={slotVideos[1]}
                                    onSelect={() => { setSelectingSlot(1); setShowPlaylist(true); }}
                                    onRemove={() => setSlotVideos([slotVideos[0], null])}
                                    playbackSpeed={playbackSpeed}
                                    isMuted={isMuted}
                                    volume={volume}
                                    isSplitMode={true}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-4 md:mt-6 flex items-center justify-center gap-4 md:gap-8 bg-white/5 backdrop-blur-xl p-3 md:p-4 rounded-3xl border border-white/10 max-w-lg mx-auto w-full shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMuted(!isMuted)} className="text-neutral-400 hover:text-white transition-colors">
                            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <input
                            type="range" min="0" max="1" step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                    <div className="h-6 w-px bg-white/10"></div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">全局速度</span>
                        <select
                            value={playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                            className="bg-transparent text-sm font-bold border-none focus:ring-0 cursor-pointer"
                        >
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => <option key={s} value={s}>{s}x</option>)}
                        </select>
                    </div>
                </div>
            </main>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" multiple className="hidden" />

            {/* Playlist Sidebar */}
            <div className={`fixed inset-0 z-50 transition-all duration-500 ${showPlaylist ? 'visible' : 'invisible'}`}>
                <div className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500 ${showPlaylist ? 'opacity-100' : 'opacity-0'}`} onClick={() => { setShowPlaylist(false); setSelectingSlot(null); }} />
                <div className={`absolute right-0 top-0 bottom-0 w-full max-w-sm bg-neutral-900 transition-transform duration-500 flex flex-col ${showPlaylist ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-8 flex items-center justify-between border-b border-white/5">
                        <div>
                            <h2 className="text-xl font-bold">{selectingSlot !== null ? `為播放器 ${selectingSlot + 1} 選擇影片` : '媒體庫'}</h2>
                            <p className="text-xs text-neutral-500 mt-1">{videoFiles.length} 部影片可用</p>
                        </div>
                        <button onClick={() => { setShowPlaylist(false); setSelectingSlot(null); }} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                        {videoFiles.map((video, index) => (
                            <div
                                key={video.id}
                                onClick={() => selectingSlot !== null ? selectVideoForSlot(video, selectingSlot) : selectVideoForSlot(video, 0)}
                                className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${slotVideos.some(v => v?.id === video.id) ? 'bg-indigo-600/20 border-indigo-500/50 active:scale-95' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
                            >
                                <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center shrink-0 border border-white/10">
                                    <Play size={14} fill="currentColor" className={slotVideos.some(v => v?.id === video.id) ? 'text-indigo-400' : 'text-neutral-600'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{video.name}</p>
                                    <p className="text-[10px] text-neutral-500 font-mono mt-1 uppercase">{video.type.split('/')[1]}</p>
                                </div>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm("確定要刪除此影片嗎？")) {
                                            const db = await openDB();
                                            const tx = db.transaction('videos', 'readwrite');
                                            const store = tx.objectStore('videos');
                                            await store.delete(video.id);
                                            setVideoFiles(prev => prev.filter(v => v.id !== video.id));
                                            setSlotVideos(prev => prev.map(v => v?.id === video.id ? null : v));
                                        }
                                    }}
                                    className="p-2 text-neutral-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        {videoFiles.length === 0 && (
                            <div className="text-center py-12 opacity-30">
                                <Upload size={40} className="mx-auto mb-4" />
                                <p className="text-sm">暫無影片</p>
                            </div>
                        )}
                    </div>

                    <div className="p-8 mt-auto space-y-3">
                        <button
                            onClick={async () => {
                                if (window.confirm("確定要清空媒體庫所有資料嗎？")) {
                                    const db = await openDB();
                                    const tx = db.transaction('videos', 'readwrite');
                                    const store = tx.objectStore('videos');
                                    await store.clear();
                                    setVideoFiles([]);
                                    setSlotVideos([null, null]);
                                    setShowPlaylist(false);
                                }
                            }}
                            className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2 border border-white/5"
                        >
                            <Trash2 size={16} />
                            清空本地資料
                        </button>
                        <button
                            onClick={() => fileInputRef.current.click()}
                            className="w-full py-4 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/10"
                        >
                            <Upload size={18} />
                            添加新影片
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                input[type="range"] { -webkit-appearance: none; }
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 14px;
                    height: 14px;
                    background: white;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    );
};

export default App;
