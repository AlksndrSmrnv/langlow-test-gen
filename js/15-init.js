(function(TG) {
    'use strict';

    const { config, state, storage, modal, history, features, generation, selection, jira, agent, cards, results } = TG;
    const { dom } = state;
    const { domIds } = config;
    const { loadForm, updateRemoveBtns, updateJiraConnection } = storage;
    const { openModal, closeModalWithoutSave, saveSettingsAndClose, closeModal, exportSettings, importSettings, handleImportFile, toggleTokenVisibility, showSettingsWarning, closeSettingsWarning, openSettingsFromWarning } = modal;
    const { openHistoryModal, closeHistoryModal, loadGenerationFromHistory, deleteFromHistory } = history;
    const { addFeature, removeFeature } = features;
    const { generate, generateFromChecks, updateGenerateButtonState } = generation;
    const { toggleAll, selectAll, updateSelection } = selection;
    const { sendJira, updateJiraSendButtonState } = jira;
    const { sendAgentMsg } = agent;
    const { copy } = results;

    document.addEventListener('DOMContentLoaded', () => {
        // Cache DOM
        domIds.forEach(id => dom[id] = document.getElementById(id));

        loadForm();
        // updateRemoveBtns is called inside loadForm if needed, but also here to be safe?
        // loadForm calls it if features exist. If not, we might want to ensure at least one exists?
        // The original code called updateRemoveBtns() after loadForm().
        if (TG.features && TG.features.updateRemoveBtns) TG.features.updateRemoveBtns();

        updateJiraConnection();

        // Check settings state on page load and update button
        updateGenerateButtonState();

        // Event delegation
        document.addEventListener('click', e => {
            const t = e.target;
            const isTextNode = t?.nodeType === Node.TEXT_NODE;
            const elementTarget = isTextNode ? t.parentElement : t;
            const settingsBtn = elementTarget?.closest?.('#settingsBtn');
            const historyBtn = elementTarget?.closest?.('#historyBtn');

            // Settings
            if (settingsBtn) openModal();
            if (t.id === 'closeSettingsBtn') closeModalWithoutSave();
            if (t.id === 'saveSettingsBtn') saveSettingsAndClose();
            if (t.id === 'settingsModal' && t === e.target) closeModal(); // Click on backdrop
            if (t.id === 'exportSettingsBtn') exportSettings();
            if (t.id === 'importSettingsBtn') importSettings();

            // Settings warning modal controls
            if (t.id === 'settingsWarningClose') closeSettingsWarning();
            if (t.id === 'settingsWarningOpenSettings') openSettingsFromWarning();

            // History
            if (historyBtn) openHistoryModal();
            if (t.id === 'closeHistoryBtn' || t.id === 'historyModal') closeHistoryModal();
            if (t.dataset.historyId) loadGenerationFromHistory(t.dataset.historyId);
            if (t.dataset.historyDelete) {
                if (confirm('Удалить эту генерацию из истории?')) {
                    deleteFromHistory(t.dataset.historyDelete);
                }
            }

            // Token visibility toggle
            if (t.classList.contains('btn-toggle-token')) {
                const targetId = t.dataset.target;
                if (targetId) toggleTokenVisibility(targetId);
            }

            // Features
            if (t.id === 'addFeatureBtn' || t.closest('#addFeatureBtn')) addFeature();
            if (t.classList.contains('btn-remove')) removeFeature(t);

            // Actions
            if (t.id === 'generateBtn' || t.closest('#generateBtn')) generate();
            if (t.id === 'retryGenerateBtn' || t.closest('#retryGenerateBtn')) generate();
            if (t.id === 'generateFromChecksBtn' || t.closest('#generateFromChecksBtn')) generateFromChecks();
            if (t.id === 'toggleAllBtn') toggleAll();
            if (t.id === 'selectAllBtn') selectAll();
            if (t.id === 'btnSendJira') sendJira();
            if (t.id === 'agentChatSendBtn' || t.closest('#agentChatSendBtn')) sendAgentMsg();

            // Copy
            if (t.dataset.copy !== undefined) {
                const idx = parseInt(t.dataset.copy);
                const data = state.testsData[idx] || { content: '' };
                copy(data.content, t);
            }
            if (t.id === 'copyPlainTextBtn') copy(dom.plainTextContent.dataset.raw || dom.plainTextContent.textContent, t);

            // Card toggle (only for test cards, not additional checks)
            const headerLeft = t.closest('.card-header-left');
            if (headerLeft && !t.classList.contains('card-checkbox')) {
                const card = headerLeft.closest('.card');
                if (card && !card.classList.contains('check-card')) {
                    card.classList.toggle('collapsed');
                }
            }

            // Section toggle
            const section = t.closest('.section');
            if (section?.classList.contains('collapsed')) {
                e.stopPropagation();
                section.classList.remove('collapsed');
            }
        });

        // Checkbox changes
        document.addEventListener('change', e => {
            if (e.target.classList.contains('card-checkbox')) {
                e.target.closest('.card').classList.toggle('selected', e.target.checked);
                updateSelection();
                updateJiraSendButtonState();
            }
            // Import settings file
            if (e.target.id === 'importSettingsFile') {
                handleImportFile(e);
            }
            // Jira type toggle (D or S)
            if (e.target.id === 'jiraTypeToggle') {
                updateJiraConnection();
                storage.saveForm();
            }
        });

        // Input autosave (only for non-settings inputs)
        document.addEventListener('input', e => {
            if (e.target.matches('input, select, textarea')) {
                // Check if input is inside settings modal
                if (e.target.closest('#settingsModal')) {
                    state.settingsChanged = true;
                } else if (e.target.closest('.container')) {
                    // Auto-save only for main form inputs
                    storage.saveForm();
                }

                // Update JIRA button state when JIRA fields change
                const jiraFieldIds = ['jiraProjectKey', 'jiraFolderName', 'jiraConfigurationElement', 'jiraTestType'];
                if (jiraFieldIds.includes(e.target.id)) {
                    updateJiraSendButtonState();
                }
            }
        });

        // Keyboard
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                // Close settings warning modal if it's visible
                if (dom.settingsWarningOverlay && dom.settingsWarningOverlay.style.display !== 'none') {
                    closeSettingsWarning();
                    return;
                }
                // Check for confirm dialog (exclude static warning overlay)
                const confirmDialog = document.querySelector('.settings-confirm-overlay:not(#settingsWarningOverlay)');
                if (confirmDialog) {
                    confirmDialog.remove();
                    return;
                }
                // Then check for settings modal
                if (dom.settingsModal.classList.contains('active')) {
                    closeModal();
                }
            }
        });

        // Chat input
        dom.agentChatInput?.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMsg(); }
        });
    });

})(window.TestGen);
