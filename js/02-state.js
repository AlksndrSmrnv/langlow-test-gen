(function(TG) {
    'use strict';

    TG.state = {
        dom: {},
        testsData: [],
        checksData: [], // Additional checks data
        saveTimeout: null,
        statusInterval: null,
        currentAbortController: null,
        agentState: { selectedIndex: null, messages: [], processing: false },
        settingsChanged: false,
        originalSettings: null,
        isGenerating: false, // Защита от повторных кликов на генерацию
        isSendingJira: false // Защита от повторных кликов на отправку в JIRA
    };

})(window.TestGen);
