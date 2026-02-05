(function(TG) {
    'use strict';

    const { config, state, utils, xml } = TG;
    const { dom } = state;
    const { getSettings, buildBody, headers, sessionId, $ } = utils;
    const { buildJiraXML } = xml;

    const validateJiraFields = () => {
        const projectKey = dom.jiraProjectKey.value.trim();
        const folderName = dom.jiraFolderName.value.trim();
        const configElement = dom.jiraConfigurationElement.value.trim();
        const testType = dom.jiraTestType.value.trim();

        const errors = [];
        if (!projectKey) errors.push('Project Key');
        if (!folderName) errors.push('Название папки');
        if (!configElement) errors.push('АС(КЭ)');
        if (!testType) errors.push('Вид тестирования');

        return {
            valid: errors.length === 0,
            errors: errors
        };
    };

    const sendJira = async () => {
        // Защита от повторных кликов
        if (state.isSendingJira) return;

        const validation = validateJiraFields();
        if (!validation.valid) {
            const errorMsg = `Заполните обязательные поля:\n• ${validation.errors.join('\n• ')}`;
            return alert(errorMsg);
        }

        const projectKey = dom.jiraProjectKey.value.trim();
        const folderName = dom.jiraFolderName.value.trim();
        const settings = getSettings();

        if (!settings.jiraUrl) return alert('Укажите URL Langflow для отправки в JIRA');

        const selected = Array.from($('.card-checkbox:checked')).map(cb => state.testsData[parseInt(cb.dataset.idx)]);
        if (!selected.length) return alert('Выберите хотя бы один тест для отправки');

        state.isSendingJira = true;
        dom.btnSendJira.disabled = true;
        dom.btnSendJira.textContent = '⏳ Отправка...';
        dom.jiraStatus.innerHTML = '';
        dom.jiraStatus.className = 'jira-status';

        const jiraType = dom.jiraTypeToggle?.checked ? 'S' : 'D';
        // Convert jiraType to full name: D -> Delta, S -> Sigma
        const jiraTypeName = jiraType === 'D' ? 'Delta' : 'Sigma';

        try {
            // Get Jira metadata settings
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
                        jiraTypeName,
                        jiraConfigurationElement,
                        jiraTestType
                    );

                    const res = await fetch(settings.jiraUrl, {
                        method: 'POST',
                        headers: headers(settings.apiKey),
                        body: JSON.stringify(buildBody(xmlData, settings.format, sessionId()))
                    });
                    const raw = await res.text();
                    const trimmed = raw.trim();
                    let jsonData = null;
                    let parseError = null;

                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        try {
                            jsonData = JSON.parse(trimmed);
                        } catch (e) {
                            parseError = e;
                        }
                    }

                    let langflowStatus = null;
                    let langflowErrorMsg = null;
                    if (jsonData && typeof jsonData === 'object' && Object.prototype.hasOwnProperty.call(jsonData, 'status_code')) {
                        const statusCode = Number(jsonData.status_code);
                        if (!Number.isNaN(statusCode)) langflowStatus = statusCode;
                        if (statusCode !== 200 && statusCode !== 201) {
                            langflowErrorMsg = jsonData?.result?.errorMessages?.[0]
                                || `Ошибка Langflow: status_code ${jsonData.status_code}`;
                        }
                    }

                    const httpOk = res.status >= 200 && res.status < 300;
                    const isSuccess = (langflowStatus !== null)
                        ? (langflowStatus === 200 || langflowStatus === 201)
                        : (httpOk && !parseError);
                    let msg;

                    if (isSuccess) {
                        msg = 'Успешно отправлено';
                    } else if (langflowErrorMsg) {
                        msg = langflowErrorMsg;
                    } else if (parseError) {
                        msg = `Ошибка парсинга JSON: ${parseError.message}`;
                    } else {
                        msg = `Ошибка ${res.status}: ${raw || res.statusText || 'Без текста ошибки'}`;
                    }

                    return {
                        ok: isSuccess,
                        name: test.id,
                        msg
                    };
                } catch (e) {
                    return { ok: false, name: test.id, msg: e.message };
                }
            }));

            const ok = results.filter(r => r.ok).length;
            const err = results.filter(r => !r.ok).length;

            dom.jiraStatus.className = err ? 'jira-status error' : 'jira-status success';

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
        } finally {
            state.isSendingJira = false;
            updateJiraSendButtonState();
            dom.btnSendJira.textContent = `📤 Отправить выбранные тесты в Jira ${jiraType}`;
        }
    };

    const updateJiraSendButtonState = () => {
        const validation = validateJiraFields();
        const hasSelectedTests = Array.from($('.card-checkbox:checked')).length > 0;

        if (dom.btnSendJira) {
            dom.btnSendJira.disabled = !validation.valid || !hasSelectedTests || state.isSendingJira;
        }
    };

    TG.jira = {
        sendJira,
        validateJiraFields,
        updateJiraSendButtonState
    };

})(window.TestGen);
