(function(TG) {
    'use strict';

    const { state, utils } = TG;
    const { dom } = state;
    const { $ } = utils;
    const { escapeHtml } = utils;

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
                        if (content) result.checks.push({ id, content, used: false });
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
        const testRe = /<test[^>]*(?:name|id)\s*=\s*(?:"([^"]*)"|'([^']*)')[ ^>]*>([\s\S]*?)(?:<\/test>|(?=<test)|(?=<\/tests>)|(?=<additional_checks>)|$)/gi;
        let m;

        while ((m = testRe.exec(xml)) !== null) {
            const id = m[1] || m[2];  // m[1] для двойных кавычек, m[2] для одинарных
            const content = m[3].trim().replace(/<\/?tests>/gi, '').trim();
            if (content && !content.startsWith('<additional_checks')) {
                result.tests.push({ id, content });
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
            const checkRe = /<check[^>]*(?:name|id)\s*=\s*(?:"([^"]*)"|'([^']*)')[ ^>]*>([\s\S]*?)(?:<\/check>|(?=<check)|(?=<\/additional_checks>)|$)/gi;
            while ((m = checkRe.exec(addMatch[1])) !== null) {
                const id = m[1] || m[2];  // m[1] для двойных кавычек, m[2] для одинарных
                const content = m[3].trim();
                if (content) result.checks.push({ id, content, used: false });
            }
            if (!result.checks.length) {
                const clean = addMatch[1].replace(/<\/?check[^>]*>/gi, '').trim();
                if (clean) result.checksRaw = clean;
            }
        }

        return result;
    };

    const buildXML = () => {
        const features = Array.from($('.feature-input')).map(i => i.value.trim()).filter(Boolean);
        const checklist = dom.checklistUrl.value.trim();

        if (!features.length) throw new Error('Добавьте хотя бы одну страницу с описанием фичи');
        if (!checklist) throw new Error('Укажите ссылку на чек-лист');

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<test_generation>\n`;
        xml += features.map(f => `  <feature>${escapeHtml(f)}</feature>`).join('\n') + '\n';
        xml += `  <checklist>${escapeHtml(checklist)}</checklist>\n`;
        xml += `</test_generation>`;

        return xml;
    };

    const buildChecksXML = (selectedChecks) => {
        const features = Array.from($('.feature-input')).map(i => i.value.trim()).filter(Boolean);
        const checklist = dom.checklistUrl.value.trim();

        if (!features.length) throw new Error('Добавьте хотя бы одну страницу с описанием фичи');
        if (!selectedChecks.length) throw new Error('Выберите хотя бы одну дополнительную проверку');
        if (!checklist) throw new Error('Укажите ссылку на чек-лист');

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<test_generation>\n`;
        xml += `  <additional_checks>\n`;
        xml += selectedChecks.map(check => `    <test>${escapeHtml(check)}</test>`).join('\n') + '\n';
        xml += `  </additional_checks>\n`;
        xml += features.map(f => `  <feature>${escapeHtml(f)}</feature>`).join('\n') + '\n';
        xml += `  <checklist>${escapeHtml(checklist)}</checklist>\n`;
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

    TG.xml = {
        parseXML,
        buildXML,
        buildChecksXML,
        buildJiraXML
    };

})(window.TestGen);
