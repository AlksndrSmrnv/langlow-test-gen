// ==================== CONFIG & CONSTANTS ====================
const STORAGE_KEY = 'testGeneratorFormData';
const FEEDBACK_DELAY = 2000;
const AUTOSAVE_DELAY = 500;
const LOADER_INTERVAL = 8000;

const LOADING_STATUSES = [
    ['Подготовка к генерации...', 'Инициализация процесса'],
    ['Анализируется чек-лист тестировщика', 'Извлечение ключевых пунктов'],
    ['Выполняется обращение к базе знаний', 'Поиск релевантной информации'],
    ['Идет чтение документации доработки', 'Анализ требований и спецификаций'],
    ['Формирование структуры тестов', 'Создание тестовых сценариев'],
    ['Генерация тестовых кейсов', 'Применение лучших практик'],
    ['Проверка полноты покрытия', 'Верификация всех требований'],
    ['Финализация результатов', 'Подготовка к отображению']
];

const ICONS = {
    copy: '📋 Копировать',
    copied: '✓ Скопировано',
    error: '✕ Ошибка',
    expand: '📂 Развернуть все',
    collapse: '📁 Свернуть все'
};

// DOM cache
const dom = {};
const domIds = [
    'settingsModal', 'settingsBtn', 'closeSettingsBtn', 'saveSettingsBtn',
    'exportSettingsBtn', 'importSettingsBtn', 'importSettingsFile',
    'featureList', 'addFeatureBtn', 'checklistUrl', 'langflowUrl',
    'agentChatLangflowUrl', 'jiraLangflowUrl',
    'apiKey', 'apiFormat', 'mockModeEnabled',
    'jiraConnectionUrl', 'jiraConnectionToken',
    'jiraConnectionUrlD', 'jiraConnectionTokenD',
    'jiraConnectionUrlS', 'jiraConnectionTokenS',
    'jiraTypeD', 'jiraTypeS',
    'confluenceToken', 'generateBtn', 'loader', 'loaderText',
    'loaderSubstatus', 'resultSection', 'testsSection', 'testsContainer',
    'testsCount', 'toggleAllBtn', 'jiraSection', 'selectedCount',
    'selectAllBtn', 'jiraProjectKey', 'jiraFolderName', 'jiraConfigurationElement', 'jiraTestType', 'btnSendJira',
    'jiraStatus', 'additionalChecksSection', 'additionalChecksContent',
    'plainTextSection', 'plainTextContent', 'copyPlainTextBtn',
    'errorSection', 'errorContent', 'agentChat', 'agentChatContext',
    'agentChatContextTest', 'agentChatWarning', 'agentChatMessages',
    'agentChatLoader', 'agentChatInput', 'agentChatSendBtn', 'autosave'
];

// State
let testsData = [];
let saveTimeout = null;
let statusInterval = null;
let currentAbortController = null;
let agentState = { selectedIndex: null, messages: [], processing: false };

// ==================== UTILS ====================
const $ = sel => document.querySelectorAll(sel);

const escapeHtml = str => str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[m]);

const md = text => {
    if (typeof marked === 'undefined') return escapeHtml(text);
    return marked.parse(text, { breaks: true });
};

const plural = (n, forms) => {
    const mod = [n % 10, n % 100];
    if (mod[0] === 1 && mod[1] !== 11) return forms[0];
    if (mod[0] >= 2 && mod[0] <= 4 && (mod[1] < 10 || mod[1] >= 20)) return forms[1];
    return forms[2];
};

