(function(TG) {
    'use strict';

    const { state, utils, cards, history } = TG;
    const { dom } = state;
    const { scrollToBottom, getSettings, headers, buildBody, sessionId, extractResponse, escapeHtml, plural } = utils;
    const { updateCard } = cards;
    const { updateCurrentHistoryWithChat } = history;

    const buildAgentXML = (indices, userMessage) => {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<request>\n';
        xml += `  <user_message>${escapeHtml(userMessage)}</user_message>\n`;
        xml += '  <tests>\n';

        indices.forEach(idx => {
            const test = state.testsData[idx];
            if (!test) return;
            // Escape CDATA end sequence to prevent breaking CDATA section
            const escapedContent = test.content.replace(/\]\]>/g, ']]]]><![CDATA[>');
            const safeId = escapeHtml(test.id || `Тест ${idx + 1}`);
            xml += `    <test id="${safeId}" index="${idx}">\n`;
            xml += `      <![CDATA[${escapedContent}]]>\n`;
            xml += '    </test>\n';
        });

        xml += '  </tests>\n</request>';
        return xml;
    };

    const parseAgentResponse = (xmlString) => {
        const updatedTests = [];

        // Helper to unescape CDATA end sequences
        const unescapeContent = (content) => content.replace(/\]\]\]\]><!\[CDATA\[>/g, ']]>');
        const parseIndex = (value) => {
            const parsed = parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : null;
        };
        const extractAttr = (attrs, name) => {
            if (!attrs) return null;
            const re = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
            const match = attrs.match(re);
            return match ? (match[1] || match[2]) : null;
        };
        const pushTest = (index, id, content) => {
            if (!content) return;
            const trimmed = content.trim();
            if (!trimmed) return;
            updatedTests.push({
                index: Number.isFinite(index) ? index : null,
                id: id || null,
                content: unescapeContent(trimmed)
            });
        };

        try {
            // Try DOMParser first
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlString, 'text/xml');

            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                throw new Error('XML parsing error');
            }

            const testNodes = doc.querySelectorAll('test');
            testNodes.forEach(node => {
                const index = parseIndex(node.getAttribute('index'));
                const id = node.getAttribute('id') || node.getAttribute('name') || null;
                const contentNode = node.querySelector('content');
                const content = contentNode ? contentNode.textContent : node.textContent;
                pushTest(index, id, content);
            });
            if (updatedTests.length) return updatedTests;
        } catch (e) {
            console.warn('DOMParser failed, trying regex fallback', e);
        }

        // Regex fallback for malformed XML or unexpected structure
        const testRegex = /<test\b([^>]*)>([\s\S]*?)<\/test>/gi;
        let match;

        while ((match = testRegex.exec(xmlString)) !== null) {
            const attrs = match[1] || '';
            const body = match[2] || '';
            const index = parseIndex(extractAttr(attrs, 'index'));
            const id = extractAttr(attrs, 'id') || extractAttr(attrs, 'name');

            let content = '';
            const contentMatch = body.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
            if (contentMatch) {
                const contentBody = contentMatch[1] || '';
                const cdataMatch = contentBody.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
                content = cdataMatch ? cdataMatch[1] : contentBody.replace(/<[^>]+>/g, '');
            } else {
                const cdataMatch = body.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
                content = cdataMatch ? cdataMatch[1] : body.replace(/<[^>]+>/g, '');
            }

            pushTest(index, id, content);
        }

        return updatedTests;
    };

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
        state.agentState.messages.push({ text, isUser, time: new Date().toISOString() });
    };

    const sendAgentMsg = async () => {
        const msg = dom.agentChatInput.value.trim();
        if (!msg || state.agentState.selectedIndices.length === 0 || state.agentState.processing) return;

        const settings = getSettings();

        addMessage(msg, true);
        dom.agentChatInput.value = '';

        dom.agentChatLoader.classList.add('active');
        dom.agentChatSendBtn.disabled = true;
        state.agentState.processing = true;

        try {
            if (!settings.agentUrl) throw new Error('Укажите URL Langflow для чата с агентом в настройках');

            // Build XML with all selected tests
            const xmlPayload = buildAgentXML(state.agentState.selectedIndices, msg);

            const res = await fetch(settings.agentUrl, {
                method: 'POST',
                headers: headers(settings.apiKey),
                body: JSON.stringify(buildBody(xmlPayload, settings.format, sessionId()))
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

            const response = extractResponse(await res.json());

            // Parse XML response and update all tests
            const updatedTests = parseAgentResponse(response);

            if (updatedTests.length === 0) {
                throw new Error('Не удалось распарсить ответ от агента');
            }

            const selectedIndices = [...state.agentState.selectedIndices];
            const selectedSet = new Set(selectedIndices);
            const idToIndices = new Map();
            selectedIndices.forEach(idx => {
                const id = state.testsData[idx]?.id;
                if (!id) return;
                if (!idToIndices.has(id)) idToIndices.set(id, []);
                idToIndices.get(id).push(idx);
            });

            if (updatedTests.length !== selectedIndices.length) {
                throw new Error('Ответ агента должен содержать изменения для всех выбранных тестов');
            }

            const usedTargets = new Set();
            const updates = [];

            updatedTests.forEach(({ index, id, content }) => {
                let targetIdx = Number.isFinite(index) ? index : null;

                if (targetIdx === null && id) {
                    const list = idToIndices.get(id);
                    if (!list || list.length === 0) {
                        throw new Error('Ответ агента содержит неизвестный id теста');
                    }
                    if (list.length > 1) {
                        throw new Error('Ответ агента содержит неуникальный id теста');
                    }
                    targetIdx = list[0];
                }

                if (targetIdx === null) {
                    throw new Error('Ответ агента должен содержать index или id для каждого теста');
                }
                if (!selectedSet.has(targetIdx)) {
                    throw new Error('Ответ агента содержит тест вне выбранных');
                }
                if (usedTargets.has(targetIdx)) {
                    throw new Error('Ответ агента содержит дублирующийся index');
                }
                if (!state.testsData[targetIdx]) {
                    throw new Error('Ответ агента содержит несуществующий index теста');
                }

                usedTargets.add(targetIdx);
                updates.push({ index: targetIdx, content });
            });

            if (usedTargets.size !== selectedIndices.length) {
                throw new Error('Ответ агента не содержит правки для всех выбранных тестов');
            }

            let successCount = 0;
            updates.forEach(({ index, content }) => {
                state.testsData[index].content = content;
                updateCard(index, content);
                successCount++;
            });

            // Show count of updated tests
            const totalSelected = selectedIndices.length;
            const testWord = plural(successCount, ['тест', 'теста', 'тестов']);
            const totalWord = plural(totalSelected, ['тест', 'теста', 'тестов']);
            const message = successCount === totalSelected
                ? `Успешно обновлено ${successCount} ${testWord}`
                : `Обновлено ${successCount} из ${totalSelected} ${totalWord}`;
            addMessage(message, false);

            // Update history with current chat messages
            updateCurrentHistoryWithChat();

        } catch (e) {
            console.error('Agent error:', e);
            const errMsg = e && e.message ? e.message : 'Неизвестная ошибка';
            addMessage(`Ошибка: ${errMsg}`, false);
        } finally {
            dom.agentChatLoader.classList.remove('active');
            dom.agentChatSendBtn.disabled = false;
            state.agentState.processing = false;
        }
    };

    const resetAgent = () => {
        state.agentState = { selectedIndices: [], messages: [], processing: false };
        dom.agentChatMessages.innerHTML = '';
        dom.agentChatContext.classList.remove('active');
        dom.agentChatWarning.classList.remove('active');
        dom.agentChatInput.value = '';
    };

    const restoreAgentChat = (messages) => {
        if (!messages || !Array.isArray(messages) || !messages.length) {
            resetAgent();
            return;
        }

        // Clear current chat
        dom.agentChatMessages.innerHTML = '';
        state.agentState.messages = [];

        // Restore messages
        messages.forEach(msg => {
            const time = new Date(msg.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const msgEl = document.createElement('div');
            msgEl.className = `agent-message ${msg.isUser ? 'user' : 'agent'}`;

            const avatar = document.createElement('div');
            avatar.className = 'agent-message-avatar';
            avatar.textContent = msg.isUser ? '👤' : '🤖';

            const content = document.createElement('div');
            content.className = 'agent-message-content';

            const textEl = document.createElement('p');
            textEl.className = 'agent-message-text';
            textEl.textContent = msg.text;

            const timeEl = document.createElement('div');
            timeEl.className = 'agent-message-time';
            timeEl.textContent = time;

            content.appendChild(textEl);
            content.appendChild(timeEl);
            msgEl.appendChild(avatar);
            msgEl.appendChild(content);

            dom.agentChatMessages.appendChild(msgEl);
            state.agentState.messages.push(msg);
        });

        scrollToBottom(dom.agentChatMessages.closest('.agent-chat-body'));
    };

    TG.agent = {
        addMessage,
        sendAgentMsg,
        resetAgent,
        restoreAgentChat
    };

})(window.TestGen);
