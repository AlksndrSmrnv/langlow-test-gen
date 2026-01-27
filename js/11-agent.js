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
            xml += `    <test id="${escapeHtml(test.id)}" index="${idx}">\n`;
            xml += `      <content><![CDATA[${test.content}]]></content>\n`;
            xml += '    </test>\n';
        });

        xml += '  </tests>\n</request>';
        return xml;
    };

    const parseAgentResponse = (xmlString) => {
        const updatedTests = [];

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
                const index = parseInt(node.getAttribute('index'));
                const contentNode = node.querySelector('content');

                if (!isNaN(index) && contentNode) {
                    updatedTests.push({
                        index: index,
                        content: contentNode.textContent.trim()
                    });
                }
            });

        } catch (e) {
            console.warn('DOMParser failed, trying regex fallback', e);

            // Regex fallback for malformed XML
            const testRegex = /<test[^>]*index="(\d+)"[^>]*>[\s\S]*?<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>[\s\S]*?<\/test>/gi;
            let match;

            while ((match = testRegex.exec(xmlString)) !== null) {
                updatedTests.push({
                    index: parseInt(match[1]),
                    content: match[2].trim()
                });
            }
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

            let successCount = 0;
            updatedTests.forEach(({ index, content }) => {
                if (state.testsData[index]) {
                    state.testsData[index].content = content;
                    updateCard(index, content);
                    successCount++;
                }
            });

            // Show count of updated tests
            const testWord = plural(successCount, ['тест', 'теста', 'тестов']);
            addMessage(`Успешно обновлено ${successCount} ${testWord}`, false);

            // Update history with current chat messages
            updateCurrentHistoryWithChat();

        } catch (e) {
            console.error('Agent error:', e);
            addMessage(`Ошибка: ${e.message}`, false);
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