const sessionId = () => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}_${Math.random().toString(36).slice(2, 10)}`;
};

const getSettings = () => ({
    url: dom.langflowUrl?.value.trim() || '',
    agentUrl: dom.agentChatLangflowUrl?.value.trim() || '',
    jiraUrl: dom.jiraLangflowUrl?.value.trim() || '',
    apiKey: dom.apiKey?.value.trim() || '',
    format: dom.apiFormat?.value || 'standard',
    mockMode: dom.mockModeEnabled?.checked || false
});

const buildBody = (data, format, sid) => {
    const base = { output_type: 'chat', input_type: 'chat', session_id: sid };
    if (format === 'inputs') return { ...base, inputs: { input_value: data } };
    if (format === 'message') return { ...base, message: data };
    return { ...base, input_value: data };
};

const headers = key => {
    const h = { 'Content-Type': 'application/json' };
    if (key) { h['Authorization'] = `Bearer ${key}`; h['x-api-key'] = key; }
    return h;
};

const headersXml = key => {
    const h = { 'Content-Type': 'application/xml' };
    if (key) { h['Authorization'] = `Bearer ${key}`; h['x-api-key'] = key; }
    return h;
};

const extractResponse = r =>
    r.outputs?.[0]?.outputs?.[0]?.results?.message?.text ||
    r.result || r.message || JSON.stringify(r, null, 2);

const scrollToBottom = container => {
    if (container) container.scrollTop = container.scrollHeight;
};

// ==================== STORAGE ====================
const showAutosave = () => {
    dom.autosave.classList.add('show');
    setTimeout(() => dom.autosave.classList.remove('show'), FEEDBACK_DELAY);
};

const saveForm = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const data = {
            features: Array.from($('.feature-input')).map(i => i.value.trim()),
            checklistUrl: dom.checklistUrl.value.trim(),
            langflowUrl: dom.langflowUrl.value.trim(),
            agentChatLangflowUrl: dom.agentChatLangflowUrl.value.trim(),
            jiraLangflowUrl: dom.jiraLangflowUrl.value.trim(),
            apiKey: dom.apiKey.value.trim(),
            apiFormat: dom.apiFormat.value,
            mockModeEnabled: dom.mockModeEnabled?.checked || false,
            jiraConnectionUrlD: dom.jiraConnectionUrlD?.value.trim() || '',
            jiraConnectionTokenD: dom.jiraConnectionTokenD?.value.trim() || '',
            jiraConnectionUrlS: dom.jiraConnectionUrlS?.value.trim() || '',
            jiraConnectionTokenS: dom.jiraConnectionTokenS?.value.trim() || '',
            jiraType: dom.jiraTypeD?.checked ? 'D' : 'S',
            confluenceToken: dom.confluenceToken?.value.trim() || '',
            jiraProjectKey: dom.jiraProjectKey.value.trim(),
            jiraFolderName: dom.jiraFolderName.value.trim(),
            jiraConfigurationElement: dom.jiraConfigurationElement?.value.trim() || '',
            jiraTestType: dom.jiraTestType?.value.trim() || ''
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        showAutosave();
    }, AUTOSAVE_DELAY);
};

const createFeatureItem = (url = '') => {
    const item = document.createElement('div');
    item.className = 'feature-item';

    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'feature-input';
    input.placeholder = 'https://confl.ru/pageid=1234';
    input.value = url;
    input.required = true;

    const btn = document.createElement('button');
    btn.className = 'btn btn-remove';
    btn.textContent = '✕';

    item.appendChild(input);
    item.appendChild(btn);
    return item;
};

const loadForm = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        const data = JSON.parse(saved);

        if (data.features?.length) {
            dom.featureList.innerHTML = '';
            data.features.forEach(url => {
                dom.featureList.appendChild(createFeatureItem(url));
            });
            updateRemoveBtns();
        }

        ['checklistUrl', 'langflowUrl', 'agentChatLangflowUrl', 'jiraLangflowUrl',
         'apiKey', 'apiFormat',
         'jiraConnectionUrlD', 'jiraConnectionTokenD',
         'jiraConnectionUrlS', 'jiraConnectionTokenS',
         'confluenceToken', 'jiraProjectKey', 'jiraFolderName',
         'jiraConfigurationElement', 'jiraTestType']
            .forEach(f => { if (data[f] && dom[f]) dom[f].value = data[f]; });

        // Restore checkbox state for mockModeEnabled
        if (data.mockModeEnabled !== undefined && dom.mockModeEnabled) {
            dom.mockModeEnabled.checked = data.mockModeEnabled;
            toggleMockIndicator(data.mockModeEnabled);
        }

        // Restore Jira type selection
        if (data.jiraType !== undefined) {
            if (data.jiraType === 'D' && dom.jiraTypeD) {
                dom.jiraTypeD.checked = true;
            } else if (data.jiraType === 'S' && dom.jiraTypeS) {
                dom.jiraTypeS.checked = true;
            }
        }

        // Update hidden fields based on selected Jira type
        updateJiraConnection();
    } catch (e) {
        console.error('Load error:', e);
    }
};

// Mock Mode indicator
const toggleMockIndicator = (show) => {
    let indicator = document.getElementById('mockModeIndicator');

    if (show && !indicator) {
        // Create indicator if it doesn't exist
        indicator = window.mockModeActive ? window.mockModeActive() : null;
        if (indicator) document.body.appendChild(indicator);
    } else if (!show && indicator) {
        // Remove indicator if it exists
        indicator.remove();
    }
};

// Update Jira connection based on selected type (D or S)
const updateJiraConnection = () => {
    if (!dom.jiraConnectionUrl || !dom.jiraConnectionToken) return;

    const isJiraD = dom.jiraTypeD?.checked;
    const jiraType = isJiraD ? 'D' : 'S';

    if (isJiraD) {
        // Use Jira D credentials
        dom.jiraConnectionUrl.value = dom.jiraConnectionUrlD?.value.trim() || '';
        dom.jiraConnectionToken.value = dom.jiraConnectionTokenD?.value.trim() || '';
    } else {
        // Use Jira S credentials
        dom.jiraConnectionUrl.value = dom.jiraConnectionUrlS?.value.trim() || '';
        dom.jiraConnectionToken.value = dom.jiraConnectionTokenS?.value.trim() || '';
    }

    // Update button text
    if (dom.btnSendJira) {
        dom.btnSendJira.textContent = `📤 Отправить выбранные тесты в Jira ${jiraType}`;
    }
};

// ==================== MODAL ====================
const openModal = () => {
    dom.settingsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

const closeModal = () => {
    dom.settingsModal.classList.remove('active');
    document.body.style.overflow = '';
    saveForm();
};

// ==================== SETTINGS EXPORT/IMPORT ====================
const exportSettings = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            alert('Нет настроек для экспорта');
            return;
        }

        const data = JSON.parse(saved);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `langlow-settings-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showAutosave();
    } catch (e) {
        console.error('Export error:', e);
        alert('Ошибка экспорта настроек');
    }
};

