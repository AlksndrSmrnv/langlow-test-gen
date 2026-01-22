(function(TG) {
    'use strict';

    const { config, state, utils, xml } = TG;
    const { dom } = state;
    const { getSettings, buildBody, headers, sessionId, $ } = utils;
    const { buildJiraXML } = xml;

    const sendJira = async () => {
        // Защита от повторных кликов
        if (state.isSendingJira) return;

        const projectKey = dom.jiraProjectKey.value.trim();
        const folderName = dom.jiraFolderName.value.trim();
        const settings = getSettings();

        if (!projectKey) return alert('Укажите Project Key');
        if (!folderName) return alert('Укажите название папки');
        if (!settings.jiraUrl) return alert('Укажите URL Langflow для отправки в JIRA');

        const selected = Array.from($('.card-checkbox:checked')).map(cb => state.testsData[parseInt(cb.dataset.idx)]);
        if (!selected.length) return alert('Выберите хотя бы один тест для отправки');

        state.isSendingJira = true;
        dom.btnSendJira.disabled = true;
        dom.btnSendJira.textContent = '⏳ Отправка...';
        dom.jiraStatus.innerHTML = '';
        dom.jiraStatus.className = 'jira-status';

        const jiraType = dom.jiraTypeToggle?.checked ? 'S' : 'D';

        try {
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
            dom.btnSendJira.disabled = false;
            dom.btnSendJira.textContent = `📤 Отправить выбранные тесты в Jira ${jiraType}`;
            state.isSendingJira = false;
        }
    };

    TG.jira = {
        sendJira
    };

})(window.TestGen);
