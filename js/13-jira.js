(function(TG) {
    'use strict';

    const { config, state, utils, xml } = TG;
    const { dom } = state;
    const { getSettings, buildBody, headers, sessionId, extractResponse, $ } = utils;
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

    const formatJiraError = (statusCode, errorMessages) => {
        let msg = `Ошибка JIRA (status_code: ${statusCode})`;

        if (errorMessages && errorMessages.length > 0) {
            msg += '\n' + errorMessages.map(err => `  • ${err}`).join('\n');
        }

        return msg;
    };

    const sendJira = async () => {
        // Защита от повторных кликов
        if (state.isSendingJira) return;

        // Debug storage
        window.jiraDebugLogs = [];

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

                    console.log('=== JIRA RESPONSE FOR TEST:', test.id, '===');
                    console.log('HTTP Status:', res.status);
                    console.log('Raw Response:', raw);

                    const tryParseJson = text => {
                        const t = (text || '').trim();
                        if (!t || (!t.startsWith('{') && !t.startsWith('['))) {
                            return { value: null, error: null, tried: false };
                        }
                        try {
                            return { value: JSON.parse(t), error: null, tried: true };
                        } catch (e) {
                            return { value: null, error: e, tried: true };
                        }
                    };

                    const getStatusInfo = obj => {
                        if (!obj || typeof obj !== 'object') return null;
                        let status = null;
                        let errorMessages = null;

                        // Extract status_code (root level)
                        if (Object.prototype.hasOwnProperty.call(obj, 'status_code')) {
                            const statusCode = Number(obj.status_code);
                            if (!Number.isNaN(statusCode)) {
                                status = statusCode;
                                // Always extract errorMessages array, regardless of status
                                const errArr = obj.errorMessages || (obj.result && obj.result.errorMessages) || [];
                                errorMessages = errArr.length > 0 ? errArr : null;
                                return { status, errorMessages };
                            }
                        }

                        // Extract status_code (nested in result)
                        if (obj.result && typeof obj.result === 'object' && Object.prototype.hasOwnProperty.call(obj.result, 'status_code')) {
                            const statusCode = Number(obj.result.status_code);
                            if (!Number.isNaN(statusCode)) {
                                status = statusCode;
                                // Always extract errorMessages array, regardless of status
                                const errArr = obj.result.errorMessages || [];
                                errorMessages = errArr.length > 0 ? errArr : null;
                                return { status, errorMessages };
                            }
                        }

                        return null;
                    };

                    // Parse response JSON (Langflow wrapper)
                    const parsed = tryParseJson(trimmed);
                    let jsonData = parsed.value;
                    let parseError = parsed.error;

                    const log = (msg, data) => {
                        console.log(msg, data);
                        window.jiraDebugLogs.push({ msg, data: JSON.stringify(data, null, 2) });
                    };

                    log('[JIRA] Test name:', test.id);
                    log('[JIRA] Step 1 - Raw response (first 500):', trimmed.substring(0, 500));
                    log('[JIRA] Step 2 - Parsed jsonData:', jsonData);

                    // Extract inner response from Langflow wrapper (like in generation.js)
                    // This gets the actual JIRA response from outputs[0].outputs[0].results.message.text
                    const extracted = extractResponse(jsonData);
                    log('[JIRA] Step 3 - Extracted type:', typeof extracted);
                    log('[JIRA] Step 3 - Extracted content:', extracted?.substring ? extracted.substring(0, 500) : extracted);

                    // Parse extracted content (could be JSON string with status_code)
                    let statusInfo = null;
                    if (typeof extracted === 'string') {
                        const extractedParsed = tryParseJson(extracted);
                        log('[JIRA] Step 4a - Parsed extracted string:', extractedParsed.value);
                        if (extractedParsed.tried && extractedParsed.error && !parseError) {
                            parseError = extractedParsed.error;
                        }
                        // Try to get status_code from parsed extracted content
                        statusInfo = getStatusInfo(extractedParsed.value);
                        log('[JIRA] Step 5a - StatusInfo from parsed string:', statusInfo);
                    } else if (extracted && typeof extracted === 'object') {
                        // Try to get status_code from extracted object
                        statusInfo = getStatusInfo(extracted);
                        log('[JIRA] Step 4b - StatusInfo from extracted object:', statusInfo);
                    }

                    // Fallback: try original jsonData if no status_code found in extracted
                    if (!statusInfo) {
                        log('[JIRA] Step 6 - Trying fallback to original jsonData', null);
                        statusInfo = getStatusInfo(jsonData);
                        log('[JIRA] Step 7 - StatusInfo from fallback:', statusInfo);
                    }

                    const langflowStatus = statusInfo ? statusInfo.status : null;
                    const langflowErrorMsg = (statusInfo && (langflowStatus !== 200 && langflowStatus !== 201))
                        ? formatJiraError(langflowStatus, statusInfo.errorMessages)
                        : null;

                    const httpOk = res.status >= 200 && res.status < 300;
                    const isSuccess = (langflowStatus !== null)
                        ? (langflowStatus === 200 || langflowStatus === 201)
                        : (httpOk && !parseError);

                    log('[JIRA] Final - HTTP status:', res.status);
                    log('[JIRA] Final - HTTP OK:', httpOk);
                    log('[JIRA] Final - Langflow status_code:', langflowStatus);
                    log('[JIRA] Final - isSuccess:', isSuccess);
                    log('[JIRA] Final - errorMessages:', statusInfo?.errorMessages);
                    log('[JIRA] Final - langflowErrorMsg:', langflowErrorMsg);

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

                    // Add debug info to message for troubleshooting
                    msg += `\n\n[DEBUG] HTTP: ${res.status}, Langflow status_code: ${langflowStatus || 'not found'}, extracted type: ${typeof extracted}`;

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

                // Create test name container
                const testNameDiv = document.createElement('div');
                testNameDiv.className = 'jira-status-test-name';
                testNameDiv.textContent = r.name;

                // Create status message container
                const statusIcon = r.ok ? '✓' : '✕';
                const escapedMsg = utils.escapeHtml(r.msg);
                const formattedMsg = escapedMsg.replace(/\n/g, '<br>');

                const messageDiv = document.createElement('div');
                messageDiv.className = `jira-status-message ${r.ok ? 'success' : 'error'}`;
                messageDiv.innerHTML = `${statusIcon} ${formattedMsg}`;

                item.appendChild(testNameDiv);
                item.appendChild(messageDiv);
                dom.jiraStatus.appendChild(item);
            });

            // Add debug button (always show)
            const debugBtn = document.createElement('button');
            debugBtn.textContent = '🐛 Показать debug логи';
            debugBtn.style.cssText = 'margin-top: 16px; padding: 8px 16px; cursor: pointer; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px;';
            debugBtn.onclick = () => {
                if (!window.jiraDebugLogs || window.jiraDebugLogs.length === 0) {
                    alert('Логи пусты. Проверьте консоль браузера (F12).');
                    return;
                }
                const logText = window.jiraDebugLogs.map(l => `${l.msg}\n${l.data}`).join('\n\n');
                const textArea = document.createElement('textarea');
                textArea.value = logText;
                textArea.style.cssText = 'width: 100%; height: 400px; font-family: monospace; font-size: 12px;';
                const modal = document.createElement('div');
                modal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 2px solid #333; z-index: 10000; width: 80%; max-width: 800px;';
                modal.innerHTML = '<h3>Debug Логи JIRA</h3>';
                modal.appendChild(textArea);
                const closeBtn = document.createElement('button');
                closeBtn.textContent = 'Закрыть';
                closeBtn.style.cssText = 'margin-top: 10px; padding: 8px 16px; cursor: pointer;';
                closeBtn.onclick = () => document.body.removeChild(modal);
                modal.appendChild(closeBtn);
                document.body.appendChild(modal);

                console.log('=== JIRA DEBUG LOGS ===');
                window.jiraDebugLogs.forEach(l => console.log(l.msg, l.data));
            };
            dom.jiraStatus.appendChild(debugBtn);
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
