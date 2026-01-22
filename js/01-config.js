(function(TG) {
    'use strict';

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

    TG.config = {
        STORAGE_KEY,
        HISTORY_STORAGE_KEY,
        FEEDBACK_DELAY,
        AUTOSAVE_DELAY,
        LOADER_INTERVAL,
        LOADING_STATUSES,
        ICONS,
        domIds
    };

})(window.TestGen);
