let currentSessionId = null;
let currentMessages = [];
let models = [];
let settings = {
    systemPrompt: 'أنت مساعد ذكي ومتعاون، تدعى "علّامة". تجيب باللغة العربية بشكل افتراضي.',
    temperature: 0.7,
    toolsEnabled: true,
    streamEnabled: true,
    thinkingEnabled: true
};
let selectedImageBase64 = null;
let isDarkMode = false;
let longPressTimer = null;
let selectedMessageData = null;
let chatAbortController = null;
let isGenerating = false;

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const modelSelect = document.getElementById('model-select');
const sessionList = document.getElementById('session-list');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const sendBtn = document.getElementById('send-btn');
const imageBtn = document.getElementById('image-btn');
const tempRange = document.getElementById('temp-range');
const tempVal = document.getElementById('temp-val');

async function init() {
    loadSettings();
    applyDarkMode();
    await fetchModels();
    await fetchSessions();
    userInput.addEventListener('input', autoResizeTextarea);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    tempRange.addEventListener('input', (e) => { tempVal.textContent = e.target.value; });
    modelSelect.addEventListener('change', checkVisionSupport);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#context-menu')) hideContextMenu();
    });
}

async function fetchModels() {
    try {
        const res = await fetch('/api/models');
        const data = await res.json();
        models = data.models || [];
        renderModelSelect();
    } catch (err) { console.error('Error fetching models:', err); }
}

function renderModelSelect() {
    modelSelect.innerHTML = models.map(m => `<option value="${m.name}">${m.name}</option>`).join('') + '<option value="custom">إضافة...</option>';
    const defaultModels = ['gemma3:latest', 'gemma3:270m', 'qwen2.5:latest', 'llama3:latest'];
    for (const def of defaultModels) {
        if (models.find(m => m.name === def)) { modelSelect.value = def; break; }
    }
    checkVisionSupport();
}

async function fetchSessions() {
    try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        renderSessionList(data);
    } catch (err) { console.error('Error fetching sessions:', err); }
}

function renderSessionList(sessions) {
    sessionList.innerHTML = sessions.map(s => `
        <div class="flex items-center group px-2">
            <button onclick="loadSession('${s.id}')" class="flex-1 text-right p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-900 truncate transition-all ${currentSessionId === s.id ? 'bg-black text-white dark:bg-white dark:text-black font-bold' : 'text-gray-600 dark:text-gray-400'}">
                <i class="far fa-comment-alt ml-2"></i> ${s.title || 'محادثة جديدة'}
            </button>
            <button onclick="deleteSession('${s.id}')" class="p-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

async function newChat() {
    currentSessionId = 'session_' + Date.now();
    currentMessages = [];
    renderMessages();
    await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentSessionId, title: 'محادثة جديدة' })
    });
    await fetchSessions();
    toggleSidebar(false);
}

async function loadSession(id) {
    currentSessionId = id;
    const res = await fetch(`/api/sessions/${id}/messages`);
    currentMessages = await res.json();
    renderMessages();
    await fetchSessions();
    toggleSidebar(false);
}

async function deleteSession(id) {
    if (!confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return;
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    if (currentSessionId === id) { currentSessionId = null; currentMessages = []; renderMessages(); }
    await fetchSessions();
}

async function sendMessage() {
    if (isGenerating) {
        stopResponse();
        return;
    }

    const text = userInput.value.trim();
    if (!text && !selectedImageBase64) return;
    if (!currentSessionId) await newChat();

    isGenerating = true;
    updateSendButtonUI();

    const userMsg = {
        role: 'user',
        content: text,
        images: selectedImageBase64 ? [selectedImageBase64.split(',')[1]] : null
    };

    const displayMsg = { ...userMsg, content: text, images: selectedImageBase64 ? [selectedImageBase64] : null };
    currentMessages.push(displayMsg);
    renderMessages();
    userInput.value = '';
    autoResizeTextarea();
    removeImage();

    // Save User Message
    const userRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, role: 'user', content: text, images: userMsg.images ? JSON.stringify(userMsg.images) : null })
    });
    const savedUserMsg = await userRes.json();
    displayMsg.id = savedUserMsg.id;

    if (currentMessages.length === 1 || (currentMessages.length === 2 && currentMessages[0].role === 'user')) {
        const title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        await fetch(`/api/sessions/${currentSessionId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
        await fetchSessions();
    }

    try {
        chatAbortController = new AbortController();
        const aiMsgIndex = currentMessages.length;
        currentMessages.push({ role: 'assistant', content: '', loading: true });
        renderMessages();

        const messagesForApi = [];
        if (settings.systemPrompt) messagesForApi.push({ role: 'system', content: settings.systemPrompt });
        const history = currentMessages.slice(0, aiMsgIndex).map(m => ({
            role: m.role,
            content: m.content,
            images: m.images ? (typeof m.images === 'string' ? JSON.parse(m.images) : m.images.map(img => img.includes(',') ? img.split(',')[1] : img)) : undefined
        }));
        messagesForApi.push(...history);

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: chatAbortController.signal,
            body: JSON.stringify({
                sessionId: currentSessionId,
                model: modelSelect.value,
                messages: messagesForApi,
                options: { temperature: parseFloat(settings.temperature) },
                toolsEnabled: settings.toolsEnabled,
                stream: settings.streamEnabled
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'حدث خطأ');
        }

        if (settings.streamEnabled) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let aiContent = "";
            currentMessages[aiMsgIndex].loading = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.message && json.message.content) {
                            aiContent += json.message.content;
                            currentMessages[aiMsgIndex].content = aiContent;
                            renderMessages();
                        }
                    } catch (e) {}
                }
            }
            const aiSaveRes = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: currentSessionId, role: 'assistant', content: aiContent })
            });
            const savedAiMsg = await aiSaveRes.json();
            currentMessages[aiMsgIndex].id = savedAiMsg.id;
        } else {
            const data = await res.json();
            if (data.message) {
                currentMessages[aiMsgIndex] = { ...data.message, loading: false };
                renderMessages();
                // Fetch last message to get its ID (since backend saves it)
                const lastMsgsRes = await fetch(`/api/sessions/${currentSessionId}/messages`);
                const lastMsgs = await lastMsgsRes.json();
                if (lastMsgs.length > 0) currentMessages[aiMsgIndex].id = lastMsgs[lastMsgs.length - 1].id;
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Request aborted');
        } else {
            console.error('Chat error:', err);
            if (currentMessages[currentMessages.length - 1].loading) currentMessages.pop();
            appendErrorMessage(err.message || 'خطأ في الاتصال');
        }
    } finally {
        isGenerating = false;
        chatAbortController = null;
        updateSendButtonUI();
    }
}

