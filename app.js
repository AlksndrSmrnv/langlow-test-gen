// ==================== CONFIG & CONSTANTS ====================
const STORAGE_KEY = 'testGeneratorFormData';
const HISTORY_STORAGE_KEY = 'testGeneratorHistory';
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
    'historyModal', 'historyBtn', 'closeHistoryBtn', 'historyList',
    'featureList', 'addFeatureBtn', 'checklistUrl', 'langflowUrl',
    'agentChatLangflowUrl', 'jiraLangflowUrl',
    'apiKey', 'apiFormat',
    'jiraConnectionUrl', 'jiraConnectionToken',
    'jiraConnectionUrlD', 'jiraConnectionTokenD',
    'jiraConnectionUrlS', 'jiraConnectionTokenS',
    'jiraTypeToggle', 'jiraLabelD', 'jiraLabelS',
    'confluenceToken', 'generateBtn', 'loader', 'loaderText',
    'loaderSubstatus', 'resultSection', 'testsSection', 'testsContainer',
    'testsCount', 'toggleAllBtn', 'jiraSection', 'selectedCount',
    'selectAllBtn', 'jiraProjectKey', 'jiraFolderName', 'jiraConfigurationElement', 'jiraTestType', 'btnSendJira',
    'jiraStatus', 'additionalChecksSection', 'additionalChecksContent', 'generateFromChecksBtn',
    'plainTextSection', 'plainTextContent', 'copyPlainTextBtn',
    'errorSection', 'errorContent', 'retryGenerateBtn', 'agentChat', 'agentChatContext',
    'agentChatContextTest', 'agentChatWarning', 'agentChatMessages',
    'agentChatLoader', 'agentChatInput', 'agentChatSendBtn', 'autosave'
];

// State
let testsData = [];
let checksData = []; // Additional checks data
let saveTimeout = null;
let statusInterval = null;
let currentAbortController = null;
let agentState = { selectedIndex: null, messages: [], processing: false };
let settingsChanged = false;
let originalSettings = null;

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
    format: dom.apiFormat?.value || 'standard'
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
            jiraConnectionUrlD: dom.jiraConnectionUrlD?.value.trim() || '',
            jiraConnectionTokenD: dom.jiraConnectionTokenD?.value.trim() || '',
            jiraConnectionUrlS: dom.jiraConnectionUrlS?.value.trim() || '',
            jiraConnectionTokenS: dom.jiraConnectionTokenS?.value.trim() || '',
            jiraType: dom.jiraTypeToggle?.checked ? 'S' : 'D',
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

        // Restore Jira type selection
        if (data.jiraType !== undefined && dom.jiraTypeToggle) {
            dom.jiraTypeToggle.checked = data.jiraType === 'S';
            updateJiraToggleLabels();
        }

        // Update hidden fields based on selected Jira type
        updateJiraConnection();
    } catch (e) {
        console.error('Load error:', e);
    }
};

// Update Jira toggle labels styling
const updateJiraToggleLabels = () => {
    if (!dom.jiraLabelD || !dom.jiraLabelS || !dom.jiraTypeToggle) return;

    const isJiraS = dom.jiraTypeToggle.checked;

    if (isJiraS) {
        dom.jiraLabelD.classList.remove('active');
        dom.jiraLabelS.classList.add('active');
    } else {
        dom.jiraLabelD.classList.add('active');
        dom.jiraLabelS.classList.remove('active');
    }
};

// Update Jira connection based on selected type (D or S)
const updateJiraConnection = () => {
    if (!dom.jiraConnectionUrl || !dom.jiraConnectionToken) return;

    const isJiraS = dom.jiraTypeToggle?.checked;
    const jiraType = isJiraS ? 'S' : 'D';

    if (isJiraS) {
        // Use Jira S credentials
        dom.jiraConnectionUrl.value = dom.jiraConnectionUrlS?.value.trim() || '';
        dom.jiraConnectionToken.value = dom.jiraConnectionTokenS?.value.trim() || '';
    } else {
        // Use Jira D credentials
        dom.jiraConnectionUrl.value = dom.jiraConnectionUrlD?.value.trim() || '';
        dom.jiraConnectionToken.value = dom.jiraConnectionTokenD?.value.trim() || '';
    }

    // Update button text
    if (dom.btnSendJira) {
        dom.btnSendJira.textContent = `📤 Отправить выбранные тесты в Jira`;
    }

    // Update toggle labels
    updateJiraToggleLabels();
};

