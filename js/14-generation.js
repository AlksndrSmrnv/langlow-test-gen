(function(TG) {
    'use strict';

    const { config, state, utils, xml, results, agent, history } = TG;
    const { dom } = state;
    const { LOADING_STATUSES, LOADER_INTERVAL } = config;
    const { getSettings, headers, buildBody, sessionId, extractResponse, $ } = utils;
    const { buildXML, buildChecksXML, parseXML } = xml;
    const { showResults, showPlainText } = results;
    const { resetAgent } = agent;
    const { saveToHistory } = history;

    const startLoading = () => {
        let idx = 0;
        dom.loaderText.textContent = LOADING_STATUSES[0][0];
        dom.loaderSubstatus.textContent = LOADING_STATUSES[0][1];
        state.statusInterval = setInterval(() => {
            idx = (idx + 1) % LOADING_STATUSES.length;
            dom.loaderText.textContent = LOADING_STATUSES[idx][0];
            dom.loaderSubstatus.textContent = LOADING_STATUSES[idx][1];
        }, LOADER_INTERVAL);
    };

    const stopLoading = () => {
        if (state.statusInterval) {
            clearInterval(state.statusInterval);
            state.statusInterval = null;
        }
    };

    const generate = async () => {
        // Защита от повторных кликов
        if (state.isGenerating) return;
        state.isGenerating = true;

        // Abort previous request if exists
        if (state.currentAbortController) {
            state.currentAbortController.abort();
        }
        state.currentAbortController = new AbortController();

        try {
            const xmlData = buildXML();
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
                body: JSON.stringify(buildBody(xmlData, settings.format, sessionId())),
                signal: state.currentAbortController.signal
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
            if (dom.generateFromChecksBtn) dom.generateFromChecksBtn.disabled = false;
            dom.loader.classList.remove('active');
            state.currentAbortController = null;
            state.isGenerating = false;
        }
    };

    const generateFromChecks = async () => {
        // Защита от повторных кликов
        if (state.isGenerating) return;

        // Collect selected checks
        const selectedCheckboxes = Array.from($('.check-card-checkbox:checked'));
        if (!selectedCheckboxes.length) {
            alert('Выберите хотя бы одну дополнительную проверку');
            return;
        }

        state.isGenerating = true;

        const selectedChecks = selectedCheckboxes.map(cb => {
            const idx = parseInt(cb.dataset.idx);
            return state.checksData[idx]?.content || '';
        }).filter(Boolean);

        // Abort previous request if exists
        if (state.currentAbortController) {
            state.currentAbortController.abort();
        }
        state.currentAbortController = new AbortController();

        try {
            const xmlData = buildChecksXML(selectedChecks);
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
                body: JSON.stringify(buildBody(xmlData, settings.format, sessionId())),
                signal: state.currentAbortController.signal
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
                    tests: state.testsData,        // All tests after append
                    checks: state.checksData,      // All checks after append
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
            state.currentAbortController = null;
            state.isGenerating = false;
        }
    };

    TG.generation = {
        startLoading,
        stopLoading,
        generate,
        generateFromChecks
    };

})(window.TestGen);
