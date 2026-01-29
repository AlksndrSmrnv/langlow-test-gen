(function(TG) {
    'use strict';

    const { config, state, utils } = TG;
    const { dom } = state;
    const { $ } = utils;

    const showAutosave = () => {
        dom.autosave.classList.add('show');
        setTimeout(() => dom.autosave.classList.remove('show'), config.FEEDBACK_DELAY);
    };

    const saveForm = () => {
        clearTimeout(state.saveTimeout);
        state.saveTimeout = setTimeout(() => {
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
                jiraProjectKey: dom.jiraProjectKey.value.trim(),
                jiraFolderName: dom.jiraFolderName.value.trim(),
                jiraConfigurationElement: dom.jiraConfigurationElement?.value.trim() || '',
                jiraTestType: dom.jiraTestType?.value.trim() || ''
            };
            localStorage.setItem(config.STORAGE_KEY, JSON.stringify(data));
            showAutosave();
        }, config.AUTOSAVE_DELAY);
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

    const updateJiraConnection = () => {
        if (!dom.jiraConnectionUrl || !dom.jiraConnectionToken) return;

        const isJiraS = dom.jiraTypeToggle?.checked;
        const jiraType = isJiraS ? 'S' : 'D';

        if (isJiraS) {
            dom.jiraConnectionUrl.value = dom.jiraConnectionUrlS?.value.trim() || '';
            dom.jiraConnectionToken.value = dom.jiraConnectionTokenS?.value.trim() || '';
        } else {
            dom.jiraConnectionUrl.value = dom.jiraConnectionUrlD?.value.trim() || '';
            dom.jiraConnectionToken.value = dom.jiraConnectionTokenD?.value.trim() || '';
        }

        if (dom.btnSendJira) {
            dom.btnSendJira.textContent = `📤 Отправить выбранные тесты в Jira ${jiraType}`;
        }

        updateJiraToggleLabels();
    };

    const loadForm = () => {
        try {
            const saved = localStorage.getItem(config.STORAGE_KEY);
            if (!saved) return;

            const data = JSON.parse(saved);

            if (data.features?.length) {
                dom.featureList.innerHTML = '';
                data.features.forEach(url => {
                    dom.featureList.appendChild(createFeatureItem(url));
                });
                // Call updateRemoveBtns from features module
                if (TG.features && TG.features.updateRemoveBtns) {
                    TG.features.updateRemoveBtns();
                }
            }

            ['checklistUrl', 'langflowUrl', 'agentChatLangflowUrl', 'jiraLangflowUrl',
             'apiKey', 'apiFormat',
             'jiraConnectionUrlD', 'jiraConnectionTokenD',
             'jiraConnectionUrlS', 'jiraConnectionTokenS',
             'jiraProjectKey', 'jiraFolderName',
             'jiraConfigurationElement', 'jiraTestType']
                .forEach(f => {
                    if (data[f] !== undefined && dom[f]) {
                        dom[f].value = data[f];
                    }
                });

            if (data.jiraType !== undefined && dom.jiraTypeToggle) {
                dom.jiraTypeToggle.checked = data.jiraType === 'S';
                updateJiraToggleLabels();
            }

            updateJiraConnection();
        } catch (e) {
            console.error('Load error:', e);
        }
    };

    const restoreRequestParams = (params) => {
        try {
            // Handle missing params - clear form
            if (!params) {
                if (dom.checklistUrl) {
                    dom.checklistUrl.value = '';
                }

                if (dom.featureList) {
                    dom.featureList.innerHTML = '';
                    dom.featureList.appendChild(createFeatureItem(''));

                    // Update remove buttons (late binding)
                    if (TG.features && TG.features.updateRemoveBtns) {
                        TG.features.updateRemoveBtns();
                    }
                }
                return;
            }

            // Restore checklist URL
            if (dom.checklistUrl) {
                dom.checklistUrl.value = params.checklistUrl || '';
            }

            // Restore feature URLs
            if (dom.featureList) {
                dom.featureList.innerHTML = '';

                if (params.features && Array.isArray(params.features) && params.features.length > 0) {
                    params.features.forEach(url => {
                        dom.featureList.appendChild(createFeatureItem(url || ''));
                    });
                } else {
                    // If no features or empty array, create one empty field
                    dom.featureList.appendChild(createFeatureItem(''));
                }

                // Update remove buttons visibility (late binding)
                if (TG.features && TG.features.updateRemoveBtns) {
                    TG.features.updateRemoveBtns();
                }
            }
        } catch (e) {
            console.error('Error restoring request params:', e);
        }
    };

    TG.storage = {
        showAutosave,
        saveForm,
        createFeatureItem,
        loadForm,
        restoreRequestParams,
        updateJiraToggleLabels,
        updateJiraConnection
    };

})(window.TestGen);