// ==================== HISTORY ====================
const saveToHistory = (parsedData, requestParams) => {
    try {
        const history = loadHistory();
        const timestamp = new Date().toISOString();
        const displayDate = new Date().toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const historyItem = {
            id: timestamp,
            date: displayDate,
            timestamp: timestamp,
            testsCount: parsedData.tests?.length || 0,
            checksCount: parsedData.checks?.length || 0,
            data: parsedData,
            params: requestParams
        };

        history.unshift(historyItem);

        // Limit history to 50 items
        if (history.length > 50) {
            history.splice(50);
        }

        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Error saving to history:', e);
    }
};

const loadHistory = () => {
    try {
        const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error('Error loading history:', e);
        return [];
    }
};

const loadGenerationFromHistory = (id) => {
    try {
        const history = loadHistory();
        const item = history.find(h => h.id === id);
        if (item && item.data) {
            showResults(item.data);
            closeHistoryModal();
        }
    } catch (e) {
        console.error('Error loading generation from history:', e);
        alert('Ошибка загрузки генерации из истории');
    }
};

const deleteFromHistory = (id) => {
    try {
        const history = loadHistory();
        const filtered = history.filter(h => h.id !== id);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
        renderHistory();
    } catch (e) {
        console.error('Error deleting from history:', e);
    }
};

const renderHistory = () => {
    if (!dom.historyList) return;

    const history = loadHistory();
    dom.historyList.innerHTML = '';

    if (!history.length) {
        dom.historyList.innerHTML = '<div class="history-empty">История генераций пуста</div>';
        return;
    }

    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const info = document.createElement('div');
        info.className = 'history-item-info';

        const date = document.createElement('div');
        date.className = 'history-item-date';
        date.textContent = item.date;

        const stats = document.createElement('div');
        stats.className = 'history-item-stats';
        stats.textContent = `${item.testsCount} ${plural(item.testsCount, ['тест', 'теста', 'тестов'])}`;
        if (item.checksCount > 0) {
            stats.textContent += `, ${item.checksCount} ${plural(item.checksCount, ['проверка', 'проверки', 'проверок'])}`;
        }

        info.appendChild(date);
        info.appendChild(stats);

        const actions = document.createElement('div');
        actions.className = 'history-item-actions';

        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn btn-outline btn-sm';
        loadBtn.textContent = '📂 Загрузить';
        loadBtn.dataset.historyId = item.id;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-outline btn-sm btn-danger';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Удалить из истории';
        deleteBtn.dataset.historyDelete = item.id;

        actions.appendChild(loadBtn);
        actions.appendChild(deleteBtn);

        historyItem.appendChild(info);
        historyItem.appendChild(actions);

        dom.historyList.appendChild(historyItem);
    });
};

