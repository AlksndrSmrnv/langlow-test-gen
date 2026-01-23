(function(TG) {
    'use strict';

    const { state, utils, cards } = TG;
    const { dom } = state;
    const { scrollToBottom, getSettings, headers, buildBody, sessionId, extractResponse } = utils;
    const { updateCard } = cards;

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
        if (!msg || state.agentState.selectedIndex === null || state.agentState.processing) return;

        const test = state.testsData[state.agentState.selectedIndex];
        const settings = getSettings();

        addMessage(msg, true);
        dom.agentChatInput.value = '';

        dom.agentChatLoader.classList.add('active');
        dom.agentChatSendBtn.disabled = true;
        state.agentState.processing = true;

        try {
            if (!settings.agentUrl) throw new Error('Укажите URL Langflow для чата с агентом в настройках');

            const prompt = `Текущий тест:\n\n${test.content}\n\n---\n\nЗапрос на изменение: ${msg}\n\nВерни обновленную версию теста целиком в markdown формате. Не добавляй никаких дополнительных комментариев, только сам тест.`;

            const res = await fetch(settings.agentUrl, {
                method: 'POST',
                headers: headers(settings.apiKey),
                body: JSON.stringify(buildBody(prompt, settings.format, sessionId()))
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

            const response = extractResponse(await res.json());

            state.testsData[state.agentState.selectedIndex].content = response;
            updateCard(state.agentState.selectedIndex, response);
            addMessage('Тест успешно обновлен!', false);

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
        state.agentState = { selectedIndex: null, messages: [], processing: false };
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
