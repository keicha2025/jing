// ============================================
// NightWhisper — Recorder Module
// MediaRecorder 分段錄音 + 崩潰保護
// ============================================

class NightWhisperRecorder {
    constructor(storage) {
        this.storage = storage;
        this.audioContext = null;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.analyserNode = null;
        this.sourceNode = null;

        this.sessionId = null;
        this.segmentIndex = 0;
        this.currentChunks = [];
        this.isRecording = false;
        this.isPaused = false;

        // 每 5 分鐘分段
        this.SEGMENT_DURATION = 5 * 60 * 1000;
        this.segmentTimer = null;

        // 回呼
        this.onStatusChange = null;
        this.onError = null;
    }

    /**
     * 取得麥克風權限並初始化 AudioContext
     */
    async init() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100,
                },
            });

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 44100,
            });

            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

            // 建立 AnalyserNode 供 analyzer.js 使用
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 2048;
            this.analyserNode.smoothingTimeConstant = 0.8;
            this.sourceNode.connect(this.analyserNode);

            return true;
        } catch (err) {
            console.error('[Recorder] Init failed:', err);
            if (this.onError) this.onError('mic_denied', err.message);
            return false;
        }
    }

    /**
     * 開始錄音
     */
    async start(sessionId) {
        if (!this.mediaStream) {
            const ok = await this.init();
            if (!ok) return false;
        }

        // Resume AudioContext (required after user gesture)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.sessionId = sessionId;
        this.segmentIndex = 0;
        this.isRecording = true;
        this.isPaused = false;

        this._startSegment();
        this._notifyStatus('recording');

        return true;
    }

    /**
     * 停止錄音
     */
    async stop() {
        this.isRecording = false;

        if (this.segmentTimer) {
            clearTimeout(this.segmentTimer);
            this.segmentTimer = null;
        }

        // 停止當前錄音段
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            return new Promise((resolve) => {
                this.mediaRecorder.onstop = async () => {
                    await this._saveCurrentSegment();
                    this._cleanup();
                    this._notifyStatus('stopped');
                    resolve();
                };
                this.mediaRecorder.stop();
            });
        }

        this._cleanup();
        this._notifyStatus('stopped');
    }

    /**
     * 暫停錄音
     */
    pause() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            this.isPaused = true;
            this._notifyStatus('paused');
        }
    }

    /**
     * 恢復錄音
     */
    resume() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
            this.isPaused = false;
            this._notifyStatus('recording');
        }
    }

    /**
     * 取得 AnalyserNode (供 analyzer.js 使用)
     */
    getAnalyserNode() {
        return this.analyserNode;
    }

    /**
     * 取得 AudioContext (供 analyzer.js 使用)
     */
    getAudioContext() {
        return this.audioContext;
    }

    // ── 私有方法 ──

    _startSegment() {
        if (!this.isRecording) return;

        this.currentChunks = [];

        // 使用 webm/opus 格式（瀏覽器支援度最高）
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';

        this.mediaRecorder = new MediaRecorder(this.mediaStream, {
            mimeType,
            audioBitsPerSecond: 64000,
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.currentChunks.push(event.data);
            }
        };

        this.mediaRecorder.onerror = (event) => {
            console.error('[Recorder] Error:', event.error);
            if (this.onError) this.onError('recording_error', event.error?.message);
        };

        // 每 10 秒產出一次 chunk（更頻繁的防崩潰儲存）
        this.mediaRecorder.start(10000);

        // 設定分段計時器
        this.segmentTimer = setTimeout(() => {
            this._rotateSegment();
        }, this.SEGMENT_DURATION);
    }

    async _rotateSegment() {
        if (!this.isRecording) return;

        // 停止當前段
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = async () => {
                await this._saveCurrentSegment();
                this.segmentIndex++;
                // 開始新的段
                this._startSegment();
                resolve();
            };
            this.mediaRecorder.stop();
        });
    }

    async _saveCurrentSegment() {
        if (this.currentChunks.length === 0) return;

        const blob = new Blob(this.currentChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm',
        });

        try {
            await this.storage.saveRecording({
                sessionId: this.sessionId,
                segmentIndex: this.segmentIndex,
                blob: blob,
                mimeType: blob.type,
                size: blob.size,
                duration: this.SEGMENT_DURATION,
            });
            console.log(`[Recorder] Segment ${this.segmentIndex} saved (${(blob.size / 1024).toFixed(1)} KB)`);
        } catch (err) {
            console.error('[Recorder] Failed to save segment:', err);
            if (this.onError) this.onError('save_failed', err.message);
        }

        this.currentChunks = [];
    }

    _cleanup() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((t) => t.stop());
            this.mediaStream = null;
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.analyserNode = null;
        this.sourceNode = null;
        this.mediaRecorder = null;
    }

    _notifyStatus(status) {
        if (this.onStatusChange) this.onStatusChange(status);
    }
}

window.NightWhisperRecorder = NightWhisperRecorder;
