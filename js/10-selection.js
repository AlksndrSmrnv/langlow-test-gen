(function(TG) {
    'use strict';

    const { config, state, utils } = TG;
    const { dom } = state;
    const { $, plural } = utils;
    const { ICONS } = config;

    const updateSelection = () => {
        const checked = Array.from($('.card-checkbox:checked'));
        const count = checked.length;

        dom.selectedCount.textContent = `Выбрано: ${count} ${plural(count, ['тест', 'теста', 'тестов'])}`;

        if (state.testsData.length) dom.jiraSection.classList.add('active');

        // Agent chat state
        if (state.testsData.length) {
            dom.agentChat.classList.add('active');
            dom.agentChatInput.disabled = false;
        }

        if (count === 0) {
            dom.agentChatContext.classList.remove('active');
            dom.agentChatWarning.classList.remove('active');
            dom.agentChatSendBtn.disabled = true;
            state.agentState.selectedIndex = null;
        } else if (count === 1) {
            const idx = parseInt(checked[0].dataset.idx);
            state.agentState.selectedIndex = idx;
            dom.agentChatContext.classList.add('active');
            dom.agentChatWarning.classList.remove('active');
            dom.agentChatContextTest.textContent = state.testsData[idx].id;
            dom.agentChatSendBtn.disabled = false;
        } else {
            dom.agentChatContext.classList.remove('active');
            dom.agentChatWarning.classList.add('active');
            dom.agentChatSendBtn.disabled = true;
            state.agentState.selectedIndex = null;
        }
    };

    const selectAll = () => {
        const boxes = $('.card-checkbox');
        const allChecked = Array.from(boxes).every(cb => cb.checked);
        boxes.forEach(cb => {
            cb.checked = !allChecked;
            cb.closest('.card').classList.toggle('selected', !allChecked);
        });
        updateSelection();
    };

    const toggleAll = () => {
        const cards = $('.card[data-idx]');
        const allCollapsed = Array.from(cards).every(c => c.classList.contains('collapsed'));
        cards.forEach(c => c.classList.toggle('collapsed', !allCollapsed));
        dom.toggleAllBtn.textContent = allCollapsed ? ICONS.collapse : ICONS.expand;
    };

    TG.selection = {
        updateSelection,
        selectAll,
        toggleAll
    };

})(window.TestGen);