const importSettings = () => {
    dom.importSettingsFile.click();
};

const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            // Validate data structure
            if (typeof data !== 'object') throw new Error('Invalid settings format');

            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

            // Reload form with imported data
            loadForm();

            alert('Настройки успешно импортированы!');
            showAutosave();
        } catch (e) {
            console.error('Import error:', e);
            alert('Ошибка импорта настроек: некорректный формат файла');
        }
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
};

// ==================== TOKEN VISIBILITY TOGGLE ====================
const toggleTokenVisibility = (targetId) => {
    const input = document.getElementById(targetId);
    if (!input) return;

    const btn = document.querySelector(`[data-target="${targetId}"]`);
    if (!btn) return;

    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
        btn.title = 'Скрыть';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
        btn.title = 'Показать';
    }
};

// ==================== XML PARSING (DOMParser) ====================
const parseXML = xml => {
    const result = { tests: [], checks: [], checksRaw: '' };

    try {
        // Clean XML and wrap if needed
        let cleanXml = xml.trim();
        if (!cleanXml.startsWith('<?xml') && !cleanXml.startsWith('<')) {
            return result;
        }

        // Try DOMParser first
        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanXml, 'text/xml');

        // Check for parse errors
        const parseError = doc.querySelector('parsererror');
        if (!parseError) {
            // Parse tests
            const tests = doc.querySelectorAll('test');
            tests.forEach((test, idx) => {
                const id = test.getAttribute('name') || test.getAttribute('id') || `Тест ${idx + 1}`;
                const content = test.textContent.trim();
                if (content) result.tests.push({ id, content });
            });

            // Parse additional checks
            const addChecks = doc.querySelector('additional_checks');
            if (addChecks) {
                const checks = addChecks.querySelectorAll('check');
                checks.forEach(check => {
                    const id = check.getAttribute('name') || check.getAttribute('id') || 'Проверка';
                    const content = check.textContent.trim();
                    if (content) result.checks.push({ id, content });
                });

                if (!result.checks.length) {
                    const raw = addChecks.textContent.trim();
                    if (raw) result.checksRaw = raw;
                }
            }

            if (result.tests.length || result.checks.length || result.checksRaw) {
                return result;
            }
        }
    } catch (e) {
        console.warn('DOMParser failed, trying regex:', e);
    }

    // Fallback to regex for malformed XML
    const testRe = /<test[^>]*(?:name|id)\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)(?:<\/test>|(?=<test)|(?=<\/tests>)|(?=<additional_checks>)|$)/gi;
    let m;

    while ((m = testRe.exec(xml)) !== null) {
        const content = m[2].trim().replace(/<\/?tests>/gi, '').trim();
        if (content && !content.startsWith('<additional_checks')) {
            result.tests.push({ id: m[1], content });
        }
    }

    if (!result.tests.length) {
        const simpleRe = /<test[^>]*>([\s\S]*?)(?:<\/test>|(?=<test)|(?=<\/tests>)|(?=<additional_checks>))/gi;
        let idx = 1;
        while ((m = simpleRe.exec(xml)) !== null) {
            const content = m[1].trim().replace(/<\/?tests>/gi, '').trim();
            if (content && !content.startsWith('<additional_checks')) {
                result.tests.push({ id: `Тест ${idx++}`, content });
            }
        }
    }

    const addMatch = xml.match(/<additional_checks[^>]*>([\s\S]*?)(?:<\/additional_checks>|$)/i);
    if (addMatch) {
        const checkRe = /<check[^>]*(?:name|id)\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)(?:<\/check>|(?=<check)|(?=<\/additional_checks>)|$)/gi;
        while ((m = checkRe.exec(addMatch[1])) !== null) {
            const content = m[2].trim();
            if (content) result.checks.push({ id: m[1], content });
        }
        if (!result.checks.length) {
            const clean = addMatch[1].replace(/<\/?check[^>]*>/gi, '').trim();
            if (clean) result.checksRaw = clean;
        }
    }

    return result;
};