const openHistoryModal = () => {
    if (!dom.historyModal) return;
    renderHistory();
    dom.historyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

const closeHistoryModal = () => {
    if (!dom.historyModal) return;
    dom.historyModal.classList.remove('active');
    document.body.style.overflow = '';
};

// ==================== MODAL ====================
const captureCurrentSettings = () => {
    return {
        langflowUrl: dom.langflowUrl.value.trim(),
        agentChatLangflowUrl: dom.agentChatLangflowUrl.value.trim(),
        jiraLangflowUrl: dom.jiraLangflowUrl.value.trim(),
        apiKey: dom.apiKey.value.trim(),
        apiFormat: dom.apiFormat.value,
        jiraConnectionUrlD: dom.jiraConnectionUrlD?.value.trim() || '',
        jiraConnectionTokenD: dom.jiraConnectionTokenD?.value.trim() || '',
        jiraConnectionUrlS: dom.jiraConnectionUrlS?.value.trim() || '',
        jiraConnectionTokenS: dom.jiraConnectionTokenS?.value.trim() || '',
        jiraType: dom.jiraTypeToggle?.checked ? 'S' : 'D',
        confluenceToken: dom.confluenceToken?.value.trim() || ''
    };
};

const openModal = () => {
    originalSettings = captureCurrentSettings();
    settingsChanged = false;
    dom.settingsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

const closeModalWithoutSave = () => {
    // Restore original settings
    if (originalSettings) {
        dom.langflowUrl.value = originalSettings.langflowUrl;
        dom.agentChatLangflowUrl.value = originalSettings.agentChatLangflowUrl;
        dom.jiraLangflowUrl.value = originalSettings.jiraLangflowUrl;
        dom.apiKey.value = originalSettings.apiKey;
        dom.apiFormat.value = originalSettings.apiFormat;
        if (dom.jiraConnectionUrlD) dom.jiraConnectionUrlD.value = originalSettings.jiraConnectionUrlD;
        if (dom.jiraConnectionTokenD) dom.jiraConnectionTokenD.value = originalSettings.jiraConnectionTokenD;
        if (dom.jiraConnectionUrlS) dom.jiraConnectionUrlS.value = originalSettings.jiraConnectionUrlS;
        if (dom.jiraConnectionTokenS) dom.jiraConnectionTokenS.value = originalSettings.jiraConnectionTokenS;
        if (dom.jiraTypeToggle) {
            dom.jiraTypeToggle.checked = originalSettings.jiraType === 'S';
            updateJiraToggleLabels();
        }
        if (dom.confluenceToken) dom.confluenceToken.value = originalSettings.confluenceToken;
        updateJiraConnection();
    }
    dom.settingsModal.classList.remove('active');
    document.body.style.overflow = '';
    settingsChanged = false;
    originalSettings = null;
};

const closeModal = () => {
    if (settingsChanged) {
        showSettingsConfirmDialog();
    } else {
        closeModalWithoutSave();
    }
};

const saveSettingsAndClose = () => {
    // Save all settings to the main form data
    const saved = localStorage.getItem(STORAGE_KEY);
    const data = saved ? JSON.parse(saved) : {};

    // Update only settings-related fields
    data.langflowUrl = dom.langflowUrl.value.trim();
    data.agentChatLangflowUrl = dom.agentChatLangflowUrl.value.trim();
    data.jiraLangflowUrl = dom.jiraLangflowUrl.value.trim();
    data.apiKey = dom.apiKey.value.trim();
    data.apiFormat = dom.apiFormat.value;
    data.jiraConnectionUrlD = dom.jiraConnectionUrlD?.value.trim() || '';
    data.jiraConnectionTokenD = dom.jiraConnectionTokenD?.value.trim() || '';
    data.jiraConnectionUrlS = dom.jiraConnectionUrlS?.value.trim() || '';
    data.jiraConnectionTokenS = dom.jiraConnectionTokenS?.value.trim() || '';
    data.jiraType = dom.jiraTypeToggle?.checked ? 'S' : 'D';
    data.confluenceToken = dom.confluenceToken?.value.trim() || '';

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    dom.settingsModal.classList.remove('active');
    document.body.style.overflow = '';
    settingsChanged = false;
    originalSettings = null;
    showAutosave();
};

const showSettingsConfirmDialog = () => {
    const overlay = document.createElement('div');
    overlay.className = 'settings-confirm-overlay';
    overlay.innerHTML = `
        <div class="settings-confirm-dialog">
            <div class="settings-confirm-header">
                <h3>⚠️ Несохраненные изменения</h3>
            </div>
            <div class="settings-confirm-body">
                <p>Вы изменили настройки. Хотите сохранить изменения?</p>
            </div>
            <div class="settings-confirm-footer">
                <button class="btn btn-outline" id="confirmDontSave">Не сохранять</button>
                <button class="btn btn-primary" id="confirmSave">Сохранить настройки</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const handleSave = () => {
        saveSettingsAndClose();
        overlay.remove();
    };

    const handleDontSave = () => {
        closeModalWithoutSave();
        overlay.remove();
    };

    overlay.querySelector('#confirmSave').addEventListener('click', handleSave);
    overlay.querySelector('#confirmDontSave').addEventListener('click', handleDontSave);
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

    // Add checkbox for both regular tests and additional checks
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = isCheck ? 'check-card-checkbox' : 'card-checkbox';
    checkbox.dataset.idx = idx;
    headerLeft.appendChild(checkbox);

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
        if (!settings.agentUrl) throw new Error('Укажите URL Langflow для чата с агентом в настройках');

        const prompt = `Текущий тест:\n\n${test.content}\n\n---\n\nЗапрос на изменение: ${msg}\n\nВерни обновленную версию теста целиком в markdown формате. Не добавляй никаких дополнительных комментариев, только сам тест.`;

        const res = await fetch(settings.agentUrl, {
            method: 'POST',
            headers: headers(settings.apiKey),
            body: JSON.stringify(buildBody(prompt, settings.format, sessionId()))
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

        const response = extractResponse(await res.json());

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
const showResults = (data, append = false) => {
    dom.errorSection.style.display = 'none';
    dom.plainTextSection.style.display = 'none';

    if (!append) {
        // Replace mode: clear everything
        dom.testsContainer.innerHTML = '';
        dom.additionalChecksContent.innerHTML = '';
        dom.testsSection.style.display = 'none';
        dom.additionalChecksSection.style.display = 'none';
        testsData = data.tests;
        checksData = data.checks || [];
    } else {
        // Append mode: add to existing tests
        const startIdx = testsData.length;
        testsData = testsData.concat(data.tests);

        // Append new check data if available
        if (data.checks && data.checks.length) {
            checksData = checksData.concat(data.checks);
        }
    }

    if (testsData.length) {
        dom.testsSection.style.display = 'block';
        dom.testsCount.textContent = `${testsData.length} ${plural(testsData.length, ['тест', 'теста', 'тестов'])}`;

        if (!append) {
            // Replace mode: render all tests
            testsData.forEach((t, i) => dom.testsContainer.appendChild(createCard(t, i)));
        } else {
            // Append mode: render only new tests
            const startIdx = testsData.length - data.tests.length;
            data.tests.forEach((t, i) => {
                dom.testsContainer.appendChild(createCard(t, startIdx + i));
            });
        }

        dom.toggleAllBtn.textContent = ICONS.expand;
        dom.jiraSection.classList.add('active');
        updateSelection();
    }

    if (!append && (data.checks.length || data.checksRaw)) {
        dom.additionalChecksSection.style.display = 'block';
        if (data.checks.length) {
            const grid = document.createElement('div');
            grid.className = 'additional-checks-grid';
            data.checks.forEach((c, i) => grid.appendChild(createCard(c, i, true)));
            dom.additionalChecksContent.appendChild(grid);
            // Show generate button when checks are available
            if (dom.generateFromChecksBtn) {
                dom.generateFromChecksBtn.style.display = 'block';
            }
        } else {
            dom.additionalChecksContent.innerHTML = md(data.checksRaw);
            if (dom.generateFromChecksBtn) {
                dom.generateFromChecksBtn.style.display = 'none';
            }
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
        } catch (e) {
            return { ok: false, name: test.id, msg: e.message };
        }
    }));

    const ok = results.filter(r => r.ok).length;
    const err = results.filter(r => !r.ok).length;

    dom.jiraStatus.className = err ? 'jira-status error' : 'jira-status success';

    const jiraType = dom.jiraTypeToggle?.checked ? 'S' : 'D';
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

const buildChecksXML = (selectedChecks) => {
    const features = Array.from($('.feature-input')).map(i => i.value.trim()).filter(Boolean);
    const confluenceToken = dom.confluenceToken?.value.trim() || '';

    if (!features.length) throw new Error('Добавьте хотя бы одну страницу с описанием фичи');
    if (!selectedChecks.length) throw new Error('Выберите хотя бы одну дополнительную проверку');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<test_generation>\n`;
    xml += `  <additional_checks>\n`;
    xml += selectedChecks.map(check => `    <test>${escapeHtml(check)}</test>`).join('\n') + '\n';
    xml += `  </additional_checks>\n`;
    xml += features.map(f => `  <feature>${escapeHtml(f)}</feature>`).join('\n') + '\n';
    xml += `  <checklist>http://s.s/test</checklist>\n`;
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

        let jsonData;
        try {
            jsonData = await res.json();
        } catch (e) {
            throw new Error(`Ошибка парсинга JSON: ${e.message}`);
        }

        const generated = extractResponse(jsonData);
        const parsed = parseXML(generated);

        if (parsed.tests.length || parsed.checks.length || parsed.checksRaw) {
            // Save to history
            const requestParams = {
                features: Array.from($('.feature-input')).map(i => i.value.trim()).filter(Boolean),
                checklistUrl: dom.checklistUrl.value.trim()
            };
            saveToHistory(parsed, requestParams);

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

const generateFromChecks = async () => {
    // Collect selected checks
    const selectedCheckboxes = Array.from($('.check-card-checkbox:checked'));
    if (!selectedCheckboxes.length) {
        alert('Выберите хотя бы одну дополнительную проверку');
        return;
    }

    const selectedChecks = selectedCheckboxes.map(cb => {
        const idx = parseInt(cb.dataset.idx);
        return checksData[idx]?.content || '';
    }).filter(Boolean);

    // Abort previous request if exists
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    try {
        const xml = buildChecksXML(selectedChecks);
        const settings = getSettings();

        $('.section').forEach(s => s.classList.add('collapsed'));
        dom.generateBtn.classList.add('hidden');
        dom.generateBtn.disabled = true;
        if (dom.generateFromChecksBtn) dom.generateFromChecksBtn.disabled = true;
        dom.loader.classList.add('active');
        dom.resultSection.classList.remove('active');
        resetAgent();
        startLoading();

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

        let jsonData;
        try {
            jsonData = await res.json();
        } catch (e) {
            throw new Error(`Ошибка парсинга JSON: ${e.message}`);
        }

        const generated = extractResponse(jsonData);
        const parsed = parseXML(generated);

        if (parsed.tests.length || parsed.checks.length || parsed.checksRaw) {
            // Append new tests to existing ones first
            showResults(parsed, true);

            // Save to history with ALL tests (old + new)
            const fullData = {
                tests: testsData,        // All tests after append
                checks: checksData,      // All checks after append
                checksRaw: ''
            };
            const requestParams = {
                features: Array.from($('.feature-input')).map(i => i.value.trim()).filter(Boolean),
                selectedChecks: selectedChecks.length
            };
            saveToHistory(fullData, requestParams);
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
        if (dom.generateFromChecksBtn) dom.generateFromChecksBtn.disabled = false;
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
        if (t.id === 'closeSettingsBtn') closeModalWithoutSave();
        if (t.id === 'saveSettingsBtn') saveSettingsAndClose();
        if (t.id === 'settingsModal' && t === e.target) closeModal(); // Click on backdrop
        if (t.id === 'exportSettingsBtn') exportSettings();
        if (t.id === 'importSettingsBtn') importSettings();

        // History
        if (t.id === 'historyBtn') openHistoryModal();
        if (t.id === 'closeHistoryBtn' || t.id === 'historyModal') closeHistoryModal();
        if (t.dataset.historyId) loadGenerationFromHistory(t.dataset.historyId);
        if (t.dataset.historyDelete) {
            if (confirm('Удалить эту генерацию из истории?')) {
                deleteFromHistory(t.dataset.historyDelete);
            }
        }

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
        if (t.id === 'retryGenerateBtn' || t.closest('#retryGenerateBtn')) generate();
        if (t.id === 'generateFromChecksBtn' || t.closest('#generateFromChecksBtn')) generateFromChecks();
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
        // Import settings file
        if (e.target.id === 'importSettingsFile') {
            handleImportFile(e);
        }
        // Jira type toggle (D or S)
        if (e.target.id === 'jiraTypeToggle') {
            updateJiraConnection();
            saveForm();
        }
    });

    // Input autosave (only for non-settings inputs)
    document.addEventListener('input', e => {
        if (e.target.matches('input, select, textarea')) {
            // Check if input is inside settings modal
            if (e.target.closest('#settingsModal')) {
                settingsChanged = true;
            } else if (e.target.closest('.container')) {
                // Auto-save only for main form inputs
                saveForm();
            }
        }
    });

    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            // Check for confirm dialog first
            const confirmDialog = document.querySelector('.settings-confirm-overlay');
            if (confirmDialog) {
                confirmDialog.remove();
                return;
            }
            // Then check for settings modal
            if (dom.settingsModal.classList.contains('active')) {
                closeModal();
            }
        }
    });

    // Chat input
    dom.agentChatInput?.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMsg(); }
    });
});
