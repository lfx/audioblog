// Admin Dashboard Logic for AudioBlog

const state = {
    mediaRecorder: null,
    audioChunks: [],
    audioBlob: null,
    audioUrl: null,
};

// UI Elements
const settingsLink = document.getElementById('settings-link');
const settingsSection = document.getElementById('settings-section');
const mainSection = document.getElementById('main-section');
const settingsForm = document.getElementById('settings-form');

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const recordingIndicator = document.getElementById('recording-indicator');
const audioPreview = document.getElementById('audio-preview');

const transcriptionSection = document.getElementById('transcription-section');
const transcribeBtn = document.getElementById('transcribe-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const editSection = document.getElementById('edit-section');
const postTitle = document.getElementById('post-title');
const postContent = document.getElementById('post-content');
const publishBtn = document.getElementById('publish-btn');

// --- Settings Management ---

function loadSettings() {
    document.getElementById('gemini-key').value = localStorage.getItem('gemini_key') || '';
    document.getElementById('github-pat').value = localStorage.getItem('github_pat') || '';
    document.getElementById('github-owner').value = localStorage.getItem('github_owner') || '';
    document.getElementById('github-repo').value = localStorage.getItem('github_repo') || '';
}

settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    settingsSection.classList.toggle('hidden');
    mainSection.classList.toggle('hidden');
});

settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_key', document.getElementById('gemini-key').value);
    localStorage.setItem('github_pat', document.getElementById('github-pat').value);
    localStorage.setItem('github_owner', document.getElementById('github-owner').value);
    localStorage.setItem('github_repo', document.getElementById('github-repo').value);
    alert('Settings saved!');
    settingsSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
});

// --- Audio Recording ---

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.mediaRecorder = new MediaRecorder(stream);
        state.audioChunks = [];

        state.mediaRecorder.ondataavailable = (e) => {
            state.audioChunks.push(e.data);
        };

        state.mediaRecorder.onstop = () => {
            state.audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
            state.audioUrl = URL.createObjectURL(state.audioBlob);
            audioPreview.src = state.audioUrl;
            audioPreview.classList.remove('hidden');
            transcriptionSection.classList.remove('hidden');
        };

        state.mediaRecorder.start();
        startBtn.disabled = true;
        stopBtn.disabled = false;
        recordingIndicator.classList.remove('hidden');
        audioPreview.classList.add('hidden');
        transcriptionSection.classList.add('hidden');
        editSection.classList.add('hidden');
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Could not access microphone. Please ensure you have granted permission.');
    }
});

stopBtn.addEventListener('click', () => {
    state.mediaRecorder.stop();
    state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    startBtn.disabled = false;
    stopBtn.disabled = true;
    recordingIndicator.classList.add('hidden');
});

// --- Gemini Transcription ---

transcribeBtn.addEventListener('click', async () => {
    const apiKey = localStorage.getItem('gemini_key');
    if (!apiKey) return alert('Please set your Gemini API Key in Settings.');

    loadingIndicator.classList.remove('hidden');
    transcribeBtn.disabled = true;

    try {
        const base64Audio = await blobToBase64(state.audioBlob);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Please transcribe this audio accurately. Suggest a short, catchy title for a blog post based on this content. Format your response as follows:\nTITLE: [Your suggested title]\nCONTENT: [The transcription]" },
                        {
                            inline_data: {
                                mime_type: "audio/webm",
                                data: base64Audio.split(',')[1]
                            }
                        }
                    ]
                }]
            })
        });

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        
        // Parse TITLE and CONTENT from Gemini's response
        const titleMatch = text.match(/TITLE:\s*(.*)/);
        const contentMatch = text.match(/CONTENT:\s*([\s\S]*)/);

        postTitle.value = titleMatch ? titleMatch[1].trim() : 'New Audio Post';
        postContent.value = contentMatch ? contentMatch[1].trim() : text;

        editSection.classList.remove('hidden');
    } catch (err) {
        console.error('Transcription error:', err);
        alert('Transcription failed. Check console for details.');
    } finally {
        loadingIndicator.classList.add('hidden');
        transcribeBtn.disabled = false;
    }
});

// --- GitHub Publishing ---

publishBtn.addEventListener('click', async () => {
    const pat = localStorage.getItem('github_pat');
    const owner = localStorage.getItem('github_owner');
    const repo = localStorage.getItem('github_repo');

    if (!pat || !owner || !repo) {
        return alert('Please complete GitHub settings (PAT, Owner, Repo) before publishing.');
    }

    publishBtn.disabled = true;
    publishBtn.innerText = 'Publishing...';

    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timestamp = now.getTime();
        const slug = postTitle.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const filenameBase = `${dateStr}-${slug || timestamp}`;
        
        const audioPath = `assets/audio/${filenameBase}.webm`;
        const postPath = `_posts/${filenameBase}.md`;

        // 1. Upload Audio File
        console.log('Uploading audio...');
        const audioBase64 = await blobToBase64(state.audioBlob);
        await uploadToGitHub(audioPath, audioBase64.split(',')[1], `Add audio for ${postTitle.value}`);

        // 2. Upload Markdown Post
        console.log('Uploading markdown...');
        const frontMatter = [
            '---',
            `layout: post`,
            `title: "${postTitle.value.replace(/"/g, '\\"')}"`,
            `date: ${now.toISOString()}`,
            `audio: /${audioPath}`,
            '---',
            '',
            postContent.value
        ].join('\n');

        const postBase64 = btoa(unescape(encodeURIComponent(frontMatter)));
        await uploadToGitHub(postPath, postBase64, `Add post: ${postTitle.value}`);

        alert('Published successfully!');
        window.location.reload();
    } catch (err) {
        console.error('Publishing error:', err);
        alert('Publishing failed: ' + err.message);
    } finally {
        publishBtn.disabled = false;
        publishBtn.innerText = 'Publish to Blog';
    }
});

async function uploadToGitHub(path, contentBase64, message) {
    const pat = localStorage.getItem('github_pat');
    const owner = localStorage.getItem('github_owner');
    const repo = localStorage.getItem('github_repo');
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // Check if file exists to get SHA (for updates, though we expect new files)
    let sha;
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `token ${pat}` }
        });
        if (res.ok) {
            const data = await res.json();
            sha = data.sha;
        }
    } catch (e) {}

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${pat}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message,
            content: contentBase64,
            sha: sha
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'GitHub API error');
    }
}

// --- Helper Functions ---


function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Initialize
loadSettings();