// ==================== CARDS ====================
const createCard = (test, idx, isCheck = false) => {
    const card = document.createElement('div');
    card.className = isCheck ? 'card check-card' : 'card collapsed';
    card.dataset.idx = idx;

    const header = document.createElement('div');
    header.className = 'card-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'card-header-left';

    if (!isCheck) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'card-checkbox';
        checkbox.dataset.idx = idx;
        headerLeft.appendChild(checkbox);
    }

    const cardId = document.createElement('div');
    cardId.className = isCheck ? 'card-id warning' : 'card-id';
    cardId.textContent = test.id;
    headerLeft.appendChild(cardId);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-outline';
    copyBtn.dataset.copy = idx;
    copyBtn.textContent = ICONS.copy;

    header.appendChild(headerLeft);
    header.appendChild(copyBtn);

    const content = document.createElement('div');
    content.className = 'card-content';
    content.innerHTML = md(test.content);

    card.appendChild(header);
    card.appendChild(content);

    return card;
};

const updateCard = (idx, content) => {
    const card = document.querySelector(`.card[data-idx="${idx}"]`);
    if (card) card.querySelector('.card-content').innerHTML = md(content);
};

// ==================== FEATURES ====================
const addFeature = () => {
    dom.featureList.appendChild(createFeatureItem());
    updateRemoveBtns();
    saveForm();
};

const removeFeature = btn => {
    btn.closest('.feature-item').remove();
    updateRemoveBtns();
    saveForm();
};

const updateRemoveBtns = () => {
    const items = $('.feature-item');
    const display = items.length > 1 ? 'block' : 'none';
    items.forEach(item => {
        const btn = item.querySelector('.btn-remove');
        if (btn) btn.style.display = display;
    });
};

// ==================== SELECTION ====================
const updateSelection = () => {
    const checked = Array.from($('.card-checkbox:checked'));
    const count = checked.length;

    dom.selectedCount.textContent = `Выбрано: ${count} ${plural(count, ['тест', 'теста', 'тестов'])}`;

    if (testsData.length) dom.jiraSection.classList.add('active');

    // Agent chat state
    if (testsData.length) {
        dom.agentChat.classList.add('active');
        dom.agentChatInput.disabled = false;
    }

    if (count === 0) {
        dom.agentChatContext.classList.remove('active');
        dom.agentChatWarning.classList.remove('active');
        dom.agentChatSendBtn.disabled = true;
        agentState.selectedIndex = null;
    } else if (count === 1) {
        const idx = parseInt(checked[0].dataset.idx);
        agentState.selectedIndex = idx;
        dom.agentChatContext.classList.add('active');
        dom.agentChatWarning.classList.remove('active');
        dom.agentChatContextTest.textContent = testsData[idx].id;
        dom.agentChatSendBtn.disabled = false;
    } else {
        dom.agentChatContext.classList.remove('active');
        dom.agentChatWarning.classList.add('active');
        dom.agentChatSendBtn.disabled = true;
        agentState.selectedIndex = null;
    }
};

const selectAll = () => {
    const boxes = $('.card-checkbox');
    const allChecked = Array.from(boxes).every(cb => cb.checked);
    boxes.forEach(cb => {
        cb.checked = !allChecked;
        cb.closest('.card').classList.toggle('selected', !allChecked);
    });
    updateSelection();
};

