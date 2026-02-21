// ============================================
// NightWhisper — Analyzer Module
// FFT 頻率偵測 + 底噪過濾 + 事件判定
// ============================================

class NightWhisperAnalyzer {
    constructor(storage) {
        this.storage = storage;
        this.analyserNode = null;
        this.sampleRate = 44100;
        this.fftSize = 2048;

        this.sessionId = null;
        this.isAnalyzing = false;
        this.analysisTimer = null;

        // 頻率區段定義
        this.FREQ_BANDS = {
            snore: { min: 80, max: 500 },     // 打呼：低頻
            talk: { min: 500, max: 3500 },    // 夢話：語音頻段
            noise: { min: 50, max: 4000 },     // 底噪範圍
        };

        // 閾值設定
        this.THRESHOLDS = {
            snoreDb: -45,          // 打呼偵測閾值 (dB)
            talkDb: -40,           // 夢話偵測閾值 (dB)
            minDuration: 2,        // 最短事件持續時間 (秒)
            noiseVariance: 5,      // 底噪方差容忍度 (dB)
        };

        // 底噪基線
        this.noiseBaseline = null;
        this.noiseCalibrationSamples = [];
        this.isCalibrating = false;
        this.CALIBRATION_DURATION = 10; // 秒

        // 當前事件追蹤
        this._currentEvent = null;
        this._eventStartTime = 0;
        this._consecutiveCount = 0;

        // 分析資料緩衝（批次寫入）
        this._analysisBatch = [];
        this._batchFlushInterval = null;

        // 回呼
        this.onEvent = null;
        this.onCalibrationComplete = null;
        this.onLevelUpdate = null;
    }

    /**
     * 開始分析
     */
    start(analyserNode, audioContext, sessionId) {
        this.analyserNode = analyserNode;
        this.sampleRate = audioContext.sampleRate;
        this.fftSize = analyserNode.fftSize;
        this.sessionId = sessionId;
        this.isAnalyzing = true;

        this._currentEvent = null;
        this._consecutiveCount = 0;
        this._analysisBatch = [];

        // 先進行底噪校準
        this._startCalibration();
    }

    /**
     * 停止分析
     */
    stop() {
        this.isAnalyzing = false;

        if (this.analysisTimer) {
            clearInterval(this.analysisTimer);
            this.analysisTimer = null;
        }

        if (this._batchFlushInterval) {
            clearInterval(this._batchFlushInterval);
            this._batchFlushInterval = null;
        }

        // 結束追蹤中的事件
        this._finalizeCurrentEvent();

        // flush 剩餘資料
        this._flushBatch();
    }

    // ── 底噪校準 ──

    _startCalibration() {
        this.isCalibrating = true;
        this.noiseCalibrationSamples = [];

        let sampleCount = 0;
        const calibrationInterval = setInterval(() => {
            if (!this.isAnalyzing) {
                clearInterval(calibrationInterval);
                return;
            }

            const spectrum = this._getFrequencyData();
            this.noiseCalibrationSamples.push(spectrum);
            sampleCount++;

            if (sampleCount >= this.CALIBRATION_DURATION) {
                clearInterval(calibrationInterval);
                this._computeNoiseBaseline();
                this.isCalibrating = false;

                if (this.onCalibrationComplete) this.onCalibrationComplete();

                // 開始正式分析
                this._startAnalysisLoop();
            }
        }, 1000);
    }

    _computeNoiseBaseline() {
        if (this.noiseCalibrationSamples.length === 0) {
            this.noiseBaseline = null;
            return;
        }

        const len = this.noiseCalibrationSamples[0].length;
        const avgSpectrum = new Float32Array(len);
        const varSpectrum = new Float32Array(len);

        // 計算平均頻譜
        for (const sample of this.noiseCalibrationSamples) {
            for (let i = 0; i < len; i++) {
                avgSpectrum[i] += sample[i];
            }
        }
        for (let i = 0; i < len; i++) {
            avgSpectrum[i] /= this.noiseCalibrationSamples.length;
        }

        // 計算方差
        for (const sample of this.noiseCalibrationSamples) {
            for (let i = 0; i < len; i++) {
                varSpectrum[i] += (sample[i] - avgSpectrum[i]) ** 2;
            }
        }
        for (let i = 0; i < len; i++) {
            varSpectrum[i] = Math.sqrt(varSpectrum[i] / this.noiseCalibrationSamples.length);
        }

        this.noiseBaseline = { avg: avgSpectrum, std: varSpectrum };
        console.log('[Analyzer] Noise baseline calibrated');
    }

    // ── 分析迴圈 ──

    _startAnalysisLoop() {
        // 每秒分析一次
        this.analysisTimer = setInterval(() => {
            if (!this.isAnalyzing) return;
            this._analyze();
        }, 1000);

        // 每 30 秒 flush 一次分析資料到 IndexedDB
        this._batchFlushInterval = setInterval(() => {
            this._flushBatch();
        }, 30000);
    }

