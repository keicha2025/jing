// ============================================
// NightWhisper — App Controller v3
// 修正：view 切換使用 opacity+z-index，無閃爍
// 新增：設定畫面
// ============================================

(async function () {
    'use strict';

    // ── 初始化模組 ──
    const isApp = window.hasOwnProperty('Capacitor') || window.hasOwnProperty('cordova');
    const storage = new NightWhisperStorage();
    await storage.init();

    const recorder = new NightWhisperRecorder(storage);
    const analyzer = new NightWhisperAnalyzer(storage);
    const waveform = new NightWhisperWaveform('waveform-canvas');
    const ui = new NightWhisperUI();

    // 初始化靈敏度 (從設定 Slider 讀取)
    analyzer.setSensitivity(document.getElementById('sensitivity-slider')?.value || 3);

    // ── DOM 元素 ──
    const allViews = document.querySelectorAll('.view-panel');

    const views = {
        setup: document.getElementById('view-setup'),
        tracking: document.getElementById('view-tracking'),
        analysis: document.getElementById('view-analysis'),
        settings: document.getElementById('view-settings'),
        history: document.getElementById('view-history'),
    };

    const els = {
        btnStart: document.getElementById('btn-start'),
        timeDisplay: document.getElementById('current-time'),
        monitoringStatus: document.getElementById('monitoring-status'),
        eventListContainer: document.getElementById('event-list-container'),
        eventCount: document.getElementById('event-count'),
        sessionDate: document.getElementById('session-date'),
        sessionStartTime: document.getElementById('session-start-time'),
        sessionEndTime: document.getElementById('session-end-time'),
        playheadLine: document.getElementById('playhead-line'),
        calibrationOverlay: document.getElementById('calibration-overlay'),
        liveEventFeed: document.getElementById('live-event-feed'),
        bottomNav: document.getElementById('bottom-nav'),
        navTrack: document.getElementById('nav-track'),
        navReport: document.getElementById('nav-report'),
        navHistory: document.getElementById('nav-history'),
        navSettings: document.getElementById('nav-settings'),
        btnSpeed15: document.getElementById('btn-speed-15'),
        btnSpeed20: document.getElementById('btn-speed-20'),
        batteryLevel: document.getElementById('battery-level'),
        // 設定頁
        sensitivitySlider: document.getElementById('sensitivity-slider'),
        sensitivityValue: document.getElementById('sensitivity-value'),
        storageUsage: document.getElementById('storage-usage'),
        btnClearData: document.getElementById('btn-clear-data'),
        cardUpload: document.getElementById('card-upload'),
        fileInput: document.getElementById('input-audio-upload'),
        skipSlider: document.getElementById('skip-slider'),
        skipValue: document.getElementById('skip-value'),
        transcodeStatus: document.getElementById('transcode-status'),
        transcodePercent: document.getElementById('transcode-percent'),
        btnUpdate: document.getElementById('btn-update'),
        appVersionText: document.getElementById('app-version-text'),
        appInfoTitle: document.getElementById('app-info-title'),
        sessionSelector: document.getElementById('btn-session-selector'),
        sessionDropdown: document.getElementById('session-dropdown'),
        sessionDropdownList: document.getElementById('session-dropdown-list'),
        currentSessionLabel: document.getElementById('current-session-label'),
        analysisSensitivitySlider: document.getElementById('analysis-sensitivity-slider'),
        analysisSensitivityLabel: document.getElementById('analysis-sensitivity-label'),
        btnReanalyze: document.getElementById('btn-reanalyze'),
    };

    // ── 狀態 ──
    let currentSessionId = null;
    let clockInterval = null;
    let delayTimer = null;
    let wakeLock = null;
    let isMonitoring = false;
    let currentView = 'setup';

    // ── 初始化 UI 組件 ──
    ui.initSlideToStop('slide-track', 'slide-thumb');
    ui.initPlayer();
    const getDelayMinutes = ui.initDelaySlider('delay-slider', 'delay-value');
    const getFilterEnabled = ui.initFilterToggle('filter-toggle-btn', 'filter-toggle-dot');

    // 初始化忽略時間 Slider
    const getSkipMinutes = () => parseInt(els.skipSlider?.value || 0);
    if (els.skipSlider) {
        els.skipSlider.addEventListener('input', (e) => {
            if (els.skipValue) els.skipValue.innerText = e.target.value;
        });
    }

    // 電池狀態
    if (navigator.getBattery) {
        navigator.getBattery().then((battery) => {
            if (els.batteryLevel) els.batteryLevel.innerText = Math.round(battery.level * 100) + '%';
        }).catch(() => { });
    }

    // ── 系統更新與環境適應 ──
    if (isApp) {
        console.log('[NightWhisper] Running in Native App mode');
        if (els.appInfoTitle) els.appInfoTitle.innerText = 'App 版本';
        if (els.btnUpdate) {
            els.btnUpdate.innerText = '下載最新 APK';
            els.btnUpdate.addEventListener('click', () => {
                // 導向 GitHub 的 APK 下載連結 (請確保此路徑正確)
                const apkUrl = 'https://github.com/keicha2025/jing/releases';
                window.open(apkUrl, '_system');
            });
        }
    } else if (els.btnUpdate) {
        els.btnUpdate.addEventListener('click', async () => {
            const originalText = els.btnUpdate.innerText;
            els.btnUpdate.innerText = '正在檢查...';
            els.btnUpdate.disabled = true;

            if ('serviceWorker' in navigator) {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    let updateFound = false;

                    for (let reg of registrations) {
                        // 強制向伺服器檢查 sw.js 是否有變動
                        await reg.update();

                        // 如果有正在等待安裝的 SW，則強制啟動
                        if (reg.waiting) {
                            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                            updateFound = true;
                        }
                    }

                    // 同時清理瀏覽器的 Cache Storage (針對靜態資源)
                    const cacheKeys = await caches.keys();
                    for (const key of cacheKeys) {
                        await caches.delete(key);
                    }

                    if (updateFound) {
                        await showModal({
                            title: '偵測到更新',
                            message: '已成功下載新版本，即將重啟應用程式。',
                            icon: 'update',
                            confirmText: '立即重啟'
                        });
                        window.location.reload();
                    } else {
                        // 雖然沒有 SW 更新，但為了保險（處理 ?v= 版本變更），仍執行強制重新整理
                        els.btnUpdate.innerText = '已是最新版';
                        setTimeout(() => {
                            window.location.reload();
                        }, 800);
                    }
                } catch (err) {
                    console.error('[Update] Error:', err);
                    window.location.reload();
                }
            } else {
                window.location.reload();
            }
        });
    }

    // ── 自動偵測更新提示 (主動推播模式) ──
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // 當 SW 接管控制權變更時，通常代表新版本已就緒
            console.log('[PWA] Controller changed, reloading...');
            window.location.reload();
        });
    }

    // ────────────────────────────
    // 核心：畫面切換（無閃爍）
    // ────────────────────────────
    function switchView(viewId) {
        currentView = viewId;

        // 先把所有 view 隱藏（opacity 0 + pointer-events none + 低 z-index）
        allViews.forEach((v) => {
            v.style.opacity = '0';
            v.style.pointerEvents = 'none';
            v.style.zIndex = '10';
        });

        // 顯示目標 view
        const target = views[viewId];
        if (!target) return;
        target.style.zIndex = '20';
        // 用 rAF 確保 z-index 先生效，再觸發 opacity transition
        requestAnimationFrame(() => {
            target.style.opacity = '1';
            target.style.pointerEvents = 'auto';
        });

        // Tracking view 特殊處理（最高層）
        if (viewId === 'tracking') {
            target.style.zIndex = '30';
            els.bottomNav.style.opacity = '0';
            els.bottomNav.style.pointerEvents = 'none';
            startClock();
            requestWakeLock();
            ui.initBreathingBars('breathing-bars', 16);
        } else {
            els.bottomNav.style.opacity = '1';
            els.bottomNav.style.pointerEvents = 'auto';
            stopClock();
            releaseWakeLock();
        }

        // 更新底部導覽 active 狀態
        const tabMap = { setup: 'track', analysis: 'report', history: 'history', settings: 'settings' };
        updateNavActive(tabMap[viewId] || null);

        // 分析頁載入資料
        if (viewId === 'analysis') {
            loadAnalysisView(currentSessionId);
            renderSessionDropdown();
        }

        // 設定頁更新資訊
        if (viewId === 'settings') {
            updateStorageUsage();
        }

        // 紀錄頁載入列表
        if (viewId === 'history') {
            renderSessionHistory();
        }
    }

    function updateNavActive(tab) {
        const mapping = {
            track: els.navTrack,
            report: els.navReport,
            history: els.navHistory,
            settings: els.navSettings,
        };
        Object.entries(mapping).forEach(([key, el]) => {
            if (!el) return;
            if (key === tab) {
                el.classList.remove('text-zinc-500');
                el.classList.add('text-violet-400');
            } else {
                el.classList.remove('text-violet-400');
                el.classList.add('text-zinc-500');
            }
        });
    }

    // ── 時鐘 ──
    function updateTime() {
        const now = new Date();
        if (els.timeDisplay) {
            els.timeDisplay.innerText =
                now.getHours().toString().padStart(2, '0') + ':' +
                now.getMinutes().toString().padStart(2, '0');
        }
    }

    function startClock() {
        updateTime();
        clockInterval = setInterval(updateTime, 10000);
    }

    function stopClock() {
        if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    }

    // ── WakeLock ──
    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.log('[App] Wake Lock not available:', err);
        }
    }

    function releaseWakeLock() {
        if (wakeLock) { wakeLock.release(); wakeLock = null; }
    }

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && isMonitoring) {
            await requestWakeLock();
        }
    });

    // ── 開始監測 ──
    async function startMonitoring() {
        const delayMinutes = getDelayMinutes ? getDelayMinutes() : 0;
        const podcastFilter = getFilterEnabled ? getFilterEnabled() : true;

        currentSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        await storage.createSession({
            id: currentSessionId,
            delayMinutes,
            podcastFilter,
        });

        switchView('tracking');
        isMonitoring = true;

        if (delayMinutes > 0) {
            els.monitoringStatus.innerText = `預計 ${delayMinutes} 分鐘後開始錄音...`;
            let remaining = delayMinutes * 60;

            delayTimer = setInterval(() => {
                remaining--;
                const mins = Math.floor(remaining / 60);
                const secs = remaining % 60;
                els.monitoringStatus.innerText = `${mins}:${secs.toString().padStart(2, '0')} 後開始錄音...`;
                if (remaining <= 0) {
                    clearInterval(delayTimer);
                    delayTimer = null;
                    beginRecordingAndAnalysis();
                }
            }, 1000);
        } else {
            beginRecordingAndAnalysis();
        }
    }

    async function beginRecordingAndAnalysis() {
        els.monitoringStatus.innerText = '正在校準環境噪音...';
        if (els.calibrationOverlay) els.calibrationOverlay.classList.remove('hidden');

        const success = await recorder.start(currentSessionId);
        if (!success) {
            els.monitoringStatus.innerText = '❌ 麥克風存取被拒絕';
            if (els.calibrationOverlay) els.calibrationOverlay.classList.add('hidden');
            return;
        }

        const skipMinutes = getSkipMinutes();

        analyzer.onCalibrationComplete = () => {
            els.monitoringStatus.innerText = '麥克風運作中（背景降噪開啟）';
            if (els.calibrationOverlay) els.calibrationOverlay.classList.add('hidden');
        };

        analyzer.onEvent = (event) => showLiveEvent(event);
        analyzer.onLevelUpdate = () => { };

        // 如果有設定忽略開頭，延遲啟動 analyzer (但 recorder 照常錄，保留原始錄音)
        if (skipMinutes > 0) {
            setTimeout(() => {
                if (isMonitoring) {
                    analyzer.start(
                        recorder.getAnalyserNode(),
                        recorder.getAudioContext(),
                        currentSessionId
                    );
                }
            }, skipMinutes * 60 * 1000);
        } else {
            analyzer.start(
                recorder.getAnalyserNode(),
                recorder.getAudioContext(),
                currentSessionId
            );
        }
    }

    // ── 停止監測 ──
    async function stopMonitoring() {
        isMonitoring = false;
        if (delayTimer) { clearInterval(delayTimer); delayTimer = null; }
        analyzer.stop();
        await recorder.stop();
        await storage.endSession(currentSessionId);
        switchView('analysis');
    }

    // ── 即時事件 ──
    function showLiveEvent(event) {
        if (!els.liveEventFeed) return;
        const isSnore = event.type === 'snore';
        const label = isSnore ? '偵測到打呼' : '偵測到說話';
        const colorClass = isSnore ? 'text-red-400' : 'text-yellow-400';
        const icon = isSnore ? 'snooze' : 'mic';
        els.liveEventFeed.innerHTML = `
      <div class="flex items-center justify-center gap-2 ${colorClass} animate-pulse">
        <span class="material-symbols-outlined text-sm">${icon}</span>
        <span class="text-xs">${label} (${Math.abs(event.dB)}dB)</span>
      </div>`;
        setTimeout(() => { if (els.liveEventFeed) els.liveEventFeed.innerHTML = ''; }, 4000);
    }

    // ── 分析畫面 ──
    async function loadAnalysisView(sessionId = null) {
        let session;
        if (sessionId) {
            session = await storage.getSession(sessionId);
        } else {
            session = await storage.getLatestSession();
        }

        if (!session) {
            waveform.render([], [], 0, 0);
            if (els.sessionDate) els.sessionDate.innerText = '尚無紀錄';
            return;
        }

        currentSessionId = session.id;

        if (els.currentSessionLabel) {
            const date = new Date(session.startTime);
            els.currentSessionLabel.innerText = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        }

        if (els.sessionDate) {
            const startDate = new Date(session.startTime);
            const dur = session.endTime ? formatDuration(session.endTime - session.startTime) : '--';
            els.sessionDate.innerText = `${startDate.toLocaleDateString('zh-TW', {
                year: 'numeric', month: 'long', day: 'numeric',
            })} • ${dur}`;
        }
        if (els.sessionStartTime && session.startTime) {
            els.sessionStartTime.innerText = new Date(session.startTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        if (els.sessionEndTime && session.endTime) {
            els.sessionEndTime.innerText = new Date(session.endTime).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        const analysisData = await storage.getAnalysisBySession(session.id);
        const events = await storage.getEventsBySession(session.id);

        if (els.eventCount) els.eventCount.innerText = `錄音事件回放 (${events.length})`;

        waveform.setPlayheadElement(els.playheadLine);
        waveform.render(analysisData, events, session.startTime, session.endTime || Date.now());
        waveform.onClick = (timeMs) => {
            const offset = timeMs - session.startTime;
            ui.seekTo(offset);
            ui.play();
        };

        if (els.eventListContainer) {
            ui.renderEventList(events, els.eventListContainer, session.startTime);
        }

        const recordings = await storage.getRecordingsBySession(session.id);
        if (recordings.length > 0) await ui.loadSegments(recordings);

        ui.onPlaybackTimeUpdate = (currentTime, totalDuration) => {
            if (totalDuration > 0) waveform.setPlayheadPosition(currentTime / totalDuration);
        };
    }

    function formatDuration(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}小時 ${minutes}分`;
    }

    // ── 下拉選單邏輯 ──
    async function renderSessionDropdown() {
        if (!els.sessionDropdownList) return;
        const sessions = await storage.getAllSessions();
        sessions.sort((a, b) => b.startTime - a.startTime);

        if (sessions.length === 0) {
            els.sessionDropdownList.innerHTML = '<div class="px-4 py-3 text-zinc-500 text-xs text-center">尚無錄音紀錄</div>';
            return;
        }

        els.sessionDropdownList.innerHTML = '';
        sessions.forEach(session => {
            const date = new Date(session.startTime);
            const label = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            const dur = session.endTime ? formatDuration(session.endTime - session.startTime) : '未完成';

            const item = document.createElement('div');
            item.className = `px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0 ${session.id === currentSessionId ? 'bg-violet-600/10' : ''}`;
            item.innerHTML = `
                <div class="text-sm font-medium ${session.id === currentSessionId ? 'text-violet-400' : 'text-zinc-200'}">${label}</div>
                <div class="text-[10px] text-zinc-500">${dur}</div>
            `;
            item.addEventListener('click', () => {
                loadAnalysisView(session.id);
                toggleSessionDropdown(false);
            });
            els.sessionDropdownList.appendChild(item);
        });
    }

    function toggleSessionDropdown(show) {
        if (!els.sessionDropdown) return;
        if (show) {
            els.sessionDropdown.classList.remove('opacity-0', 'pointer-events-none', '-translate-y-2');
        } else {
            els.sessionDropdown.classList.add('opacity-0', 'pointer-events-none', '-translate-y-2');
        }
    }

    els.sessionSelector?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = els.sessionDropdown.classList.contains('opacity-0');
        toggleSessionDropdown(isHidden);
    });

    document.addEventListener('click', () => toggleSessionDropdown(false));

    // ── 重新分析邏輯 ──
    els.btnReanalyze?.addEventListener('click', async () => {
        if (!currentSessionId || !els.btnReanalyze) return;

        const originalText = els.btnReanalyze.innerHTML;
        els.btnReanalyze.disabled = true;
        els.btnReanalyze.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> 分析中...';

        try {
            const analysisData = await storage.getAnalysisBySession(currentSessionId);
            if (!analysisData || analysisData.length === 0) {
                alert('找不到該次錄音的分析特徵資料，無法快速重新分析。');
                return;
            }

            // 1. 僅清除舊事件，保留分析數據 (解耦)
            await storage.clearSessionEvents(currentSessionId);

            // 2. 獲取新敏感度並執行瞬間分析
            const sensitivity = els.analysisSensitivitySlider ? els.analysisSensitivitySlider.value : 3;

            // 利用已存在的特徵資料重新計算事件 (包含平滑化處理)
            await analyzer.reanalyzeFromData(currentSessionId, analysisData, sensitivity);

            // 3. 重新載入 View
            await loadAnalysisView(currentSessionId);

        } catch (err) {
            console.error('Re-analysis failed:', err);
            alert('分析失敗：' + err.message);
        } finally {
            els.btnReanalyze.disabled = false;
            els.btnReanalyze.innerHTML = originalText;
        }
    });

    // ── 設定頁 ──
    async function updateStorageUsage() {
        if (!els.storageUsage) return;
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const est = await navigator.storage.estimate();
                const usedMB = ((est.usage || 0) / (1024 * 1024)).toFixed(1);
                const totalMB = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
                els.storageUsage.innerText = `${usedMB} MB / ${totalMB} MB`;
            } else {
                els.storageUsage.innerText = '無法偵測';
            }
        } catch {
            els.storageUsage.innerText = '無法偵測';
        }
    }

    // ── 自訂 Modal ──
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    let _modalResolve = null;

    function showModal({ title, message, icon, confirmText, confirmClass }) {
        return new Promise((resolve) => {
            _modalResolve = resolve;
            if (modalTitle) modalTitle.innerText = title || '確認';
            if (modalMessage) modalMessage.innerText = message || '';
            if (modalIcon) modalIcon.innerText = icon || 'warning';
            if (modalConfirm) {
                modalConfirm.innerText = confirmText || '確認刪除';
                modalConfirm.className = confirmClass || 'flex-1 bg-violet-600 rounded-xl py-3 text-sm text-white font-semibold active:bg-violet-700 transition-colors';
            }
            // 顯示
            modalOverlay.style.opacity = '1';
            modalOverlay.style.pointerEvents = 'auto';
            requestAnimationFrame(() => {
                if (modalContent) modalContent.style.transform = 'scale(1)';
            });
        });
    }

    function hideModal() {
        if (modalContent) modalContent.style.transform = 'scale(0.95)';
        modalOverlay.style.opacity = '0';
        modalOverlay.style.pointerEvents = 'none';
    }

    modalCancel?.addEventListener('click', () => {
        hideModal();
        if (_modalResolve) { _modalResolve(false); _modalResolve = null; }
    });

    modalConfirm?.addEventListener('click', () => {
        hideModal();
        if (_modalResolve) { _modalResolve(true); _modalResolve = null; }
    });

    // 點背景關閉
    modalOverlay?.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            hideModal();
            if (_modalResolve) { _modalResolve(false); _modalResolve = null; }
        }
    });

    // ── 歷史紀錄列表 ──
    const sessionHistoryList = document.getElementById('session-history-list');

    async function renderSessionHistory() {
        if (!sessionHistoryList) return;
        const sessions = await storage.getAllSessions();
        sessions.sort((a, b) => b.startTime - a.startTime);

        if (sessions.length === 0) {
            sessionHistoryList.innerHTML = `
                <div class="text-center py-8 text-zinc-500">
                    <span class="material-symbols-outlined text-3xl mb-2 block">history</span>
                    <p class="text-sm">尚無紀錄</p>
                </div>`;
            return;
        }

        sessionHistoryList.innerHTML = '';
        for (const session of sessions) {
            const card = createSessionCard(session);
            sessionHistoryList.appendChild(card);
        }
    }

    function createSessionCard(session) {
        const startDate = new Date(session.startTime);
        const dateStr = startDate.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
        const timeStr = startDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
        const durStr = session.endTime ? formatDuration(session.endTime - session.startTime) : '進行中';
        const statusIcon = session.status === 'completed' ? 'check_circle' : 'pending';
        const statusColor = session.status === 'completed' ? 'text-green-500' : 'text-yellow-500';

        const card = document.createElement('div');
        card.className = 'bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-white/5';
        card.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center">
                    <span class="material-symbols-outlined text-violet-400">bedtime</span>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-white font-medium">${dateStr} ${timeStr}</span>
                        <span class="material-symbols-outlined text-sm ${statusColor}">${statusIcon}</span>
                    </div>
                    <p class="text-[10px] text-zinc-500 mt-0.5">時長: ${durStr}</p>
                </div>
            </div>
            <div class="flex items-center gap-1">
                <button class="p-2 text-zinc-500 active:text-blue-400 transition-colors session-download-btn" data-session-id="${session.id}" data-session-date="${dateStr} ${timeStr}">
                    <span class="material-symbols-outlined">download</span>
                </button>
                <button class="p-2 text-zinc-500 active:text-violet-400 transition-colors session-delete-btn" data-session-id="${session.id}" data-session-date="${dateStr} ${timeStr}">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>`;

        // 下載音檔
        card.querySelector('.session-download-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            const sid = btn.dataset.sessionId;
            const sDate = btn.dataset.sessionDate;

            const recordings = await storage.getRecordingsBySession(sid);
            if (!recordings || recordings.length === 0) {
                alert('這個紀錄沒有音檔。');
                return;
            }

            // 按 index 排序確保順序正確
            recordings.sort((a, b) => a.segmentIndex - b.segmentIndex);

            const firstSegment = recordings[0];
            const actualMimeType = firstSegment.mimeType || 'audio/webm';
            const safeName = sDate.replace(/[^\w]/g, '_');

            // 如果本來就是 mp4 (Safari)，直接下載
            if (actualMimeType.includes('mp4') || actualMimeType.includes('aac')) {
                const combinedBlob = new Blob(recordings.map(r => r.blob), { type: actualMimeType });
                triggerDownload(combinedBlob, `nightwhisper_${safeName}.m4a`);
                return;
            }

            // 如果是 Chrome (WebM)，執行轉碼
            if ('AudioEncoder' in window && window.Mp4Muxer) {
                try {
                    showTranscodeUI(true);
                    const m4aBlob = await transcodeToM4A(recordings, (p) => {
                        if (els.transcodePercent) els.transcodePercent.innerText = `${Math.round(p * 100)}%`;
                    });
                    triggerDownload(m4aBlob, `nightwhisper_${safeName}.m4a`);
                } catch (err) {
                    console.error('Transcode failed:', err);
                    alert('轉碼失敗，改為下載原始格式(.webm)');
                    const webmBlob = new Blob(recordings.map(r => r.blob), { type: actualMimeType });
                    triggerDownload(webmBlob, `nightwhisper_${safeName}.webm`);
                } finally {
                    showTranscodeUI(false);
                }
            } else {
                // 不支援 WebCodecs，維持原始下載
                const webmBlob = new Blob(recordings.map(r => r.blob), { type: actualMimeType });
                triggerDownload(webmBlob, `nightwhisper_${safeName}.webm`);
            }
        });

        function triggerDownload(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);
        }

        function showTranscodeUI(show) {
            if (els.transcodeStatus) {
                if (show) els.transcodeStatus.classList.remove('hidden');
                else els.transcodeStatus.classList.add('hidden');
            }
        }

        /**
         * 核心轉碼：WebM (Opus) -> M4A (AAC)
         */
        async function transcodeToM4A(recordings, onProgress) {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // 1. 合併並解碼所有片段
            const blobs = recordings.map(r => r.blob);
            const arrayBuffers = await Promise.all(blobs.map(b => b.arrayBuffer()));
            const audioBuffers = await Promise.all(arrayBuffers.map(ab => audioCtx.decodeAudioData(ab)));

            // 串連 AudioBuffers
            const totalLength = audioBuffers.reduce((sum, b) => sum + b.length, 0);
            const fullBuffer = audioCtx.createBuffer(1, totalLength, audioBuffers[0].sampleRate);
            let offset = 0;
            for (const b of audioBuffers) {
                fullBuffer.copyToChannel(b.getChannelData(0), 0, offset);
                offset += b.length;
            }

            // 2. 初始化 Mp4Muxer
            const muxer = new window.Mp4Muxer.Muxer({
                target: new window.Mp4Muxer.ArrayBufferTarget(),
                container: 'mp4',
                video: null,
                audio: {
                    codec: 'aac',
                    sampleRate: fullBuffer.sampleRate,
                    numberOfChannels: 1
                },
                fastStart: 'in-memory'
            });

            // 3. 初始化 AudioEncoder (WebCodecs)
            let encodedDone;
            const encodedPromise = new Promise(resolve => encodedDone = resolve);

            const encoder = new AudioEncoder({
                output: (chunk, metadata) => {
                    muxer.addAudioChunk(chunk, metadata);
                },
                error: (e) => console.error(e)
            });

            const config = {
                codec: 'mp4a.40.2', // AAC-LC
                sampleRate: fullBuffer.sampleRate,
                numberOfChannels: 1,
                bitrate: 128000
            };
            encoder.configure(config);

            // 4. 送入數據進編碼器
            const rawData = fullBuffer.getChannelData(0);
            const frameSize = 1024; // AAC 常用幀大小
            for (let i = 0; i < rawData.length; i += frameSize) {
                const chunk = rawData.slice(i, i + frameSize);
                if (chunk.length < 1) break;

                // 必須填充到 frameSize 或是處理最後一幀
                const data = new Float32Array(frameSize);
                data.set(chunk);

                const audioData = new AudioData({
                    format: 'f32',
                    sampleRate: fullBuffer.sampleRate,
                    numberOfFrames: chunk.length,
                    numberOfChannels: 1,
                    timestamp: (i / fullBuffer.sampleRate) * 1000000,
                    data: data
                });

                encoder.encode(audioData);
                audioData.close();

                if (i % (frameSize * 100) === 0) {
                    onProgress(i / rawData.length);
                    // 釋放線程
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            await encoder.flush();
            encoder.close();
            muxer.finalize();

            const { buffer } = muxer.target;
            return new Blob([buffer], { type: 'audio/mp4' });
        }

        // 個別刪除
        card.querySelector('.session-delete-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const sid = e.currentTarget.dataset.sessionId;
            const sDate = e.currentTarget.dataset.sessionDate;
            const confirmed = await showModal({
                title: '刪除紀錄',
                message: `確定要刪除 ${sDate} 的睡眠紀錄嗎？\n此操作將同時移除該筆的錄音檔案與偵測事件，無法復原。`,
                icon: 'delete',
                confirmText: '確認刪除',
            });
            if (confirmed) {
                await storage.deleteSession(sid);
                await renderSessionHistory();
                await updateStorageUsage();
            }
        });

        return card;
    }

    // 敏感度 slider
    if (els.sensitivitySlider) {
        const labels = { 1: '極低', 2: '低', 3: '中', 4: '高', 5: '極高' };
        els.sensitivitySlider.addEventListener('input', (e) => {
            const val = e.target.value;
            if (els.sensitivityValue) els.sensitivityValue.innerText = labels[val] || '中';
            // 同步到分析頁 Slider
            if (els.analysisSensitivitySlider) {
                els.analysisSensitivitySlider.value = val;
                if (els.analysisSensitivityLabel) els.analysisSensitivityLabel.innerText = labels[val];
            }
            analyzer.setSensitivity(val);
        });
    }

    // 分析頁敏感度 slider
    if (els.analysisSensitivitySlider) {
        const labels = { 1: '極低', 2: '低', 3: '中', 4: '高', 5: '極高' };
        els.analysisSensitivitySlider.addEventListener('input', (e) => {
            const val = e.target.value;
            if (els.analysisSensitivityLabel) els.analysisSensitivityLabel.innerText = labels[val] || '中';
            // 同步回設定頁 Slider
            if (els.sensitivitySlider) {
                els.sensitivitySlider.value = val;
                if (els.sensitivityValue) els.sensitivityValue.innerText = labels[val];
            }
            analyzer.setSensitivity(val);
        });
    }

    // 清除全部資料（使用自訂 modal）
    if (els.btnClearData) {
        els.btnClearData.addEventListener('click', async () => {
            const sessions = await storage.getAllSessions();
            if (sessions.length === 0) {
                await showModal({
                    title: '沒有資料',
                    message: '目前沒有任何儲存的睡眠紀錄。',
                    icon: 'info',
                    confirmText: '好的',
                    confirmClass: 'flex-1 bg-violet-600 rounded-xl py-3 text-sm text-white font-semibold active:bg-violet-700 transition-colors',
                });
                return;
            }
            const confirmed = await showModal({
                title: '清除所有資料',
                message: `確定要刪除全部 ${sessions.length} 筆睡眠紀錄嗎？\n包含所有錄音檔案、偵測事件和分析數據，此操作無法復原。`,
                icon: 'delete_forever',
                confirmText: `刪除全部 (${sessions.length} 筆)`,
            });
            if (confirmed) {
                for (const s of sessions) {
                    await storage.deleteSession(s.id);
                }
                await renderSessionHistory();
                await updateStorageUsage();
            }
        });
    }

    // ── 上傳音檔 ──
    els.cardUpload?.addEventListener('click', () => els.fileInput?.click());
    els.fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const skipMinutes = getSkipMinutes();
        const confirmed = await showModal({
            title: '開始分析音檔',
            message: `即將分析「${file.name}」\n設定：忽略前 ${skipMinutes} 分鐘。`,
            icon: 'analytics',
            confirmText: '開始',
        });

        if (!confirmed) return;

        // 切換到 Tracking 畫面顯示進度
        switchView('tracking');
        els.monitoringStatus.innerText = '正在載入串流解碼引擎...';

        try {
            currentSessionId = 'up_' + Date.now().toString(36);
            const startTimestamp = Date.now();

            if (!window.MP4Box || !window.AudioDecoder) {
                throw new Error("您的瀏覽器不支援 WebCodecs 或無法載入 MP4Box。請更新瀏覽器。");
            }

            els.monitoringStatus.innerText = '準備解碼環境...';

            const mp4boxfile = MP4Box.createFile();
            let audioTrack = null;
            let audioDecoder = null;
            let totalFrames = 0;
            let decodedFramesCount = 0;
            let durationSeconds = 0;

            const decodePromise = new Promise((resolve, reject) => {
                mp4boxfile.onError = (e) => reject(new Error("MP4 解析錯誤"));

                mp4boxfile.onReady = (info) => {
                    audioTrack = info.audioTracks[0];
                    if (!audioTrack) return reject(new Error("找不到音訊軌道"));

                    totalFrames = audioTrack.nb_samples;
                    durationSeconds = info.duration / info.timescale;

                    // 1. 初始化資料庫
                    storage.createSession({
                        id: currentSessionId,
                        startTime: startTimestamp,
                        endTime: startTimestamp + (durationSeconds * 1000),
                        status: 'completed',
                        type: 'upload',
                        fileName: file.name
                    }).then(() => {
                        // 寫入原始 blob 用於回放
                        storage.saveRecording({
                            sessionId: currentSessionId,
                            segmentIndex: 0,
                            blob: file,
                            mimeType: file.type,
                            size: file.size,
                            duration: durationSeconds * 1000
                        });
                    });

                    // 2. 初始化分析器
                    const skipSeconds = skipMinutes * 60;

                    analyzer.setSensitivity(els.analysisSensitivitySlider ? els.analysisSensitivitySlider.value : 3);
                    analyzer.sessionId = currentSessionId;
                    analyzer.sampleRate = audioTrack.audio.sample_rate;
                    analyzer.isAnalyzing = true;
                    analyzer._analysisBatch = [];
                    analyzer._currentEvent = null;

                    // 3. 設定 WebCodecs 聲音解碼器
                    audioDecoder = new AudioDecoder({
                        error: (e) => reject(new Error("音訊解碼異常: " + e.message)),
                        output: (audioData) => {
                            const timeSeconds = audioData.timestamp / 1000000;

                            // 忽略跳過的片段
                            if (timeSeconds >= skipSeconds) {
                                const options = { planeIndex: 0 };
                                const size = audioData.allocationSize(options);
                                const buffer = new ArrayBuffer(size);
                                audioData.copyTo(buffer, options);
                                const float32Data = new Float32Array(buffer);

                                const timeMs = startTimestamp + (timeSeconds * 1000);
                                const spectrum = analyzer._simulateFFT(float32Data);
                                analyzer._analyzeOfflineStep(spectrum, timeMs);
                            }

                            decodedFramesCount++;
                            if (totalFrames > 0 && decodedFramesCount % 100 === 0) {
                                const percent = Math.round((decodedFramesCount / totalFrames) * 100);
                                els.monitoringStatus.innerText = `串流解碼與分析中: ${percent}%`;
                            }

                            audioData.close();
                        }
                    });

                    // 處理 Codec 字串：對於 AAC 來說，簡單的 mp4a.40.2 通常最穩定
                    let codecStr = audioTrack.codec;
                    if (codecStr.startsWith('mp4a.40.')) {
                        codecStr = 'mp4a.40.2';
                    }

                    const config = {
                        codec: codecStr,
                        sampleRate: audioTrack.audio.sample_rate,
                        numberOfChannels: audioTrack.audio.channel_count
                    };

                    try {
                        const trak = mp4boxfile.getTrackById(audioTrack.id);
                        let extracted = false;
                        if (trak && trak.mdia && trak.mdia.minf && trak.mdia.minf.stbl && trak.mdia.minf.stbl.stsd && trak.mdia.minf.stbl.stsd.entries[0].esds) {
                            const dcd = trak.mdia.minf.stbl.stsd.entries[0].esds.descs[0].decConfigDescr;
                            if (dcd && dcd.decSpecificInfo && dcd.decSpecificInfo.data) {
                                config.description = new Uint8Array(dcd.decSpecificInfo.data).buffer;
                                extracted = true;
                                console.log("[Decoder] Extracted AudioSpecificConfig via MP4Box.");
                            }
                        }

                        // 若無法從檔案抽取，手動構造 AAC-LC 的 AudioSpecificConfig (Fallback)
                        if (!extracted && config.codec.startsWith('mp4a')) {
                            const srIndexes = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];
                            const srIdx = srIndexes.includes(config.sampleRate) ? srIndexes.indexOf(config.sampleRate) : 4;
                            const asc = new Uint8Array(2);
                            asc[0] = (2 << 3) | ((srIdx >> 1) & 0x7);
                            asc[1] = ((srIdx & 0x1) << 7) | ((config.numberOfChannels & 0xF) << 3);
                            config.description = asc.buffer;
                            console.log("[Decoder] Using manual AudioSpecificConfig fallback.");
                        }
                    } catch (e) { console.warn("[Decoder] AudioSpecificConfig warn:", e); }

                    console.log("[Decoder] Decoder.configure using:", config);
                    audioDecoder.configure(config);

                    // 開始提取 samples
                    mp4boxfile.setExtractionOptions(audioTrack.id, null, { nbSamples: 1000 });
                    mp4boxfile.start();
                };

                mp4boxfile.onSamples = (id, user, samples) => {
                    for (let sample of samples) {
                        if (audioDecoder.state === "configured") {
                            audioDecoder.decode(new EncodedAudioChunk({
                                type: sample.is_sync ? "key" : "delta",
                                timestamp: (sample.cts / audioTrack.timescale) * 1000000,
                                duration: (sample.duration / audioTrack.timescale) * 1000000,
                                data: sample.data
                            }));
                        }
                    }
                };

                mp4boxfile.onFlush = async () => {
                    if (audioDecoder) {
                        try {
                            await audioDecoder.flush();
                            audioDecoder.close();
                        } catch (e) { }

                        analyzer._finalizeCurrentEventAt(startTimestamp + (durationSeconds * 1000));
                        await analyzer._flushBatch();
                        analyzer.isAnalyzing = false;
                        resolve();
                    } else {
                        reject(new Error("處理失敗: mp4box flush 但 audioDecoder 不存在"));
                    }
                };
            });

            // 實作串流分塊讀取器，避免 OOM
            const chunkSize = 1024 * 1024 * 5; // 每次讀取 5MB
            let offset = 0;

            const readNextChunk = () => {
                if (offset >= file.size) {
                    mp4boxfile.flush();
                    return;
                }
                const slice = file.slice(offset, offset + chunkSize);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const buffer = e.target.result;
                    buffer.fileStart = offset;
                    offset += buffer.byteLength;

                    // 每讀一個 chunk 丟給 mp4box
                    mp4boxfile.appendBuffer(buffer);

                    // 釋放執行序，避免畫面凍結
                    setTimeout(readNextChunk, 10);
                };
                reader.onerror = () => { throw new Error('檔案區塊讀取錯誤'); };
                reader.readAsArrayBuffer(slice);
            };

            // 啟動串流讀取
            readNextChunk();

            // 等待全部分析完成
            await decodePromise;

            await showModal({
                title: '分析完成',
                message: '音檔已透過串流引擎成功分析！',
                icon: 'check_circle',
                confirmText: '查看報告',
            });

            isMonitoring = false;
            switchView('analysis');
        } catch (err) {
            console.error('Upload failed details:', err);
            isMonitoring = false;

            let errorMsg = err.message || '未知錯誤';
            if (err.name === 'EncodingError') errorMsg = '瀏覽器無法識別此音檔格式。';
            if (err.name === 'QuotaExceededError') errorMsg = '儲存空間不足。';

            await showModal({
                title: '分析失敗',
                message: `錯誤原因：${errorMsg}\n\n這可能是由於瀏覽器不支援 WebCodecs，或檔案格式非 m4a/mp4 引起。`,
                icon: 'error',
                confirmText: '返回',
            });
            switchView('setup');
        } finally {
            // 重置 input 以便下次選取
            e.target.value = '';
        }
    });

    // ── 事件綁定 ──
    els.btnStart?.addEventListener('click', startMonitoring);
    ui.onSlideUnlock = stopMonitoring;

    // 底部導覽
    els.navTrack?.addEventListener('click', () => switchView('setup'));
    els.navReport?.addEventListener('click', () => switchView('analysis'));
    els.navHistory?.addEventListener('click', () => switchView('history'));
    els.navSettings?.addEventListener('click', () => switchView('settings'));

    // 快速播放
    els.btnSpeed15?.addEventListener('click', () => {
        ui.setSpeed(1.5);
        els.btnSpeed15.classList.add('speed-btn-active');
        els.btnSpeed20?.classList.remove('speed-btn-active');
    });
    els.btnSpeed20?.addEventListener('click', () => {
        ui.setSpeed(2.0);
        els.btnSpeed20.classList.add('speed-btn-active');
        els.btnSpeed15?.classList.remove('speed-btn-active');
    });

    // ── 錄音回呼 ──
    recorder.onStatusChange = (status) => console.log('[App] Recorder:', status);
    recorder.onError = (code, msg) => {
        console.error(`[App] Recorder error: ${code} - ${msg}`);
        if (els.monitoringStatus) {
            els.monitoringStatus.innerText = code === 'mic_denied'
                ? '❌ 麥克風權限被拒絕，請在設定中開啟'
                : `錄音錯誤：${msg}`;
        }
    };

    // ── Service Worker ──
    if ('serviceWorker' in navigator) {
        // 使用相對路徑避免註冊到 root 的 sw.js
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            console.log('[App] SW registered:', reg.scope);
            // 每次載入時主動檢查是否有新版本
            reg.update();
        }).catch((err) => console.log('[App] SW failed:', err));
    }

    // ── 初始畫面 ──
    switchView('setup');
    console.log('[NightWhisper] App v3 initialized');
})();
