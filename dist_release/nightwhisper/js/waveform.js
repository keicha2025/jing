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
        this.playheadPosition = 0; // 0-1 (相對於整個 session)
        this.playheadElement = null;

        // 縮放與平移狀態
        this.zoomLevel = 1;        // 1x = 全覽, 480x = ~1分鐘 (假設 8小時紀錄)
        this.maxZoom = 480;
        this.scrollOffset = 0;     // 0 (左) ~ 1 (右) (相對於可滾動範圍)

        // 觸控手勢紀錄
        this._touchState = {
            isDragging: false,
            lastX: 0,
            lastDist: 0,
            isPinching: false
        };

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

        // 重置縮放
        this.zoomLevel = 1;
        this.scrollOffset = 0;

        this._draw();
    }

    /**
     * 更新播放進度線位置
     */
    setPlayheadPosition(totalRatio) {
        this.playheadPosition = Math.max(0, Math.min(1, totalRatio));
        this._updatePlayheadUI();
    }

    _updatePlayheadUI() {
        if (!this.playheadElement) return;

        // 計算目前可見範圍
        const viewWidthRatio = 1 / this.zoomLevel;
        const viewStartRatio = this.scrollOffset * (1 - viewWidthRatio);
        const viewEndRatio = viewStartRatio + viewWidthRatio;

        // 如果播放頭在可見範圍內，則顯示並定位
        if (this.playheadPosition >= viewStartRatio && this.playheadPosition <= viewEndRatio) {
            const localRatio = (this.playheadPosition - viewStartRatio) / viewWidthRatio;
            this.playheadElement.style.display = 'block';
            this.playheadElement.style.left = `${localRatio * 100}%`;
        } else {
            // 不在可見範圍內就隱藏（或者您可以選擇自動跟蹤滾動）
            this.playheadElement.style.display = 'none';
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

    // ── 繪製控制 ──

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

        // 1. 計算當前視窗的時間範圍
        const totalDuration = this.sessionEndTime - this.sessionStartTime;
        const viewDuration = totalDuration / this.zoomLevel;
        const viewStartMs = this.sessionStartTime + this.scrollOffset * (totalDuration - viewDuration);
        const viewEndMs = viewStartMs + viewDuration;

        // 2. 篩選可見數據
        const visibleData = this.data.filter(d => d.time >= viewStartMs && d.time <= viewEndMs);

        // 3. 降採樣 (根據寬度動態決定)
        const maxBars = Math.floor(width / 3.5);
        const sampled = this._downsample(visibleData, maxBars);

        const barWidth = Math.max(1.5, (width / sampled.length) * 0.7);
        const gap = (width / sampled.length) * 0.3;

        for (let i = 0; i < sampled.length; i++) {
            const point = sampled[i];

            // 振幅映射
            const normalizedDb = Math.max(0, (point.overallDb + 80) / 60);
            const amplitude = normalizedDb * (height * 0.85) + 2;

            let color = this.colors.silent;
            if (point.eventType === 'snore') {
                color = this.colors.snore;
            } else if (point.eventType === 'talk') {
                color = this.colors.talk;
            }

            this.ctx.fillStyle = color;
            const x = i * (barWidth + gap);
            const y = centerY - amplitude / 2;

            this.ctx.beginPath();
            this.ctx.roundRect(x, y, barWidth, amplitude, barWidth / 2);
            this.ctx.fill();
        }

        this._updatePlayheadUI();
    }

    _drawPlaceholder(width, height, centerY) {
        // (保持原樣或略微更新)
        this.ctx.fillStyle = '#ffffff10';
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('載入分析數據中...', width / 2, centerY + 4);
    }

    _downsample(data, targetLength) {
        if (data.length <= targetLength) return data;
        const step = data.length / targetLength;
        const result = [];
        for (let i = 0; i < targetLength; i++) {
            const startIdx = Math.floor(i * step);
            const endIdx = Math.floor((i + 1) * step);
            const chunk = data.slice(startIdx, endIdx);
            let maxDb = -100;
            let eventType = null;
            let snoreCount = 0;
            let talkCount = 0;
            for (const point of chunk) {
                if (point.overallDb > maxDb) maxDb = point.overallDb;
                if (point.eventType === 'snore') snoreCount++;
                if (point.eventType === 'talk') talkCount++;
            }
            if (snoreCount > talkCount && snoreCount > chunk.length * 0.3) eventType = 'snore';
            else if (talkCount > 0 && talkCount > chunk.length * 0.3) eventType = 'talk';
            result.push({ overallDb: maxDb, eventType, time: chunk[0]?.time || 0 });
        }
        return result;
    }

    // ── 互動 ──

    _bindEvents() {
        // 點擊事件 (Seeking + Double Tap Reset)
        this._lastTapTime = 0;
        this.canvas.addEventListener('click', (e) => {
            const now = Date.now();
            if (now - this._lastTapTime < 300) {
                // Double tap detected
                this.zoomLevel = 1;
                this.scrollOffset = 0;
                this._draw();
                return;
            }
            this._lastTapTime = now;

            if (this._touchState.isDragging || this._touchState.isPinching) return;
            this._handleInteraction(e.clientX);
        });

        // 觸控手勢
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this._touchState.isDragging = true;
                this._touchState.lastX = e.touches[0].clientX;
            } else if (e.touches.length === 2) {
                this._touchState.isPinching = true;
                this._touchState.lastDist = this._getDist(e.touches);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this._touchState.isPinching && e.touches.length === 2) {
                e.preventDefault();
                const dist = this._getDist(e.touches);
                const factor = dist / this._touchState.lastDist;
                this._applyZoom(factor);
                this._touchState.lastDist = dist;
            } else if (this._touchState.isDragging && e.touches.length === 1) {
                e.preventDefault();
                const deltaX = e.touches[0].clientX - this._touchState.lastX;
                this._applyScroll(deltaX);
                this._touchState.lastX = e.touches[0].clientX;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            // 延遲重置拖拽狀態避開 click 誤觸
            setTimeout(() => {
                this._touchState.isDragging = false;
                this._touchState.isPinching = false;
            }, 50);
        });

        // 滑鼠滾輪縮放 (Optionl)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            this._applyZoom(factor);
        }, { passive: false });

        window.addEventListener('resize', () => this.resize());
    }

    _getDist(touches) {
        return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    }

    _applyZoom(factor) {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.max(1, Math.min(this.maxZoom, this.zoomLevel * factor));

        // 縮放後盡量保持 scrollOffset 穩定，或者維持中心點（這裡採簡單重繪）
        if (oldZoom !== this.zoomLevel) {
            this._draw();
        }
    }

    _applyScroll(deltaX) {
        if (this.zoomLevel <= 1) return;
        const rect = this.canvas.getBoundingClientRect();
        const moveRatio = deltaX / rect.width;
        // 修正捲動權重：手指移動一寬度，視圖移動一視窗寬度 (1/zoom)
        const scrollDelta = moveRatio / (this.zoomLevel - 1);
        this.scrollOffset = Math.max(0, Math.min(1, this.scrollOffset - scrollDelta));
        this._draw();
    }

    _handleInteraction(clientX) {
        if (!this.onClick) return;
        const rect = this.canvas.getBoundingClientRect();
        const localRatio = (clientX - rect.left) / rect.width;

        const viewWidthRatio = 1 / this.zoomLevel;
        const viewStartRatio = this.scrollOffset * (1 - viewWidthRatio);
        const totalRatio = viewStartRatio + localRatio * viewWidthRatio;

        const timeMs = this.sessionStartTime + totalRatio * (this.sessionEndTime - this.sessionStartTime);
        this.onClick(timeMs);
    }
}

window.NightWhisperWaveform = NightWhisperWaveform;