const toggleAll = () => {
    const cards = $('.card[data-idx]');
    const allCollapsed = Array.from(cards).every(c => c.classList.contains('collapsed'));
    cards.forEach(c => c.classList.toggle('collapsed', !allCollapsed));
    dom.toggleAllBtn.textContent = allCollapsed ? ICONS.collapse : ICONS.expand;
};

// ==================== AGENT CHAT ====================
const addMessage = (text, isUser) => {
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const msg = document.createElement('div');
    msg.className = `agent-message ${isUser ? 'user' : 'agent'}`;

    const avatar = document.createElement('div');
    avatar.className = 'agent-message-avatar';
    avatar.textContent = isUser ? '👤' : '🤖';

    const content = document.createElement('div');
    content.className = 'agent-message-content';

    const textEl = document.createElement('p');
    textEl.className = 'agent-message-text';
    textEl.textContent = text;

    const timeEl = document.createElement('div');
    timeEl.className = 'agent-message-time';
    timeEl.textContent = time;

    content.appendChild(textEl);
    content.appendChild(timeEl);
    msg.appendChild(avatar);
    msg.appendChild(content);

    dom.agentChatMessages.appendChild(msg);
    scrollToBottom(dom.agentChatMessages.closest('.agent-chat-body'));
    agentState.messages.push({ text, isUser, time: new Date().toISOString() });
};

const sendAgentMsg = async () => {
    const msg = dom.agentChatInput.value.trim();
    if (!msg || agentState.selectedIndex === null || agentState.processing) return;

    const test = testsData[agentState.selectedIndex];
    const settings = getSettings();

    addMessage(msg, true);
    dom.agentChatInput.value = '';

    dom.agentChatLoader.classList.add('active');
    dom.agentChatSendBtn.disabled = true;
    agentState.processing = true;

    try {
        let response;

        // Mock Mode: использовать заглушку вместо реального API
        if (settings.mockMode && window.mockFetch) {
            console.log('🎭 Mock Mode: Using mock data for agent chat');
            const mockData = await window.mockFetch('agent', {
                originalTest: test.content,
                userMessage: msg
            });
            response = extractResponse(mockData);
        } else {
            // Реальный API запрос
            if (!settings.agentUrl) throw new Error('Укажите URL Langflow для чата с агентом в настройках');

            const prompt = `Текущий тест:\n\n${test.content}\n\n---\n\nЗапрос на изменение: ${msg}\n\nВерни обновленную версию теста целиком в markdown формате. Не добавляй никаких дополнительных комментариев, только сам тест.`;

            const res = await fetch(settings.agentUrl, {
                method: 'POST',
                headers: headers(settings.apiKey),
                body: JSON.stringify(buildBody(prompt, settings.format, sessionId()))
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

            response = extractResponse(await res.json());
        }

        testsData[agentState.selectedIndex].content = response;
        updateCard(agentState.selectedIndex, response);
        addMessage('Тест успешно обновлен!', false);

    } catch (e) {
        console.error('Agent error:', e);
        addMessage(`Ошибка: ${e.message}`, false);
    } finally {
        dom.agentChatLoader.classList.remove('active');
        dom.agentChatSendBtn.disabled = false;
        agentState.processing = false;
    }
};

const resetAgent = () => {
    agentState = { selectedIndex: null, messages: [], processing: false };
    dom.agentChatMessages.innerHTML = '';
    dom.agentChatContext.classList.remove('active');
    dom.agentChatWarning.classList.remove('active');
    dom.agentChatInput.value = '';
};

// ==================== COPY ====================
const copy = async (content, btn) => {
    if (btn.dataset.copying) return;
    btn.dataset.copying = 'true';

    const orig = btn.textContent;
    try {
        await navigator.clipboard.writeText(content);
        btn.textContent = ICONS.copied;
        btn.classList.add('copied');
    } catch {
        btn.textContent = ICONS.error;
    }

    setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('copied');
        delete btn.dataset.copying;
    }, FEEDBACK_DELAY);
};

