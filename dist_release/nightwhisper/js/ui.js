// ============================================
// NightWhisper — UI Module v2
// 滑動解鎖 + 播放器 + 事件列表 + 互動
// ============================================

class NightWhisperUI {
    constructor() {
        // 滑動解鎖
        this.slideTrack = null;
        this.slideThumb = null;
        this._isDragging = false;
        this._startX = 0;
        this._maxSlide = 0;

        // 播放器
        this.audioElement = null;
        this.isPlaying = false;
        this.playbackRate = 1;
        this.currentSegments = [];
        this.currentSegmentIndex = 0;
        this.sessionStartTime = 0;

        // 回呼
        this.onSlideUnlock = null;
        this.onPlaybackTimeUpdate = null;
    }

    // ================================================
    // 1. 滑動解鎖
    // ================================================

    initSlideToStop(trackId, thumbId) {
        this.slideTrack = document.getElementById(trackId);
        this.slideThumb = document.getElementById(thumbId);
        if (!this.slideTrack || !this.slideThumb) return;

        this.slideThumb.addEventListener('touchstart', (e) => this._dragStart(e), { passive: false });
        this.slideThumb.addEventListener('touchmove', (e) => this._dragMove(e), { passive: false });
        this.slideThumb.addEventListener('touchend', () => this._dragEnd());

        this.slideThumb.addEventListener('mousedown', (e) => this._dragStart(e));
        document.addEventListener('mousemove', (e) => this._dragMove(e));
        document.addEventListener('mouseup', () => this._dragEnd());
    }

    _dragStart(e) {
        this._isDragging = true;
        this.slideThumb.style.transition = 'none';
        this._startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        this._maxSlide = this.slideTrack.offsetWidth - this.slideThumb.offsetWidth - 8;
    }

    _dragMove(e) {
        if (!this._isDragging) return;
        e.preventDefault();
        const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        let moveX = currentX - this._startX;
        moveX = Math.max(0, Math.min(moveX, this._maxSlide));
        this.slideThumb.style.transform = `translateX(${moveX}px)`;

        // 視覺回饋：靠近右邊變紅
        const icon = this.slideThumb.querySelector('span');
        if (moveX > this._maxSlide * 0.7) {
            icon?.classList.add('text-red-400');
            icon?.classList.remove('text-zinc-400');
        } else {
            icon?.classList.remove('text-red-400');
            icon?.classList.add('text-zinc-400');
        }
    }

    _dragEnd() {
        if (!this._isDragging) return;
        this._isDragging = false;
        this.slideThumb.style.transition = 'transform 0.3s ease-out';

        const match = this.slideThumb.style.transform.match(/translateX\((.*?)px\)/);
        const moveX = match ? parseFloat(match[1]) : 0;

        if (moveX >= this._maxSlide * 0.85) {
            setTimeout(() => {
                this.slideThumb.style.transform = 'translateX(0px)';
                if (this.onSlideUnlock) this.onSlideUnlock();
            }, 100);
        } else {
            this.slideThumb.style.transform = 'translateX(0px)';
            const icon = this.slideThumb.querySelector('span');
            icon?.classList.remove('text-red-400');
            icon?.classList.add('text-zinc-400');
        }
    }

    // ================================================
    // 2. 播放器
    // ================================================

    initPlayer() {
        this.audioElement = new Audio();
        this.audioElement.addEventListener('timeupdate', () => {
            if (this.onPlaybackTimeUpdate) {
                const totalDuration = this._getTotalDuration();
                const currentTime = this._getCurrentGlobalTime();
                this.onPlaybackTimeUpdate(currentTime, totalDuration);
            }
        });
        this.audioElement.addEventListener('ended', () => this._playNextSegment());
    }

    async loadSegments(recordingBlobs) {
        if (this.audioElement.src) {
            URL.revokeObjectURL(this.audioElement.src);
        }

        // 核心修正：將所有分段 Blob 合併成一個單一 Blob
        // 這樣瀏覽器才能看到第一個分段的 Header，並正確處理整體的 Seek
        const mimeType = recordingBlobs[0]?.mimeType || 'audio/webm';
        const combinedBlob = new Blob(recordingBlobs.map(rec => rec.blob), { type: mimeType });

        this.audioElement.src = URL.createObjectURL(combinedBlob);
        this.currentSegments = recordingBlobs; // 保留原始資訊供時間計算使用
        this.sessionStartTime = this.sessionStartTime || recordingBlobs[0]?.timestamp || 0;
    }

    play() {
        if (!this.audioElement.src) return;
        this.audioElement.playbackRate = this.playbackRate;
        this.audioElement.play();
        this.isPlaying = true;
    }

    pause() {
        this.audioElement.pause();
        this.isPlaying = false;
    }

    togglePlay() {
        this.isPlaying ? this.pause() : this.play();
    }

    seekTo(timeMs) {
        if (!this.audioElement.src) return;
        this.audioElement.currentTime = timeMs / 1000;
        if (this.isPlaying) this.audioElement.play();
    }

    skip(seconds) {
        const currentGlobal = this._getCurrentGlobalTime();
        this.seekTo(currentGlobal + seconds * 1000);
    }

    setSpeed(rate) {
        this.playbackRate = rate;
        this.audioElement.playbackRate = rate;
    }

