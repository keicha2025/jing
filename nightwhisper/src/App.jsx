import React, { useState, useEffect } from 'react'
import { Upload, Activity, History as HistoryIcon, Settings, Calendar, ChevronRight, Play, Trash2, Download, Mic, Clock, MoreHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { useHistory } from './hooks/useHistory'
import { useAIAnalysis } from './hooks/useAIAnalysis'
import Waveform from './components/Waveform'
import LiveWaveform from './components/LiveWaveform'
import { analyzeAudioStream } from './utils/stream-decoder'
import { aiEngine } from './utils/ai-engine'

function App() {
  const [activeTab, setActiveTab] = useState('record')
  const [aiEnabled, setAiEnabled] = useState(true)
  const { isRecording, recordingTime, analyser, sessionId, startRecording, stopRecording } = useAudioRecorder()
  const { sessions, loading, refreshSessions, downloadSession, getSessionUrl, getSessionEvents, removeSession } = useHistory()
  const { lastEvent, isModelReady, startMonitoring, stopMonitoring, analyzeBatch } = useAIAnalysis(aiEnabled)
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionUrl, setSessionUrl] = useState(null)
  const [sessionEvents, setSessionEvents] = useState([])
  const [jumpTime, setJumpTime] = useState(null)
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setIsAnalyzingFile(true)
      setAnalysisProgress(0)

      // 1. WebCodecs Stream Analysis (Lower Memory)
      console.log('NightWhisper: Starting WebCodecs Stream Analysis...')
      
      const events = await analyzeAudioStream(
        file, 
        aiEngine, 
        (p) => setAnalysisProgress(p)
      )

      console.log(`NightWhisper: Stream analysis complete. Detected ${events.length} events.`)

      // 3. Save to Storage (only save the file once)
      const mockId = `import-${Date.now()}`
      const { saveAudioChunk, saveAIEvent } = await import('./utils/storage')

      await saveAudioChunk({ sessionId: mockId, blob: file, timestamp: Date.now() })

      for (const event of events) {
        await saveAIEvent({
          ...event,
          sessionId: mockId,
          timestamp: Date.now() + event.timestamp
        })
      }

      refreshSessions()
      alert(`分析完成！偵測到 ${events.length} 個事件。`)
      setActiveTab('history')
    } catch (err) {
      console.error('File analysis failed:', err)
      alert(`音檔分析失敗: ${err.message || '記憶體不足或格式錯誤'}`)
    } finally {
      setIsAnalyzingFile(false)
      setAnalysisProgress(0)
    }
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header style={{ padding: '24px', paddingTop: '48px' }}>
        <h1 className="title-gradient" style={{ fontSize: '28px', fontWeight: 700 }}>NightWhisper</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>本地端 AI 隱私監測</p>
      </header>

      {/* Main Content */}
      <main style={{ padding: '0 24px 120px 24px' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'record' && (
            <motion.div
              key="record"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px', marginTop: '40px' }}
            >
              <div className="glass-panel" style={{ width: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={20} color="var(--primary)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>延遲啟動</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>30 分鐘後開始錄製</p>
                    </div>
                  </div>
                  <MoreHorizontal size={20} color="var(--text-dim)" />
                </div>

                <div style={{ height: '1px', background: 'var(--border)' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Activity size={20} color="var(--primary)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>自動辨識</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        {aiEnabled ? (isModelReady ? '本地 AI 已就緒' : '模型載入中...') : '已關閉'}
                      </p>
                    </div>
                  </div>
                  <div
                    onClick={() => setAiEnabled(!aiEnabled)}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: aiEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                      position: 'relative', cursor: 'pointer', transition: '0.3s'
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '10px', background: 'white',
                      position: 'absolute', right: aiEnabled ? '2px' : '22px', top: '2px', transition: '0.3s'
                    }}></div>
                  </div>
                </div>
              </div>

              {isRecording && lastEvent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(99, 102, 241, 0.9)', padding: '8px 20px', borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 10, backdropFilter: 'blur(10px)'
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>偵測到：{lastEvent.type}</p>
                </motion.div>
              )}

              {isRecording && (
                <div style={{ marginBottom: '30px', padding: '0 10px' }}>
                  <LiveWaveform analyser={analyser} />
                </div>
              )}

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <div
                  className={`record-btn-outer ${isRecording ? 'recording' : ''}`}
                  onClick={async () => {
                    if (isRecording) {
                      stopRecording()
                      stopMonitoring()
                    } else {
                      const id = await startRecording()
                      if (aiEnabled && id) startMonitoring(id)
                    }
                  }}
                >
                  <div className="record-btn-inner"></div>
                </div>
                <p style={{ marginTop: '16px', fontWeight: 500, color: isRecording ? '#ef4444' : 'white' }}>
                  {isRecording ? `正在監測中... ${formatTime(recordingTime)}` : '開始睡眠監測'}
                </p>
              </div>

              {/* Import Section */}
              <div
                className="glass-panel"
                style={{
                  width: '100%',
                  padding: '24px',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  background: isAnalyzingFile ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                }}
              >
                {isAnalyzingFile ? (
                  <>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>
                      {analysisProgress === 0 ? '正在啟動串流解碼器 (這可能需要幾秒)...' : `串流分析中... ${analysisProgress}%`}
                    </p>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: analysisProgress === 0 ? '20%' : `${analysisProgress}%`,
                          height: '100%',
                          background: 'var(--primary)',
                          borderRadius: '2px',
                          transition: '0.3s',
                          animation: analysisProgress === 0 ? 'loading-pulse 1.5s infinite linear' : 'none'
                        }}
                      ></div>
                    </div>
                    {analysisProgress === 0 && (
                      <p style={{ fontSize: '11px', opacity: 0.5 }}>提示：9 小時的音稿解碼極度消耗記憶體，請保持此分頁在前台...</p>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', opacity: 0.6 }}>
                      <Upload size={16} />
                      <p style={{ fontSize: '13px' }}>匯入外部音檔進行智慧分析</p>
                    </div>
                    <input
                      type="file"
                      accept="audio/*"
                      id="audio-upload"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <button
                      className="btn-primary"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', padding: '8px 20px' }}
                      onClick={() => document.getElementById('audio-upload').click()}
                    >
                      選擇音檔 (MP3/WAV/M4A)
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div
              key="report-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              {!selectedSession ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Activity size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <p style={{ color: 'var(--text-dim)' }}>請從「歷史」中選擇錄製紀錄以查看分析，或點擊下方按鈕預覽最新紀錄。</p>
                  <button
                    className="btn-primary"
                    style={{ marginTop: '20px' }}
                    onClick={async () => {
                      if (sessions.length > 0) {
                        const latest = sessions[0];
                        const url = await getSessionUrl(latest.sessionId);
                        const events = await getSessionEvents(latest.sessionId);
                        setSessionUrl(url);
                        setSessionEvents(events);
                        setSelectedSession(latest);
                      } else {
                        alert('尚無歷史紀錄');
                      }
                    }}
                  >
                    查看最新錄製
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600 }}>分析報告</h2>
                    <button
                      style={{ fontSize: '12px', color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedSession(null)
                        setSessionEvents([])
                        if (sessionUrl) {
                          URL.revokeObjectURL(sessionUrl)
                          setSessionUrl(null)
                        }
                      }}
                    >
                      重新選擇
                    </button>
                  </div>

                  {sessionUrl && (
                    <div style={{ width: '100%' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', paddingLeft: '4px' }}>全時段波形回覽 (點擊時間線可跳轉)</p>
                      <Waveform audioUrl={sessionUrl} height={80} jumpToTime={jumpTime} />
                    </div>
                  )}

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>智慧辨識時間線</p>
                      <span style={{ fontSize: '12px', color: 'var(--primary)' }}>{sessionEvents.length} 個事件</span>
                    </div>

                    {sessionEvents.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>未偵測到顯著聲音事件</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                        {sessionEvents.map((event, i) => {
                          const offsetSeconds = (event.timestamp - parseInt(selectedSession.timestamp)) / 1000;
                          return (
                            <div
                              key={i}
                              onClick={() => setJumpTime(offsetSeconds)}
                              style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}
                            >
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginTop: '6px' }}></div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{event.type}</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                    +{Math.round(offsetSeconds)}s | {new Date(event.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>
                                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '4px' }}>
                                  <div style={{ width: `${event.confidence * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px', opacity: 0.6 }}></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>監測時段</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
                      {new Date(parseInt(selectedSession.timestamp)).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>總片段數</p>
                        <p style={{ fontSize: '20px', fontWeight: 600 }}>{selectedSession.chunksCount}</p>
                      </div>
                      <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>數據大小</p>
                        <p style={{ fontSize: '20px', fontWeight: 600 }}>{(selectedSession.totalSize / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '16px' }}
                    onClick={() => downloadSession(selectedSession)}
                  >
                    匯出完整音訊檔 (.webm)
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && !selectedSession && (
            <motion.div
              key="history-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>錄製歷史</h2>
              {loading ? (
                <p style={{ textAlign: 'center', opacity: 0.5 }}>讀取中...</p>
              ) : sessions.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                  <HistoryIcon size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
                  <p style={{ opacity: 0.5, marginBottom: '20px' }}>尚無睡眠監測記錄</p>
                  <button
                    className="btn-primary"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}
                    onClick={async () => {
                      // Create mock data for testing
                      const mockId = Date.now().toString();
                      const { saveAudioChunk, saveAIEvent } = await import('./utils/storage');

                      // 1. Mock Audio Chunk (empty silence blob is hard, we just save a small blob)
                      const blob = new Blob([new Uint8Array(1000)], { type: 'audio/webm' });
                      await saveAudioChunk({ sessionId: mockId, blob, timestamp: Date.now() });

                      // 2. Mock AI Events
                      await saveAIEvent({ sessionId: mockId, type: 'Snore (打呼)', confidence: 0.85, timestamp: Date.now() + 5000 });
                      await saveAIEvent({ sessionId: mockId, type: 'Talk (夢話)', confidence: 0.92, timestamp: Date.now() + 15000 });

                      refreshSessions();
                      alert('測試數據已建立，請點擊生成的歷史紀錄進入報告。');
                    }}
                  >
                    建立測試數據 (UI 驗證用)
                  </button>
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.sessionId} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div
                      onClick={async () => {
                        const url = await getSessionUrl(session.sessionId)
                        const events = await getSessionEvents(session.sessionId)
                        setSessionUrl(url)
                        setSessionEvents(events)
                        setSelectedSession(session)
                      }}
                      style={{ cursor: 'pointer', flex: 1 }}
                    >
                      <p style={{ fontWeight: 600 }}>{new Date(parseInt(session.timestamp)).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        {(session.totalSize / 1024 / 1024).toFixed(1)} MB | {session.chunksCount} 個監測片段
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div
                        style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}
                        onClick={() => removeSession(session.sessionId)}
                      >
                        <Trash2 size={18} style={{ color: '#ef4444' }} />
                      </div>
                      <div
                        style={{ padding: '8px', borderRadius: '8px', background: 'var(--primary-glow)', cursor: 'pointer' }}
                        onClick={() => downloadSession(session)}
                      >
                        <Download size={18} color="var(--primary)" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'history' && selectedSession && (
            <motion.div
              key="session-report"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  onClick={() => {
                    setSelectedSession(null)
                    setSessionEvents([])
                    setJumpTime(null)
                    if (sessionUrl) {
                      URL.revokeObjectURL(sessionUrl)
                      setSessionUrl(null)
                    }
                  }}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <MoreHorizontal size={18} style={{ transform: 'rotate(180deg)' }} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>分析報告</h2>
              </div>

              {sessionUrl && (
                <div style={{ width: '100%' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', paddingLeft: '4px' }}>全時段波形回覽 (點擊時間線可跳轉)</p>
                  <Waveform audioUrl={sessionUrl} height={80} jumpToTime={jumpTime} />
                </div>
              )}

              {/* Event Timeline */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>智慧辨識時間線</p>
                  <span style={{ fontSize: '12px', color: 'var(--primary)' }}>{sessionEvents.length} 個事件</span>
                </div>

                {sessionEvents.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>未偵測到顯著聲音事件</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                    {sessionEvents.map((event, i) => {
                      const offsetSeconds = (event.timestamp - parseInt(selectedSession.timestamp)) / 1000;
                      return (
                        <div
                          key={i}
                          onClick={() => setJumpTime(offsetSeconds)}
                          style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}
                        >
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginTop: '6px' }}></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '13px', fontWeight: 500 }}>{event.type}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                +{Math.round(offsetSeconds)}s | {new Date(event.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '4px' }}>
                              <div style={{ width: `${event.confidence * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px', opacity: 0.6 }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>監測時段</p>
                <p style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
                  {new Date(parseInt(selectedSession.timestamp)).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>總片段數</p>
                    <p style={{ fontSize: '20px', fontWeight: 600 }}>{selectedSession.chunksCount}</p>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>數據大小</p>
                    <p style={{ fontSize: '20px', fontWeight: 600 }}>{(selectedSession.totalSize / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontWeight: 600, fontSize: '14px', paddingLeft: '4px' }}>監測節點</p>
                {/* Simplified segments view */}
                {[...Array(Math.min(selectedSession.chunksCount, 5))].map((_, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                    <span>節點 #{idx + 1}</span>
                    <span style={{ color: 'var(--text-dim)' }}>已加密儲存</span>
                  </div>
                ))}
                {selectedSession.chunksCount > 5 && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
                    及其他 {selectedSession.chunksCount - 5} 個片段...
                  </p>
                )}
              </div>

              <button
                className="btn-primary"
                style={{ width: '100%', padding: '16px' }}
                onClick={() => downloadSession(selectedSession)}
              >
                匯出完整音訊檔 (.webm)
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="nav-bar glass-panel">
        <a
          className={`nav-item ${activeTab === 'record' ? 'active' : ''}`}
          onClick={() => setActiveTab('record')}
        >
          <Mic size={activeTab === 'record' ? 24 : 20} />
          <span>監測</span>
        </a>
        <a
          className={`nav-item ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          <Activity size={activeTab === 'report' ? 24 : 20} />
          <span>分析報告</span>
        </a>
        <a
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history')
            refreshSessions()
          }}
        >
          <HistoryIcon size={activeTab === 'history' ? 24 : 20} />
          <span>歷史</span>
        </a>
        <a
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={activeTab === 'settings' ? 24 : 20} />
          <span>設定</span>
        </a>
      </nav>
    </div>
  )
}

export default App