// ==================== RESULTS ====================
const showResults = data => {
    dom.errorSection.style.display = 'none';
    dom.plainTextSection.style.display = 'none';
    dom.testsContainer.innerHTML = '';
    dom.additionalChecksContent.innerHTML = '';
    dom.testsSection.style.display = 'none';
    dom.additionalChecksSection.style.display = 'none';

    testsData = data.tests;

    if (data.tests.length) {
        dom.testsSection.style.display = 'block';
        dom.testsCount.textContent = `${data.tests.length} ${plural(data.tests.length, ['тест', 'теста', 'тестов'])}`;
        data.tests.forEach((t, i) => dom.testsContainer.appendChild(createCard(t, i)));
        dom.toggleAllBtn.textContent = ICONS.expand;
        dom.jiraSection.classList.add('active');
        updateSelection();
    }

    if (data.checks.length || data.checksRaw) {
        dom.additionalChecksSection.style.display = 'block';
        if (data.checks.length) {
            const grid = document.createElement('div');
            grid.className = 'additional-checks-grid';
            data.checks.forEach((c, i) => grid.appendChild(createCard(c, i, true)));
            dom.additionalChecksContent.appendChild(grid);
        } else {
            dom.additionalChecksContent.innerHTML = md(data.checksRaw);
        }
    }

    dom.resultSection.classList.add('active');
};

const showPlainText = text => {
    dom.testsSection.style.display = 'none';
    dom.additionalChecksSection.style.display = 'none';
    dom.errorSection.style.display = 'none';
    dom.plainTextSection.style.display = 'block';
    dom.plainTextContent.dataset.raw = text;
    dom.plainTextContent.innerHTML = md(text);
    dom.resultSection.classList.add('active');
};

// ==================== JIRA (Parallel requests) ====================
const sendJira = async () => {
    const projectKey = dom.jiraProjectKey.value.trim();
    const folderName = dom.jiraFolderName.value.trim();
    const settings = getSettings();

    if (!projectKey) return alert('Укажите Project Key');
    if (!folderName) return alert('Укажите название папки');
    if (!settings.jiraUrl) return alert('Укажите URL Langflow для отправки в JIRA');

    const selected = Array.from($('.card-checkbox:checked')).map(cb => testsData[parseInt(cb.dataset.idx)]);
    if (!selected.length) return alert('Выберите хотя бы один тест для отправки');

    dom.btnSendJira.disabled = true;
    dom.btnSendJira.textContent = '⏳ Отправка...';
    dom.jiraStatus.innerHTML = '';
    dom.jiraStatus.className = 'jira-status';

    // Get Jira connection settings
    const jiraConnectionUrl = dom.jiraConnectionUrl?.value.trim() || '';
    const jiraConnectionToken = dom.jiraConnectionToken?.value.trim() || '';
    const jiraConfigurationElement = dom.jiraConfigurationElement?.value.trim() || '';
    const jiraTestType = dom.jiraTestType?.value.trim() || '';

    // Send all requests in parallel
    const results = await Promise.all(selected.map(async test => {
        try {
            const xmlData = buildJiraXML(
                projectKey,
                folderName,
                test.id,
                test.content,
                jiraConnectionUrl,
                jiraConnectionToken,
                jiraConfigurationElement,
                jiraTestType
            );

            // Mock Mode: использовать заглушку вместо реального API
            if (settings.mockMode && window.mockFetch) {
                console.log('🎭 Mock Mode: Using mock data for JIRA export');
                await window.mockFetch('jira', { xmlData });
                return {
                    ok: true,
                    name: test.id,
                    msg: 'Успешно отправлено (Mock Mode)'
                };
            } else {
                // Реальный API запрос
                const res = await fetch(settings.jiraUrl, {
                    method: 'POST',
                    headers: headers(settings.apiKey),
                    body: JSON.stringify(buildBody(xmlData, settings.format, sessionId()))
                });
                return {
                    ok: res.ok,
                    name: test.id,
                    msg: res.ok ? 'Успешно отправлено' : `Ошибка ${res.status}: ${await res.text()}`
                };
            }
        } catch (e) {
            return { ok: false, name: test.id, msg: e.message };
        }
    }));

    const ok = results.filter(r => r.ok).length;
    const err = results.filter(r => !r.ok).length;

    dom.jiraStatus.className = err ? 'jira-status error' : 'jira-status success';

    const jiraType = dom.jiraTypeD?.checked ? 'D' : 'S';
    const statusHeader = document.createElement('div');
    statusHeader.style.cssText = 'font-size: 1.1em; margin-bottom: 10px;';
    statusHeader.textContent = err
        ? `⚠️ Отправлено: ${ok}, Ошибок: ${err}`
        : `✓ Все тесты успешно отправлены в Jira ${jiraType}!`;
    dom.jiraStatus.appendChild(statusHeader);

    results.forEach(r => {
        const item = document.createElement('div');
        item.className = 'jira-status-item';

        const strong = document.createElement('strong');
        strong.textContent = `${r.name}: `;

        item.appendChild(strong);
        item.appendChild(document.createTextNode(`${r.ok ? '✓' : '✕'} ${r.msg}`));
        dom.jiraStatus.appendChild(item);
    });

    dom.btnSendJira.disabled = false;
    dom.btnSendJira.textContent = '📤 Отправить выбранные тесты в Jira D';
};

