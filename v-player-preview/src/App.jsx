import React, { useState, useRef, useEffect } from 'react';
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
    Monitor
} from 'lucide-react';

const App = () => {
    const [videoFiles, setVideoFiles] = useState([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isDbLoading, setIsDbLoading] = useState(true);

    // Preview state
    const [hoverTime, setHoverTime] = useState(null);
    const [hoverPosition, setHoverPosition] = useState(0);

    const videoRef = useRef(null);
    const previewVideoRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    // IndexedDB Setup for Videos
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

    const deleteFileFromDB = async (id) => {
        const db = await openDB();
        const tx = db.transaction('videos', 'readwrite');
        const store = tx.objectStore('videos');
        await store.delete(id);
    };

    const clearAllFilesFromDB = async () => {
        const db = await openDB();
        const tx = db.transaction('videos', 'readwrite');
        const store = tx.objectStore('videos');
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
                    setVideoFiles(filesWithUrls);
                    setCurrentVideoIndex(0);
                }
            } catch (err) {
                console.error("Failed to load from DB", err);
            } finally {
                setIsDbLoading(false);
            }
        };
        init();
    }, []);

    // 處理控制項隱藏邏輯
    const handleMouseMove = () => {
        if (showPlaylist || showSettings) {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            return;
        }

        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                if (hoverTime === null) {
                    setShowControls(false);
                }
            }, 3000);
        }
    };

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
    }, [currentVideoIndex]);

    // Update playback rate when speed changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed, currentVideoIndex]);

    // Track FullScreen changes to react safely 
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(
                !!document.fullscreenElement ||
                !!document.webkitFullscreenElement
            );
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const handleFileUpload = async (e) => {
        const uploadedFiles = Array.from(e.target.files).filter(file =>
            file.type.startsWith('video/')
        );

        const newVideos = await Promise.all(uploadedFiles.map(async (file) => {
            const id = Math.random().toString(36).substr(2, 9);
            const name = file.name.replace(/\.[^/.]+$/, "");
            const fileObj = {
                id,
                name,
                blob: file, // Store actual File/Blob for caching
                type: file.type
            };
            await saveFileToDB(fileObj);
            return {
                ...fileObj,
                url: URL.createObjectURL(file)
            };
        }));

        setVideoFiles(prev => [...prev, ...newVideos]);
        if (currentVideoIndex === null && newVideos.length > 0) {
            setCurrentVideoIndex(0);
        }
    };

    const togglePlay = (e) => {
        if (e) e.stopPropagation();
        if (currentVideoIndex === null) return;

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

    const toggleFullscreen = (e) => {
        e.stopPropagation();
        const elem = containerRef.current;

        // For iOS Safari standard browser which uses webkitEnterFullscreen directly on VIDEO
        if (videoRef.current && videoRef.current.webkitEnterFullscreen && !elem.requestFullscreen && !elem.webkitRequestFullscreen) {
            videoRef.current.webkitEnterFullscreen();
            return;
        }

        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => console.error(err));
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
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

    const clearAllData = async () => {
        if (window.confirm("確定要清除所有快取的影片嗎？")) {
            await clearAllFilesFromDB();
            setVideoFiles([]);
            setCurrentVideoIndex(null);
            setIsPlaying(false);
            window.location.reload();
        }
    };

    const removeVideo = async (e, index) => {
        e.stopPropagation();
        const videoToRemove = videoFiles[index];
        await deleteFileFromDB(videoToRemove.id);

        const newFiles = videoFiles.filter((_, i) => i !== index);
        setVideoFiles(newFiles);
        if (index === currentVideoIndex) {
            setCurrentVideoIndex(null);
            setIsPlaying(false);
        } else if (index < currentVideoIndex) {
            setCurrentVideoIndex(currentVideoIndex - 1);
        }
    };

    const currentVideo = currentVideoIndex !== null ? videoFiles[currentVideoIndex] : null;

    if (isDbLoading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white"><div className="animate-pulse w-10 h-10 bg-indigo-600 rounded-full"></div></div>;
    }

    // Hover Preview Handlers
    const handleProgressMouseMove = (e) => {
        e.stopPropagation();
        if (!duration || !currentVideo) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = pos / rect.width;
        const time = percentage * duration;

        setHoverTime(time);

        // Calculate adjusted position for the popup to not overflow container bounds
        const popupWidth = 160;
        let popupLeft = pos;
        if (pos < popupWidth / 2) {
            popupLeft = popupWidth / 2;
        } else if (pos > rect.width - popupWidth / 2) {
            popupLeft = rect.width - popupWidth / 2;
        }

        setHoverPosition(popupLeft);

        if (previewVideoRef.current) {
            // Avoid seeking if the time difference is extremely small to reduce stutter
            if (isNaN(previewVideoRef.current.currentTime) || Math.abs(previewVideoRef.current.currentTime - time) > 0.5) {
                previewVideoRef.current.currentTime = time;
            }
        }

        handleMouseMove(); // Keep controls visible
    };

    const handleProgressMouseLeave = (e) => {
        e.stopPropagation();
        setHoverTime(null);
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative">
            <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-900 rounded-full blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-900 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <header className="relative z-20 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Monitor size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">V-Player</h1>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest">Premium Cinema</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={clearAllData}
                        className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl transition-all border border-white/10 text-neutral-400 hover:text-white flex items-center gap-2"
                        title="清除快取"
                    >
                        <Trash2 size={20} />
                    </button>
                    <button
                        onClick={() => setShowPlaylist(true)}
                        className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl transition-all border border-white/10"
                    >
                        <List size={20} />
                    </button>
                </div>
            </header>

            <main
                className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8"
                onMouseMove={handleMouseMove}
                onClick={handleMouseMove}
                onMouseLeave={() => isPlaying && !showSettings && hoverTime === null && setShowControls(false)}
            >
                <div
                    ref={containerRef}
                    className="relative w-full max-w-5xl md:aspect-video aspect-[9/16] bg-neutral-900 rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-white/10 fullscreen-container group"
                    style={isFullscreen ? { borderRadius: 0, maxWidth: 'none', height: '100vh', aspectRatio: 'auto' } : {}}
                >
                    {currentVideo ? (
                        <>
                            <video
                                ref={videoRef}
                                src={currentVideo.url}
                                className="w-full h-full object-contain"
                                onClick={togglePlay}
                                playsInline
                            />

                            <div
                                className={`absolute inset-0 bg-black/40 transition-opacity duration-500 flex flex-col justify-between ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                            >
                                <div className="p-6 bg-gradient-to-b from-black/80 to-transparent">
                                    <h2 className="text-xl font-semibold truncate pointer-events-auto">{currentVideo.name}</h2>
                                </div>

                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8 pointer-events-auto">
                                    <button onClick={(e) => { e.stopPropagation(); skip(-10); setShowSettings(false); }} className="p-4 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md transition-all active:scale-90">
                                        <RotateCcw size={28} />
                                    </button>
                                    <button
                                        onClick={togglePlay}
                                        className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-white/10"
                                    >
                                        {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); skip(10); setShowSettings(false); }} className="p-4 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md transition-all active:scale-90">
                                        <RotateCw size={28} />
                                    </button>
                                </div>

                                <div className="p-6 bg-gradient-to-t from-black/80 to-transparent space-y-4 relative w-full pointer-events-auto">

                                    {showSettings && (
                                        <div className="absolute bottom-[100%] right-6 mb-4 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[120px] animate-in slide-in-from-bottom-2 fade-in">
                                            <h3 className="text-xs font-bold text-neutral-400 mb-3 uppercase tracking-wider">播放速度</h3>
                                            <div className="flex flex-col gap-1">
                                                {speeds.map(speed => (
                                                    <button
                                                        key={speed}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPlaybackSpeed(speed);
                                                            setShowSettings(false);
                                                        }}
                                                        className={`text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all ${playbackSpeed === speed ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-neutral-300'}`}
                                                    >
                                                        {speed}x
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Enhanced Progress Bar with Hover Preview Container */}
                                    <div
                                        className="group relative flex items-center py-2"
                                        onMouseMove={handleProgressMouseMove}
                                        onMouseLeave={handleProgressMouseLeave}
                                    >
                                        {/* Hover Preview Box */}
                                        {hoverTime !== null && currentVideo && (
                                            <div
                                                className="absolute bottom-6 -translate-x-1/2 transition-opacity duration-200 pointer-events-none"
                                                style={{ left: `${hoverPosition}px` }}
                                            >
                                                <div className="relative w-[160px] aspect-video bg-neutral-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/20 mb-2">
                                                    <video
                                                        ref={previewVideoRef}
                                                        src={currentVideo.url} // Use the same local object URL
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        playsInline
                                                        preload="auto"
                                                    />
                                                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider z-10">
                                                        {formatTime(hoverTime)}
                                                    </div>
                                                </div>
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-white/20 w-0 h-0"></div>
                                            </div>
                                        )}

                                        <input
                                            type="range"
                                            min="0"
                                            max={duration || 0}
                                            value={currentTime}
                                            onChange={handleSeek}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-all group-hover:h-2.5 relative z-10"
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-6">
                                            <span className="text-sm font-mono text-neutral-300">
                                                {formatTime(currentTime)} <span className="text-neutral-600">/</span> {formatTime(duration)}
                                            </span>
                                            <div className="hidden md:flex items-center gap-3">
                                                <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="text-neutral-400 hover:text-white transition-colors">
                                                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                                </button>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.05"
                                                    value={isMuted ? 0 : volume}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        setVolume(val);
                                                        videoRef.current.volume = val;
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                                                className={`p-2 transition-colors rounded-xl ${showSettings ? 'bg-white/20 text-white' : 'text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                <Settings size={20} />
                                            </button>
                                            <button onClick={toggleFullscreen} className="p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors rounded-xl">
                                                <Maximize size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-black/20">
                            <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                                <Upload size={40} className="text-neutral-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">準備好開始觀影了嗎？</h3>
                            <p className="text-neutral-500 max-w-xs mb-8">選擇一個影片檔案即可開始。支援 MP4, WebM 等現代影片格式。影片將安全地保存在本地環境中。</p>
                            <button
                                onClick={() => fileInputRef.current.click()}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-3"
                            >
                                <Upload size={20} />
                                選取影片檔案
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="video/*"
                multiple
                className="hidden"
            />

            <div className={`fixed inset-0 z-50 transition-all duration-500 ${showPlaylist ? 'visible' : 'invisible'}`}>
                <div
                    className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500 ${showPlaylist ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setShowPlaylist(false)}
                />
                <div className={`absolute right-0 top-0 bottom-0 w-full max-w-sm bg-neutral-900 p-8 transition-transform duration-500 ease-out border-l border-white/5 flex flex-col ${showPlaylist ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-2xl font-bold">媒體庫</h2>
                            <p className="text-neutral-500 text-sm">共 {videoFiles.length} 部影片</p>
                        </div>
                        <button onClick={() => setShowPlaylist(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {videoFiles.map((video, index) => (
                            <div
                                key={video.id}
                                onClick={() => {
                                    setCurrentVideoIndex(index);
                                    setIsPlaying(true);
                                    setShowPlaylist(false);
                                }}
                                className={`group flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all ${index === currentVideoIndex ? 'bg-indigo-600 shadow-xl shadow-indigo-600/20' : 'bg-white/5 hover:bg-white/10'}`}
                            >
                                <div className="w-16 h-12 bg-black/40 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                                    <Play size={14} fill="currentColor" className={index === currentVideoIndex ? 'text-white' : 'text-neutral-600'} />
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <p className={`font-semibold text-sm truncate ${index === currentVideoIndex ? 'text-white' : 'text-neutral-200'}`}>
                                        {video.name}
                                    </p>
                                    <p className={`text-[10px] mt-1 ${index === currentVideoIndex ? 'text-indigo-200' : 'text-neutral-500'}`}>
                                        LOCAL • {video.type.split('/')[1]?.toUpperCase() || 'VIDEO'}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => removeVideo(e, index)}
                                    className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${index === currentVideoIndex ? 'text-indigo-200 hover:text-white hover:bg-indigo-500' : 'text-neutral-500 hover:text-red-400 hover:bg-white/10'}`}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => fileInputRef.current.click()}
                        className="mt-8 w-full py-5 bg-white text-black font-black rounded-3xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5"
                    >
                        <Upload size={20} />
                        添加新影片
                    </button>
                </div>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        input[type="range"] {
          -webkit-appearance: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        .fullscreen-container:-webkit-full-screen {
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          border-radius: 0 !important;
        }
        .fullscreen-container:fullscreen {
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          border-radius: 0 !important;
        }
      `}</style>
        </div>
    );
};

export default App;
