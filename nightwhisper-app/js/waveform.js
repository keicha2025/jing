// ============================================
// NightWhisper — Waveform Module
// Canvas 波形熱點圖（頻率著色 + 互動）
// ============================================

class NightWhisperWaveform {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.events = [];

        // 播放相關
        this.sessionStartTime = 0;
        this.sessionEndTime = 0;
        this.playheadPosition = 0; // 0-1
        this.playheadElement = null;

        // 色彩 (引用 CSS variables)
        this.colors = {
            silent: '#4338CA',
            snore: '#EF4444',
            talk: '#EAB308',
            bg: '#1E1E2A',
        };

        // 互動
        this.onClick = null; // callback(timeMs)

        this._bindEvents();
    }

    /**
     * 載入分析資料並繪製
     */
    render(analysisData, events, startTime, endTime) {
        this.data = analysisData;
        this.events = events;
        this.sessionStartTime = startTime;
        this.sessionEndTime = endTime;

        this._draw();
    }

    /**
     * 更新播放進度線位置
     */
    setPlayheadPosition(ratio) {
        this.playheadPosition = Math.max(0, Math.min(1, ratio));
        if (this.playheadElement) {
            this.playheadElement.style.left = `${this.playheadPosition * 100}%`;
        }
    }

    /**
     * 設定播放進度線 DOM 元素
     */
    setPlayheadElement(el) {
        this.playheadElement = el;
    }

    /**
     * 重繪
     */
    resize() {
        if (this.data.length > 0) {
            this._draw();
        }
    }

    // ── 繪製 ──

    _draw() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const centerY = height / 2;

        this.ctx.clearRect(0, 0, width, height);

        if (this.data.length === 0) {
            this._drawPlaceholder(width, height, centerY);
            return;
        }

        // 將分析資料降採樣到適合繪製的點數
        const maxBars = Math.floor(width / 4); // 每根柱寬 ~3px + 1px gap
        const sampled = this._downsample(this.data, maxBars);

        const barWidth = (width / sampled.length) * 0.65;
        const gap = (width / sampled.length) * 0.35;

        for (let i = 0; i < sampled.length; i++) {
            const point = sampled[i];

            // 振幅映射
            const normalizedDb = Math.max(0, (point.overallDb + 80) / 60); // -80 ~ -20 → 0 ~ 1
            const amplitude = normalizedDb * (height * 0.85) + 2;

            // 色彩選擇
            let color = this.colors.silent;
            if (point.eventType === 'snore') {
                color = this.colors.snore;
            } else if (point.eventType === 'talk') {
                color = this.colors.talk;
            }

            this.ctx.fillStyle = color;

            const x = i * (barWidth + gap);
            const y = centerY - amplitude / 2;

            // 圓角矩形
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, barWidth, amplitude, barWidth / 2);
            this.ctx.fill();
        }
    }

    _drawPlaceholder(width, height, centerY) {
        // 模擬示範波形
        const dataPoints = 120;
        const barWidth = (width / dataPoints) * 0.6;
        const gap = (width / dataPoints) * 0.4;

        for (let i = 0; i < dataPoints; i++) {
            let amplitude = Math.random() * (height * 0.2) + 2;
            let color = this.colors.silent;

            // 造出模擬事件
            if (i > 20 && i < 25) {
                color = this.colors.talk;
                amplitude = height * 0.4 + Math.random() * 20;
            }
            if (i > 40 && i < 60) {
                color = this.colors.snore;
                amplitude = height * 0.6 + Math.random() * 30;
            }
            if (i > 65 && i < 75) {
                color = this.colors.snore;
                amplitude = height * 0.8 + Math.random() * 20;
            }
            if (i > 90 && i < 93) {
                color = this.colors.talk;
                amplitude = height * 0.5 + Math.random() * 15;
            }

            this.ctx.fillStyle = color;
            const x = i * (barWidth + gap);
            const y = centerY - amplitude / 2;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, barWidth, amplitude, barWidth / 2);
            this.ctx.fill();
        }
    }

    _downsample(data, targetLength) {
        if (data.length <= targetLength) return data;

        const step = data.length / targetLength;
        const result = [];

        for (let i = 0; i < targetLength; i++) {
            const startIdx = Math.floor(i * step);
            const endIdx = Math.floor((i + 1) * step);
            const chunk = data.slice(startIdx, endIdx);

            // 取該區間的特徵
            let maxDb = -100;
            let eventType = null;
            let snoreCount = 0;
            let talkCount = 0;

            for (const point of chunk) {
                if (point.overallDb > maxDb) maxDb = point.overallDb;
                if (point.eventType === 'snore') snoreCount++;
                if (point.eventType === 'talk') talkCount++;
            }

            if (snoreCount > talkCount && snoreCount > chunk.length * 0.3) {
                eventType = 'snore';
            } else if (talkCount > 0 && talkCount > chunk.length * 0.3) {
                eventType = 'talk';
            }

            result.push({
                overallDb: maxDb,
                eventType,
                time: chunk[0]?.time || 0,
            });
        }

        return result;
    }

    // ── 互動 ──

    _bindEvents() {
        this.canvas.addEventListener('click', (e) => {
            if (!this.onClick) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = x / rect.width;
            const timeMs = this.sessionStartTime +
                ratio * (this.sessionEndTime - this.sessionStartTime);
            this.onClick(timeMs);
        });

        // 視窗大小改變時重繪
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.resize(), 200);
        });
    }
}

window.NightWhisperWaveform = NightWhisperWaveform;