// ==================== GENERATE ====================
const buildXML = () => {
    const features = Array.from($('.feature-input')).map(i => i.value.trim()).filter(Boolean);
    const checklist = dom.checklistUrl.value.trim();
    const confluenceToken = dom.confluenceToken?.value.trim() || '';

    if (!features.length) throw new Error('Добавьте хотя бы одну страницу с описанием фичи');
    if (!checklist) throw new Error('Укажите ссылку на чек-лист');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<test_generation>\n`;
    xml += features.map(f => `  <feature>${escapeHtml(f)}</feature>`).join('\n') + '\n';
    xml += `  <checklist>${escapeHtml(checklist)}</checklist>\n`;
    if (confluenceToken) xml += `  <confluence_token>${escapeHtml(confluenceToken)}</confluence_token>\n`;
    xml += `</test_generation>`;

    return xml;
};

const buildJiraXML = (projectKey, folderName, testName, testContent, jiraUrl, jiraToken, configurationElement, testType) => {
    let xml = '<jira_export>\n';
    xml += '  <test>\n';
    xml += `    <projectKey>${escapeHtml(projectKey)}</projectKey>\n`;
    xml += `    <folderName>${escapeHtml(folderName)}</folderName>\n`;
    xml += `    <testName>${escapeHtml(testName)}</testName>\n`;
    xml += `    <testContent>${escapeHtml(testContent)}</testContent>\n`;
    if (configurationElement) xml += `    <configurationElement>${escapeHtml(configurationElement)}</configurationElement>\n`;
    if (testType) xml += `    <testType>${escapeHtml(testType)}</testType>\n`;
    xml += '  </test>\n';
    xml += `  <jiraConnectionUrl>${escapeHtml(jiraUrl)}</jiraConnectionUrl>\n`;
    xml += `  <jiraConnectionToken>${escapeHtml(jiraToken)}</jiraConnectionToken>\n`;
    xml += '</jira_export>';
    return xml;
};

const startLoading = () => {
    let idx = 0;
    dom.loaderText.textContent = LOADING_STATUSES[0][0];
    dom.loaderSubstatus.textContent = LOADING_STATUSES[0][1];
    statusInterval = setInterval(() => {
        idx = (idx + 1) % LOADING_STATUSES.length;
        dom.loaderText.textContent = LOADING_STATUSES[idx][0];
        dom.loaderSubstatus.textContent = LOADING_STATUSES[idx][1];
    }, LOADER_INTERVAL);
};

const stopLoading = () => {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
};

const generate = async () => {
    // Abort previous request if exists
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    try {
        const xml = buildXML();
        const settings = getSettings();

        $('.section').forEach(s => s.classList.add('collapsed'));
        dom.generateBtn.classList.add('hidden');
        dom.generateBtn.disabled = true;
        dom.loader.classList.add('active');
        dom.resultSection.classList.remove('active');
        resetAgent();
        startLoading();

        let jsonData;

        // Mock Mode: использовать заглушку вместо реального API
        if (settings.mockMode && window.mockFetch) {
            console.log('🎭 Mock Mode: Using mock data for generation');
            jsonData = await window.mockFetch('generate', { xml, settings });
        } else {
            // Реальный API запрос
            if (!settings.url) throw new Error('Укажите URL Langflow в настройках');

            const res = await fetch(settings.url, {
                method: 'POST',
                headers: headers(settings.apiKey),
                body: JSON.stringify(buildBody(xml, settings.format, sessionId())),
                signal: currentAbortController.signal
            });

            if (!res.ok) {
                let msg = `HTTP ${res.status}: ${res.statusText}\n\n`;
                if (res.status === 405) msg += `Ошибка 405 - Метод не разрешен.\nПроверьте URL endpoint и формат API.\n\n`;
                msg += `Ответ сервера:\n${await res.text()}`;
                throw new Error(msg);
            }

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const text = await res.text();
                throw new Error(`Сервер вернул неожиданный формат ответа (${contentType || 'unknown'}).\n\nПроверьте:\n- Правильность URL Langflow\n- Что сервер возвращает JSON, а не HTML страницу\n\nОтвет сервера:\n${text.substring(0, 500)}`);
            }

            try {
                jsonData = await res.json();
            } catch (e) {
                throw new Error(`Ошибка парсинга JSON: ${e.message}`);
            }
        }

        const generated = extractResponse(jsonData);
        const parsed = parseXML(generated);

        if (parsed.tests.length || parsed.checks.length || parsed.checksRaw) {
            showResults(parsed);
        } else {
            showPlainText(generated);
        }

    } catch (e) {
        if (e.name === 'AbortError') return; // Ignore aborted requests

        $('.section').forEach(s => s.classList.remove('collapsed'));
        dom.generateBtn.classList.remove('hidden');

        dom.resultSection.classList.add('active');
        dom.testsSection.style.display = 'none';
        dom.additionalChecksSection.style.display = 'none';
        dom.plainTextSection.style.display = 'none';
        dom.errorSection.style.display = 'block';
        dom.errorContent.textContent = `Ошибка: ${e.message}\n\nПроверьте:\n- Корректность URL Langflow\n- Доступность сервиса\n- Правильность API ключа`;

        console.error('Error:', e);
    } finally {
        stopLoading();
        dom.generateBtn.disabled = false;
        dom.loader.classList.remove('active');
        currentAbortController = null;
    }
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM
    domIds.forEach(id => dom[id] = document.getElementById(id));

    loadForm();
    updateRemoveBtns();
    updateJiraConnection();

    // Event delegation
    document.addEventListener('click', e => {
        const t = e.target;

        // Settings
        if (t.id === 'settingsBtn') openModal();
        if (t.id === 'closeSettingsBtn' || t.id === 'saveSettingsBtn' || t.id === 'settingsModal') closeModal();
        if (t.id === 'exportSettingsBtn') exportSettings();
        if (t.id === 'importSettingsBtn') importSettings();

        // Token visibility toggle
        if (t.classList.contains('btn-toggle-token')) {
            const targetId = t.dataset.target;
            if (targetId) toggleTokenVisibility(targetId);
        }

        // Features
        if (t.id === 'addFeatureBtn' || t.closest('#addFeatureBtn')) addFeature();
        if (t.classList.contains('btn-remove')) removeFeature(t);

        // Actions
        if (t.id === 'generateBtn' || t.closest('#generateBtn')) generate();
        if (t.id === 'toggleAllBtn') toggleAll();
        if (t.id === 'selectAllBtn') selectAll();
        if (t.id === 'btnSendJira') sendJira();
        if (t.id === 'agentChatSendBtn' || t.closest('#agentChatSendBtn')) sendAgentMsg();

        // Copy
        if (t.dataset.copy !== undefined) {
            const idx = parseInt(t.dataset.copy);
            const data = testsData[idx] || { content: '' };
            copy(data.content, t);
        }
        if (t.id === 'copyPlainTextBtn') copy(dom.plainTextContent.dataset.raw || dom.plainTextContent.textContent, t);

        // Card toggle (only for test cards, not additional checks)
        const headerLeft = t.closest('.card-header-left');
        if (headerLeft && !t.classList.contains('card-checkbox')) {
            const card = headerLeft.closest('.card');
            if (card && !card.classList.contains('check-card')) {
                card.classList.toggle('collapsed');
            }
        }

        // Section toggle
        const section = t.closest('.section');
        if (section?.classList.contains('collapsed')) {
            e.stopPropagation();
            section.classList.remove('collapsed');
        }
    });

    // Checkbox changes
    document.addEventListener('change', e => {
        if (e.target.classList.contains('card-checkbox')) {
            e.target.closest('.card').classList.toggle('selected', e.target.checked);
            updateSelection();
        }
        // Mock Mode indicator toggle
        if (e.target.id === 'mockModeEnabled') {
            toggleMockIndicator(e.target.checked);
        }
        // Import settings file
        if (e.target.id === 'importSettingsFile') {
            handleImportFile(e);
        }
        // Jira type toggle (D or S)
        if (e.target.name === 'jiraType') {
            updateJiraConnection();
            saveForm();
        }
    });

    // Input autosave
    document.addEventListener('input', e => {
        if (e.target.matches('input, select, textarea') && e.target.closest('.container')) saveForm();
    });

    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && dom.settingsModal.classList.contains('active')) closeModal();
    });

    // Chat input
    dom.agentChatInput?.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMsg(); }
    });
});