    _analyze() {
        const spectrum = this._getFrequencyData();
        const now = Date.now();

        // 扣除底噪
        const cleaned = this._subtractNoise(spectrum);

        // 計算各頻段能量
        const snoreEnergy = this._getBandEnergy(cleaned, this.FREQ_BANDS.snore);
        const talkEnergy = this._getBandEnergy(cleaned, this.FREQ_BANDS.talk);
        const overallDb = this._getOverallDb(spectrum);

        // 判定事件類型
        let eventType = null;

        // 判斷是否為持續性噪音（風扇/冷氣）
        const isStationaryNoise = this._isStationaryNoise(spectrum);

        if (!isStationaryNoise) {
            if (snoreEnergy > this.THRESHOLDS.snoreDb && snoreEnergy > talkEnergy) {
                eventType = 'snore';
            } else if (talkEnergy > this.THRESHOLDS.talkDb) {
                eventType = 'talk';
            }
        }

        // 事件追蹤
        if (eventType) {
            if (this._currentEvent === eventType) {
                this._consecutiveCount++;
            } else {
                // 結束前一事件
                this._finalizeCurrentEvent();
                // 開始新事件
                this._currentEvent = eventType;
                this._eventStartTime = now;
                this._consecutiveCount = 1;
                this._eventPeakDb = overallDb;
            }
            // 更新峰值
            if (overallDb > (this._eventPeakDb || -Infinity)) {
                this._eventPeakDb = overallDb;
            }
        } else {
            this._finalizeCurrentEvent();
        }

        // 即時音量回呼（用於 UI 即時反饋）
        if (this.onLevelUpdate) {
            this.onLevelUpdate({
                time: now,
                overallDb,
                snoreEnergy,
                talkEnergy,
                eventType,
                isCalibrating: this.isCalibrating,
            });
        }

        // 儲存分析資料（批次）
        this._analysisBatch.push({
            sessionId: this.sessionId,
            time: now,
            overallDb: Math.round(overallDb * 10) / 10,
            snoreEnergy: Math.round(snoreEnergy * 10) / 10,
            talkEnergy: Math.round(talkEnergy * 10) / 10,
            eventType,
        });
    }

    // ── 頻譜處理 ──

    _getFrequencyData() {
        const bufferLength = this.analyserNode.frequencyBinCount;
        const data = new Float32Array(bufferLength);
        this.analyserNode.getFloatFrequencyData(data);
        return data;
    }

    _subtractNoise(spectrum) {
        if (!this.noiseBaseline) return spectrum;

        const result = new Float32Array(spectrum.length);
        for (let i = 0; i < spectrum.length; i++) {
            // 只保留超過底噪 + 標準差 的部分
            const threshold = this.noiseBaseline.avg[i] + this.noiseBaseline.std[i] * 2;
            result[i] = spectrum[i] > threshold ? spectrum[i] - this.noiseBaseline.avg[i] : -100;
        }
        return result;
    }

    _getBandEnergy(spectrum, band) {
        const binSize = this.sampleRate / this.fftSize;
        const startBin = Math.floor(band.min / binSize);
        const endBin = Math.min(Math.ceil(band.max / binSize), spectrum.length - 1);

        let sum = 0;
        let count = 0;
        for (let i = startBin; i <= endBin; i++) {
            if (spectrum[i] > -100) {
                sum += spectrum[i];
                count++;
            }
        }

        return count > 0 ? sum / count : -100;
    }

    _getOverallDb(spectrum) {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < spectrum.length; i++) {
            if (spectrum[i] > -100) {
                sum += spectrum[i];
                count++;
            }
        }
        return count > 0 ? sum / count : -100;
    }

    _isStationaryNoise(spectrum) {
        // 持續性噪音的特徵：頻譜變化很小
        if (!this.noiseBaseline) return false;

        let deviationCount = 0;
        const binSize = this.sampleRate / this.fftSize;
        const startBin = Math.floor(this.FREQ_BANDS.noise.min / binSize);
        const endBin = Math.ceil(this.FREQ_BANDS.noise.max / binSize);

        for (let i = startBin; i < endBin && i < spectrum.length; i++) {
            const deviation = Math.abs(spectrum[i] - this.noiseBaseline.avg[i]);
            if (deviation > this.THRESHOLDS.noiseVariance) {
                deviationCount++;
            }
        }

        // 如果超過 80% 的 bin 都在底噪範圍內，判定為持續性噪音
        const totalBins = endBin - startBin;
        return deviationCount < totalBins * 0.2;
    }

    // ── 事件管理 ──

    _finalizeCurrentEvent() {
        if (!this._currentEvent) return;

        const duration = (Date.now() - this._eventStartTime) / 1000;

        // 只記錄持續超過閾值的事件
        if (duration >= this.THRESHOLDS.minDuration) {
            const event = {
                sessionId: this.sessionId,
                time: this._eventStartTime,
                type: this._currentEvent,
                dB: Math.round(this._eventPeakDb || 0),
                duration: Math.round(duration),
            };

            // 存入 IndexedDB
            this.storage.saveEvent(event).catch((err) => {
                console.error('[Analyzer] Failed to save event:', err);
            });

            // 回呼通知 UI
            if (this.onEvent) this.onEvent(event);

            console.log(`[Analyzer] Event: ${event.type} | ${event.dB}dB | ${event.duration}s`);
        }

        this._currentEvent = null;
        this._consecutiveCount = 0;
        this._eventPeakDb = -Infinity;
    }

    async _flushBatch() {
        if (this._analysisBatch.length === 0) return;

        const batch = [...this._analysisBatch];
        this._analysisBatch = [];

        try {
            await this.storage.saveAnalysisBatch(batch);
        } catch (err) {
            console.error('[Analyzer] Failed to flush analysis batch:', err);
            // 回放失敗的資料
            this._analysisBatch.unshift(...batch);
        }
    }
}

window.NightWhisperAnalyzer = NightWhisperAnalyzer;
