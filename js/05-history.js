(function(TG) {
    'use strict';

    const { config, state, utils } = TG;
    const { dom } = state;
    const { plural } = utils;

    const saveToHistory = (parsedData, requestParams) => {
        try {
            const history = loadHistory();
            const timestamp = new Date().toISOString();
            const displayDate = new Date().toLocaleString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const historyItem = {
                id: timestamp,
                date: displayDate,
                timestamp: timestamp,
                testsCount: parsedData.tests?.length || 0,
                checksCount: parsedData.checks?.length || 0,
                data: parsedData,
                params: requestParams,
                agentMessages: [...state.agentState.messages] // Save chat messages
            };

            history.unshift(historyItem);

            // Limit history to 50 items
            if (history.length > 50) {
                history.splice(50);
            }

            localStorage.setItem(config.HISTORY_STORAGE_KEY, JSON.stringify(history));
        } catch (e) {
            console.error('Error saving to history:', e);
        }
    };

    const loadHistory = () => {
        try {
            const saved = localStorage.getItem(config.HISTORY_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading history:', e);
            return [];
        }
    };

    const loadGenerationFromHistory = (id) => {
        try {
            const history = loadHistory();
            const item = history.find(h => h.id === id);
            if (item && item.data) {
                // Late binding for results module
                TG.results.showResults(item.data);

                // Restore agent chat if available
                if (TG.agent && TG.agent.restoreAgentChat) {
                    TG.agent.restoreAgentChat(item.agentMessages || []);
                }

                closeHistoryModal();
            }
        } catch (e) {
            console.error('Error loading generation from history:', e);
            alert('Ошибка загрузки генерации из истории');
        }
    };

    const deleteFromHistory = (id) => {
        try {
            const history = loadHistory();
            const filtered = history.filter(h => h.id !== id);
            localStorage.setItem(config.HISTORY_STORAGE_KEY, JSON.stringify(filtered));
            renderHistory();
        } catch (e) {
            console.error('Error deleting from history:', e);
        }
    };

    const renderHistory = () => {
        if (!dom.historyList) return;

        const history = loadHistory();
        dom.historyList.innerHTML = '';

        if (!history.length) {
            dom.historyList.innerHTML = '<div class="history-empty">История генераций пуста</div>';
            return;
        }

        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';

            const info = document.createElement('div');
            info.className = 'history-item-info';

            const date = document.createElement('div');
            date.className = 'history-item-date';
            date.textContent = item.date;

            const stats = document.createElement('div');
            stats.className = 'history-item-stats';
            stats.textContent = `${item.testsCount} ${plural(item.testsCount, ['тест', 'теста', 'тестов'])}`;
            if (item.checksCount > 0) {
                stats.textContent += `, ${item.checksCount} ${plural(item.checksCount, ['проверка', 'проверки', 'проверок'])}`;
            }

            info.appendChild(date);
            info.appendChild(stats);

            const actions = document.createElement('div');
            actions.className = 'history-item-actions';

            const loadBtn = document.createElement('button');
            loadBtn.className = 'btn btn-outline btn-sm';
            loadBtn.textContent = '📂 Загрузить';
            loadBtn.dataset.historyId = item.id;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-outline btn-sm btn-danger';
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = 'Удалить из истории';
            deleteBtn.dataset.historyDelete = item.id;

            actions.appendChild(loadBtn);
            actions.appendChild(deleteBtn);

            historyItem.appendChild(info);
            historyItem.appendChild(actions);

            dom.historyList.appendChild(historyItem);
        });
    };

    const openHistoryModal = () => {
        if (!dom.historyModal) return;
        renderHistory();
        dom.historyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeHistoryModal = () => {
        if (!dom.historyModal) return;
        dom.historyModal.classList.remove('active');
        document.body.style.overflow = '';
    };

    TG.history = {
        saveToHistory,
        loadHistory,
        loadGenerationFromHistory,
        deleteFromHistory,
        renderHistory,
        openHistoryModal,
        closeHistoryModal
    };

})(window.TestGen);