function stopResponse() {
    if (chatAbortController) {
        chatAbortController.abort();
        isGenerating = false;
        chatAbortController = null;
        if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].loading) {
            currentMessages.pop();
            renderMessages();
        }
        updateSendButtonUI();
    }
}

function updateSendButtonUI() {
    const icon = sendBtn.querySelector('i');
    if (isGenerating) {
        icon.classList.replace('fa-paper-plane', 'fa-stop');
        sendBtn.classList.add('bg-red-500');
        sendBtn.classList.remove('bg-black', 'dark:bg-white');
    } else {
        icon.classList.replace('fa-stop', 'fa-paper-plane');
        sendBtn.classList.remove('bg-red-500');
        sendBtn.classList.add('bg-black', 'dark:bg-white');
    }
}

function renderMessages() {
    if (currentMessages.length === 0) {
        chatMessages.innerHTML = `<div class="flex justify-center items-center h-full text-gray-300 dark:text-zinc-800"><div class="text-center"><i class="fas fa-terminal text-8xl mb-4"></i><p class="text-2xl font-bold italic">ALLAMA</p></div></div>`;
        return;
    }
    chatMessages.innerHTML = currentMessages.map((msg, index) => {
        if (msg.role === 'tool') return '';
        if (msg.role === 'assistant' && msg.content && msg.content.startsWith('[{"function":')) {
            return `<div class="flex justify-start"><div class="max-w-[85%] text-gray-400 text-xs italic"><i class="fas fa-cog fa-spin ml-1"></i> جاري استخدام الأدوات...</div></div>`;
        }
        const isUser = msg.role === 'user';
        let contentHtml = '';
        if (msg.loading) {
            contentHtml = `<div class="flex items-center space-x-2 py-2"><div class="dot-flashing"></div></div>`;
        } else {
            let content = msg.content || '';
            let thinking = '';
            if (settings.thinkingEnabled) {
                const thoughtMatch = content.match(/<(thought|think)>([\s\S]*?)<\/(thought|think)>/);
                if (thoughtMatch) {
                    thinking = `<div class="thinking-block">${marked.parse(thoughtMatch[2])}</div>`;
                    content = content.replace(/<(thought|think)>([\s\S]*?)<\/(thought|think)>/, '');
                }
            } else { content = content.replace(/<(thought|think)>([\s\S]*?)<\/(thought|think)>/g, ''); }
            contentHtml = thinking + DOMPurify.sanitize(marked.parse(content));
        }
        let imagesHtml = '';
        if (msg.images) {
            const imgs = typeof msg.images === 'string' ? JSON.parse(msg.images) : msg.images;
            imagesHtml = `<div class="flex gap-2 mb-2 flex-wrap">${imgs.map(img => `<img src="${img.startsWith('data:') ? img : 'data:image/jpeg;base64,' + img}" class="h-40 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">`).join('')}</div>`;
        }
        return `
            <div class="flex ${isUser ? 'justify-start' : 'justify-end'} group">
                <div
                    onmousedown="startLongPress(event, ${index})"
                    ontouchstart="startLongPress(event, ${index})"
                    onmouseup="cancelLongPress()"
                    ontouchend="cancelLongPress()"
                    class="message-bubble ${isUser ? 'user-message-bubble bg-black text-white dark:bg-white dark:text-black rounded-2xl rounded-bl-none shadow-md' : 'ai-message-bubble bg-white text-gray-900 dark:bg-zinc-900 dark:text-gray-100 border border-gray-100 dark:border-zinc-800 rounded-2xl rounded-br-none'} max-w-[90%] md:max-w-[80%] cursor-pointer active:scale-[0.98] transition-transform p-4">
                    ${imagesHtml}
                    <div class="markdown-content text-sm md:text-base leading-relaxed">
                        ${isUser ? escapeHtml(msg.content) : contentHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    document.querySelectorAll('pre code').forEach((el) => hljs.highlightElement(el));
}

function appendErrorMessage(text) {
    chatMessages.innerHTML += `<div class="flex justify-center"><div class="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl px-4 py-2 text-sm">${text}</div></div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function toggleSidebar(show) {
    if (show === undefined) { const isHidden = sidebar.classList.contains('translate-x-full'); toggleSidebar(isHidden); }
    else if (show) { sidebar.classList.remove('translate-x-full'); sidebarOverlay.classList.remove('hidden'); }
    else { sidebar.classList.add('translate-x-full'); sidebarOverlay.classList.add('hidden'); }
}

function autoResizeTextarea() {
    userInput.style.height = 'auto'; userInput.style.height = (userInput.scrollHeight) + 'px';
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode; applyDarkMode(); localStorage.setItem('darkMode', isDarkMode);
}

function applyDarkMode() {
    if (isDarkMode) { document.documentElement.classList.add('dark'); document.getElementById('dark-mode-icon').classList.replace('fa-moon', 'fa-sun'); }
    else { document.documentElement.classList.remove('dark'); document.getElementById('dark-mode-icon').classList.replace('fa-sun', 'fa-moon'); }
}

function checkVisionSupport() {
    const visionModels = ['gemma3', 'llava', 'moondream', 'qwen2-vl', 'bakllava'];
    const currentModel = modelSelect.value.toLowerCase();
    const supportsVision = visionModels.some(vm => currentModel.includes(vm));
    imageBtn.disabled = !supportsVision;
}

function triggerImageUpload() { document.getElementById('image-input').click(); }

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => { selectedImageBase64 = e.target.result; previewImg.src = selectedImageBase64; imagePreview.classList.remove('hidden'); };
        reader.readAsDataURL(file);
    }
}

function removeImage() { selectedImageBase64 = null; imagePreview.classList.add('hidden'); document.getElementById('image-input').value = ''; }

function openSettings() {
    document.getElementById('system-prompt').value = settings.systemPrompt;
    document.getElementById('temp-range').value = settings.temperature;
    document.getElementById('temp-val').textContent = settings.temperature;
    document.getElementById('stream-enabled').checked = settings.streamEnabled;
    document.getElementById('thinking-enabled').checked = settings.thinkingEnabled;
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); }

