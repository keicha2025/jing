const video = document.getElementById('mainVideo');
const app = document.getElementById('app');
const playerContainer = document.getElementById('playerContainer');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const fileInput = document.getElementById('fileInput');
const progressContainer = document.getElementById('progressContainer');
const progressFilled = document.getElementById('progressFilled');
const privacyMask = document.getElementById('privacyMask');

let touchStartY = 0;
let longPressTimer = null;
let isDragging = false;

// 1. 檔案讀取
fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        video.src = URL.createObjectURL(file);
        document.getElementById('uploadUI').style.display = 'none';
        video.play();
        updateUI(true);
    }
};

// 2. 播放與暫停 UI 狀態
function updateUI(isPlaying) {
    playBtn.style.display = isPlaying ? 'none' : 'flex';
    pauseBtn.style.display = isPlaying ? 'flex' : 'none';
    const overlay = document.getElementById('overlay');
    if (isPlaying) {
        overlay.classList.remove('paused');
    } else {
        overlay.classList.add('paused');
    }
}

playBtn.onclick = () => { video.play(); updateUI(true); };
pauseBtn.onclick = () => { video.pause(); updateUI(false); };

// 3. 進度條拖動邏輯 (核心需求)
const handleScrub = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = progressContainer.getBoundingClientRect();
    let val = (clientX - rect.left) / rect.width;
    val = Math.max(0, Math.min(val, 1));
    video.currentTime = val * video.duration;
};

const startScrub = (e) => {
    const isUIVisible = !video.paused; // 如果正在播放且 UI 隱藏，則需要長按

    const doStart = () => {
        isDragging = true;
        progressContainer.classList.add('active');
        handleScrub(e);
    };

    if (video.paused) {
        // 暫停狀態（UI 顯示）：直接開始拖動
        doStart();
    } else {
        // 播放狀態（UI 隱藏）：啟動長按計時器
        longPressTimer = setTimeout(() => {
            doStart();
            // 長按成功後的震動回饋 (如果裝置支援)
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500); 
    }

    const moveHandler = (ev) => {
        if (isDragging) handleScrub(ev);
    };

    const stopHandler = () => {
        clearTimeout(longPressTimer);
        isDragging = false;
        progressContainer.classList.remove('active');
        window.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('touchend', stopHandler);
    };

    window.addEventListener('touchmove', moveHandler);
    window.addEventListener('touchend', stopHandler);
};

progressContainer.addEventListener('touchstart', startScrub);

// 4. 滑動全螢幕與雙擊跳轉
playerContainer.addEventListener('touchstart', (e) => {
    if (e.target === progressContainer || progressContainer.contains(e.target)) return;
    touchStartY = e.touches[0].clientY;
});

playerContainer.addEventListener('touchend', (e) => {
    if (e.target === progressContainer || progressContainer.contains(e.target)) return;
    const touchEndY = e.changedTouches[0].clientY;
    if (touchStartY - touchEndY > 80) enterFullscreen();
});

function enterFullscreen() {
    app.classList.remove('mini-mode');
    app.classList.add('fullscreen-mode');
    if (playerContainer.requestFullscreen) playerContainer.requestFullscreen();
}

// 雙擊跳轉
let lastClick = 0;
playerContainer.addEventListener('click', (e) => {
    if (e.target === progressContainer || progressContainer.contains(e.target) || e.target.closest('.center-btn')) return;
    const now = Date.now();
    if (now - lastClick < 300) {
        const rect = playerContainer.getBoundingClientRect();
        if (e.clientX - rect.left > rect.width / 2) {
            video.currentTime += 10;
        } else {
            video.currentTime -= 10;
        }
    }
    lastClick = now;
});

// 5. 無痕保護
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        video.pause();
        privacyMask.style.display = 'flex';
    } else {
        privacyMask.style.display = 'none';
    }
});

video.ontimeupdate = () => {
    const percent = (video.currentTime / video.duration) * 100;
    progressFilled.style.width = `${percent}%`;
};
