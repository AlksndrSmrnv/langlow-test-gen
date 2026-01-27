(function(TG) {
    'use strict';

    TG.state = {
        dom: {},
        testsData: [],
        checksData: [], // Additional checks data
        saveTimeout: null,
        statusInterval: null,
        currentAbortController: null,
        agentState: { selectedIndices: [], messages: [], processing: false },
        settingsChanged: false,
        originalSettings: null,
        isGenerating: false, // Защита от повторных кликов на генерацию
        isSendingJira: false, // Защита от повторных кликов на отправку в JIRA
        currentHistoryId: null // ID текущей активной записи истории
    };

})(window.TestGen);