function saveSettings() {
    settings.systemPrompt = document.getElementById('system-prompt').value;
    settings.temperature = document.getElementById('temp-range').value;
    settings.streamEnabled = document.getElementById('stream-enabled').checked;
    settings.thinkingEnabled = document.getElementById('thinking-enabled').checked;
    localStorage.setItem('allamaSettings', JSON.stringify(settings));
    closeSettings();
}

function loadSettings() {
    const saved = localStorage.getItem('allamaSettings');
    if (saved) settings = { ...settings, ...JSON.parse(saved) };
    const savedDark = localStorage.getItem('darkMode');
    if (savedDark !== null) isDarkMode = savedDark === 'true';
}

async function addNewModel() {
    const name = document.getElementById('new-model-name').value.trim();
    if (name) {
        models.push({ name, size: 0 }); renderModelSelect();
        modelSelect.value = name; document.getElementById('new-model-name').value = '';
        checkVisionSupport();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div'); div.textContent = text; return div.innerHTML;
}

// Long Press & Context Menu Logic
function startLongPress(e, index) {
    cancelLongPress();
    selectedMessageData = { index, event: e };
    longPressTimer = setTimeout(() => {
        showContextMenu(e, index);
    }, 600);
}

function cancelLongPress() {
    if (longPressTimer) clearTimeout(longPressTimer);
}

function showContextMenu(e, index) {
    const menu = document.getElementById('context-menu');
    const msg = currentMessages[index];
    if (!msg) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');
    e.preventDefault();
}

function hideContextMenu() {
    document.getElementById('context-menu').classList.add('hidden');
}

async function copyMessage() {
    if (selectedMessageData === null) return;
    const msg = currentMessages[selectedMessageData.index];
    if (msg) await navigator.clipboard.writeText(msg.content);
    hideContextMenu();
}

async function deleteMessageUI() {
    if (selectedMessageData === null) return;
    const index = selectedMessageData.index;
    const msg = currentMessages[index];
    if (confirm('هل تريد حذف هذه الرسالة؟')) {
        currentMessages.splice(index, 1);
        renderMessages();
        if (currentSessionId && msg.id) {
            await fetch(`/api/messages/${currentSessionId}/${msg.id}`, { method: 'DELETE' });
        }
    }
    hideContextMenu();
}

init();
