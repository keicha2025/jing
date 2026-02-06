const video = document.getElementById('mainVideo');
const overlay = document.getElementById('overlay');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const playerContainer = document.getElementById('playerContainer');
const progressContainer = document.getElementById('progressContainer');
const progressFilled = document.getElementById('progressFilled');
const feedback = document.getElementById('feedback');

let clickTimer = null;

selectBtn.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        video.src = url;
        playerContainer.style.display = 'block';
        selectBtn.style.display = 'none';
        video.play();
    }
};

overlay.addEventListener('click', (e) => {
    if (e.target === progressContainer || progressContainer.contains(e.target)) return;
    
    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    if (clickTimer == null) {
        clickTimer = setTimeout(() => {
            togglePlay();
            clickTimer = null;
        }, 300);
    } else {
        clearTimeout(clickTimer);
        clickTimer = null;
        if (x < rect.width / 2) {
            video.currentTime -= 10;
            showFeedback('⏪ -10s');
        } else {
            video.currentTime += 10;
            showFeedback('⏩ +10s');
        }
    }
});

function togglePlay() {
    if (video.paused) {
        video.play();
        overlay.classList.remove('paused');
    } else {
        video.pause();
        overlay.classList.add('paused');
    }
}

function showFeedback(text) {
    feedback.innerText = text;
    feedback.style.opacity = '1';
    setTimeout(() => feedback.style.opacity = '0', 500);
}

video.ontimeupdate = () => {
    const percent = (video.currentTime / video.duration) * 100;
    progressFilled.style.width = `${percent}%`;
};

progressContainer.addEventListener('mousedown', startScrub);
progressContainer.addEventListener('touchstart', startScrub);

function startScrub(e) {
    progressContainer.classList.add('active');
    const handleMove = (ev) => {
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const rect = progressContainer.getBoundingClientRect();
        const scrubTime = ((clientX - rect.left) / rect.width) * video.duration;
        video.currentTime = scrubTime;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', () => {
        progressContainer.classList.remove('active');
        window.removeEventListener('mousemove', handleMove);
    }, { once: true });
    window.addEventListener('touchend', () => {
        progressContainer.classList.remove('active');
        window.removeEventListener('touchmove', handleMove);
    }, { once: true });
}