    cleanup() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }
        for (const seg of this.currentSegments) {
            URL.revokeObjectURL(seg.url);
        }
        this.currentSegments = [];
    }

    _playNextSegment() {
        // 合併為單一 Blob 後，不再需要手動切換 Segment
        this.isPlaying = false;
    }

    _getCurrentGlobalTime() {
        return this.audioElement.currentTime * 1000;
    }

    _getTotalDuration() {
        return this.currentSegments.reduce((sum, s) => sum + s.duration, 0);
    }

    // ================================================
    // 3. 事件列表渲染 (新版卡片式)
    // ================================================

    renderEventList(events, containerEl, sessionStartTime) {
        containerEl.innerHTML = '';
        this.sessionStartTime = sessionStartTime || 0;

        if (events.length === 0) {
            containerEl.innerHTML = `
        <div class="text-center py-12 text-zinc-500">
          <span class="material-symbols-outlined text-4xl mb-2 block">nights_stay</span>
          <p class="text-sm">尚無偵測事件</p>
          <p class="text-xs text-zinc-600 mt-1">開始一次睡眠追蹤以查看報告</p>
        </div>`;
            return;
        }

        for (const event of events) {
            const el = this._createEventCard(event);
            containerEl.appendChild(el);
        }
    }

    _createEventCard(event) {
        const isSnore = event.type === 'snore';
        const typeLabel = isSnore ? '打呼' : '疑似夢話';
        const icon = isSnore ? 'snooze' : 'mic';
        const iconColorClass = isSnore ? 'text-red-400' : 'text-yellow-400';
        const iconBgClass = isSnore ? 'event-icon-snore' : 'event-icon-talk';

        const absTime = new Date(event.time);
        const timeStr = absTime.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        // 計算相對錄音開始的時間 (HH:mm:ss)
        const relativeMs = event.time - this.sessionStartTime;
        const totalSec = Math.floor(relativeMs / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const relativeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        const displayTime = `${timeStr} (${relativeStr})`;

        const durationStr = event.duration >= 60
            ? `${Math.floor(event.duration / 60)}m ${event.duration % 60}s`
            : `${event.duration}s`;

        const card = document.createElement('div');
        card.className = 'event-card bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-white/5';
        card.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-full ${iconBgClass} flex items-center justify-center">
          <span class="material-symbols-outlined ${iconColorClass}">${icon}</span>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-white font-medium">${timeStr}</span>
            <span class="text-xs px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">${typeLabel}</span>
          </div>
          <div class="text-[10px] text-zinc-500 opacity-70">(${relativeStr})</div>
          <div class="text-[10px] text-zinc-500 flex gap-3 mt-1">
            <span>長度: ${durationStr}</span>
            <span>強度: ${Math.abs(event.dB)}dB</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="p-2 text-zinc-400 active:text-white event-replay-btn">
          <span class="material-symbols-outlined text-lg">replay_10</span>
        </button>
        <button class="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform event-play-btn">
          <span class="material-symbols-outlined text-lg">play_arrow</span>
        </button>
      </div>`;

        // 播放按鈕
        card.querySelector('.event-play-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const offset = event.time - this.sessionStartTime;
            this.seekTo(Math.max(0, offset));
            this.play();
        });

        // 倒退 10 秒按鈕
        card.querySelector('.event-replay-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const offset = event.time - this.sessionStartTime - 10000;
            this.seekTo(Math.max(0, offset));
            this.play();
        });

        return card;
    }

    // ================================================
    // 4. 延時 Slider 綁定
    // ================================================

    initDelaySlider(sliderId, valueId) {
        const slider = document.getElementById(sliderId);
        const valueEl = document.getElementById(valueId);
        const unitEl = document.getElementById('delay-unit');
        if (!slider || !valueEl) return;

        const update = () => {
            const val = parseInt(slider.value);
            valueEl.innerText = val === 0 ? '立即' : val;
            if (unitEl) unitEl.style.display = val === 0 ? 'none' : 'inline';
        };

        slider.addEventListener('input', update);
        update();

        return () => parseInt(slider.value);
    }

    // ================================================
    // 5. 過濾開關
    // ================================================

    initFilterToggle(btnId, dotId) {
        const btn = document.getElementById(btnId);
        const dot = document.getElementById(dotId);
        if (!btn || !dot) return;

        let active = true;

        btn.addEventListener('click', () => {
            active = !active;
            if (active) {
                btn.classList.remove('bg-zinc-700');
                btn.classList.add('bg-violet-600');
                dot.classList.remove('left-1');
                dot.classList.add('left-7');
            } else {
                btn.classList.add('bg-zinc-700');
                btn.classList.remove('bg-violet-600');
                dot.classList.add('left-1');
                dot.classList.remove('left-7');
            }
            btn.dataset.active = active;
        });

        return () => btn.dataset.active === 'true';
    }

    // ================================================
    // 6. 呼吸波形 bars (Tracking 畫面)
    // ================================================

    initBreathingBars(containerId, count = 12) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const bar = document.createElement('div');
            bar.className = 'breathing-bar';
            bar.style.height = `${15 + Math.random() * 30}%`;
            bar.style.animation = `bar-pulse 3s infinite ease-in-out ${i * 0.15}s`;
            container.appendChild(bar);
        }
    }
}

window.NightWhisperUI = NightWhisperUI;
