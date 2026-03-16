// DOM Elements
const iframe = document.getElementById('video-frame');
const emptyState = document.getElementById('empty-state');
const urlInput = document.getElementById('url-input');
const mainContainer = document.getElementById('main-container');
const searchBox = document.getElementById('search-box');
const autoplayToggle = document.getElementById('autoplay-toggle');

// App State
let isAudioOnly = false;
let isTheater = false;
let currentVideoId = null;
let currentStartTime = 0;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadHistoryUI();
    loadSettings();
    
    // Check for auto-play URL parameters (e.g., ?v=ID&t=120)
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('v');
    const paramTime = urlParams.get('t') || 0;
    
    if (paramId) {
        playVideo(paramId, paramTime, false);
    }
});

// Toast Notification System
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = "toast show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, duration);
}

// Settings Logic
function loadSettings() {
    const savedAutoplay = localStorage.getItem('pawTubeAutoplay');
    if (savedAutoplay !== null) {
        autoplayToggle.checked = savedAutoplay === 'true';
    }
}

autoplayToggle.addEventListener('change', (e) => {
    localStorage.setItem('pawTubeAutoplay', e.target.checked);
});

// URL Parser (Handles standard links, youtu.be, shorts, and timestamps)
function parseYouTubeUrl(url) {
    const idRegex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^&?\n]+)/;
    const match = url.match(idRegex);
    const id = (match && match[1].length === 11) ? match[1] : null;

    let start = 0;
    const timeMatch = url.match(/[?&](?:t|start)=([0-9hms]+)/);
    if (timeMatch) {
        const t = timeMatch[1];
        if (!isNaN(t)) { 
            start = parseInt(t); 
        } else {
            const h = t.match(/(\d+)h/);
            const m = t.match(/(\d+)m/);
            const s = t.match(/(\d+)s/);
            if(h) start += parseInt(h[1]) * 3600;
            if(m) start += parseInt(m[1]) * 60;
            if(s) start += parseInt(s[1]);
        }
    }
    return { id, start };
}

// Input Handling
function processInput() {
    const inputUrl = urlInput.value.trim();
    if(!inputUrl) {
        triggerError();
        return showToast("Please paste a link first!");
    }

    const videoData = parseYouTubeUrl(inputUrl);
    if (videoData.id) {
        playVideo(videoData.id, videoData.start, true);
        urlInput.value = ''; 
    } else {
        triggerError();
        showToast("Invalid YouTube URL.");
    }
}

// Trigger Shake Animation
function triggerError() {
    searchBox.classList.remove('error-shake');
    void searchBox.offsetWidth; // Trigger reflow
    searchBox.classList.add('error-shake');
}

// Allow pressing Enter to search
urlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') processInput();
});

// Main Player Logic
function playVideo(videoId, startTime = 0, updateUrl = true) {
    currentVideoId = videoId;
    currentStartTime = startTime;
    
    const shouldAutoplay = autoplayToggle.checked ? 1 : 0;
    
    let embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${shouldAutoplay}`;
    if (startTime > 0) embedUrl += `&start=${startTime}`;
    
    iframe.src = embedUrl;
    iframe.style.display = 'block';
    emptyState.style.display = 'none';
    
    if(isAudioOnly) toggleBackgroundPlayback();
    
    saveToHistory(videoId);
    loadHistoryUI();

    if (updateUrl) {
        let newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?v=' + videoId;
        if (startTime > 0) newUrl += `&t=${startTime}`;
        window.history.pushState({path: newUrl}, '', newUrl);
    }
}

// Controls Logic
function toggleTheaterMode() {
    if (!iframe.src) return showToast("Load a video to enter Theater Mode");
    isTheater = !isTheater;
    const icon = document.getElementById('theater-icon');
    
    if (isTheater) {
        mainContainer.classList.add('theater-active');
        icon.textContent = "close_fullscreen";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        mainContainer.classList.remove('theater-active');
        icon.textContent = "width_full";
    }
}

function toggleBackgroundPlayback() {
    if (!iframe.src) return showToast("Load a video first!");
    
    isAudioOnly = !isAudioOnly;
    const btnText = document.getElementById('bg-text');
    const btnIcon = document.getElementById('bg-icon');

    if (isAudioOnly) {
        iframe.classList.add('audio-only-mode');
        emptyState.style.display = 'flex';
        emptyState.style.background = 'var(--bg-dark)';
        emptyState.innerHTML = '<span class="material-symbols-rounded pulse" style="color: var(--primary-cyan);">graphic_eq</span><h3>Audio Playing</h3><p style="margin:0; font-size:0.9rem;">Screen hidden to save battery & distraction</p>';
        
        btnText.textContent = "Show Video";
        btnIcon.textContent = "visibility";
        showToast("Background mode active");
    } else {
        iframe.classList.remove('audio-only-mode');
        emptyState.style.display = 'none';
        emptyState.style.background = 'var(--surface)';
        
        btnText.textContent = "Background Play";
        btnIcon.textContent = "headphones";
    }
}

function requestFloatingWindow() {
    if (!iframe.src) return showToast("Load a video first!");
    showToast("Right-click the video twice, then click 'Picture in picture'", 5000);
}

function shareCurrentVideo() {
    if (!currentVideoId) return showToast("Load a video first to share!");
    
    let shareUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?v=' + currentVideoId;
    if (currentStartTime > 0) shareUrl += `&t=${currentStartTime}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("Link copied to clipboard!");
    }).catch(err => {
        showToast("Failed to copy link.");
    });
}

// Local History Logic
function saveToHistory(videoId) {
    let history = JSON.parse(localStorage.getItem('pawTubeHistory')) || [];
    history = history.filter(id => id !== videoId); 
    history.unshift(videoId); 
    if (history.length > 8) history.pop(); 
    localStorage.setItem('pawTubeHistory', JSON.stringify(history));
}

function loadHistoryUI() {
    const history = JSON.parse(localStorage.getItem('pawTubeHistory')) || [];
    const container = document.getElementById('history-container');
    const list = document.getElementById('history-list');
    
    if (history.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    list.innerHTML = '';

    history.forEach((id, index) => {
        const card = document.createElement('div');
        card.className = 'history-card';
        // Add staggered animation delay
        card.style.animationDelay = `${index * 0.1}s`;
        
        card.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            playVideo(id, 0, true);
        };
        
        card.innerHTML = `
            <img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt="Video Thumbnail" loading="lazy">
            <div class="play-overlay">
                <span class="material-symbols-rounded">play_arrow</span>
            </div>
        `;
        list.appendChild(card);
    });
}

function clearHistory() {
    if(confirm("Are you sure you want to clear your watch history?")) {
        localStorage.removeItem('pawTubeHistory');
        loadHistoryUI();
        showToast("History cleared.");
    }
}
