(function(TG) {
    'use strict';

    const { config, state, storage } = TG;
    const { dom } = state;
    const { showAutosave, loadForm, updateJiraConnection, updateJiraToggleLabels } = storage;

    const captureCurrentSettings = () => {
        return {
            langflowUrl: dom.langflowUrl.value.trim(),
            agentChatLangflowUrl: dom.agentChatLangflowUrl.value.trim(),
            jiraLangflowUrl: dom.jiraLangflowUrl.value.trim(),
            apiKey: dom.apiKey.value.trim(),
            apiFormat: dom.apiFormat.value,
            jiraConnectionUrlD: dom.jiraConnectionUrlD?.value.trim() || '',
            jiraConnectionTokenD: dom.jiraConnectionTokenD?.value.trim() || '',
            jiraConnectionUrlS: dom.jiraConnectionUrlS?.value.trim() || '',
            jiraConnectionTokenS: dom.jiraConnectionTokenS?.value.trim() || '',
            jiraType: dom.jiraTypeToggle?.checked ? 'S' : 'D'
        };
    };

    const openModal = () => {
        state.originalSettings = captureCurrentSettings();
        state.settingsChanged = false;
        dom.settingsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeModalWithoutSave = () => {
        // Restore original settings
        if (state.originalSettings) {
            dom.langflowUrl.value = state.originalSettings.langflowUrl;
            dom.agentChatLangflowUrl.value = state.originalSettings.agentChatLangflowUrl;
            dom.jiraLangflowUrl.value = state.originalSettings.jiraLangflowUrl;
            dom.apiKey.value = state.originalSettings.apiKey;
            dom.apiFormat.value = state.originalSettings.apiFormat;
            if (dom.jiraConnectionUrlD) dom.jiraConnectionUrlD.value = state.originalSettings.jiraConnectionUrlD;
            if (dom.jiraConnectionTokenD) dom.jiraConnectionTokenD.value = state.originalSettings.jiraConnectionTokenD;
            if (dom.jiraConnectionUrlS) dom.jiraConnectionUrlS.value = state.originalSettings.jiraConnectionUrlS;
            if (dom.jiraConnectionTokenS) dom.jiraConnectionTokenS.value = state.originalSettings.jiraConnectionTokenS;
            if (dom.jiraTypeToggle) {
                dom.jiraTypeToggle.checked = state.originalSettings.jiraType === 'S';
                updateJiraToggleLabels();
            }
            updateJiraConnection();
        }
        dom.settingsModal.classList.remove('active');
        document.body.style.overflow = '';
        state.settingsChanged = false;
        state.originalSettings = null;
    };

    const closeModal = () => {
        if (state.settingsChanged) {
            showSettingsConfirmDialog();
        } else {
            closeModalWithoutSave();
        }
    };

    const saveSettingsAndClose = () => {
        // Save all settings to the main form data
        const saved = localStorage.getItem(config.STORAGE_KEY);
        const data = saved ? JSON.parse(saved) : {};

        // Update only settings-related fields
        data.langflowUrl = dom.langflowUrl.value.trim();
        data.agentChatLangflowUrl = dom.agentChatLangflowUrl.value.trim();
        data.jiraLangflowUrl = dom.jiraLangflowUrl.value.trim();
        data.apiKey = dom.apiKey.value.trim();
        data.apiFormat = dom.apiFormat.value;
        data.jiraConnectionUrlD = dom.jiraConnectionUrlD?.value.trim() || '';
        data.jiraConnectionTokenD = dom.jiraConnectionTokenD?.value.trim() || '';
        data.jiraConnectionUrlS = dom.jiraConnectionUrlS?.value.trim() || '';
        data.jiraConnectionTokenS = dom.jiraConnectionTokenS?.value.trim() || '';
        data.jiraType = dom.jiraTypeToggle?.checked ? 'S' : 'D';

        localStorage.setItem(config.STORAGE_KEY, JSON.stringify(data));

        dom.settingsModal.classList.remove('active');
        document.body.style.overflow = '';
        state.settingsChanged = false;
        state.originalSettings = null;
        showAutosave();
    };

    const showSettingsConfirmDialog = () => {
        const overlay = document.createElement('div');
        overlay.className = 'settings-confirm-overlay';
        overlay.innerHTML = `
            <div class="settings-confirm-dialog">
                <div class="settings-confirm-header">
                    <h3>⚠️ Несохраненные изменения</h3>
                </div>
                <div class="settings-confirm-body">
                    <p>Вы изменили настройки. Хотите сохранить изменения?</p>
                </div>
                <div class="settings-confirm-footer">
                    <button class="btn btn-outline" id="confirmDontSave">Не сохранять</button>
                    <button class="btn btn-primary" id="confirmSave">Сохранить настройки</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const handleSave = () => {
            saveSettingsAndClose();
            overlay.remove();
        };

        const handleDontSave = () => {
            closeModalWithoutSave();
            overlay.remove();
        };

        overlay.querySelector('#confirmSave').addEventListener('click', handleSave);
        overlay.querySelector('#confirmDontSave').addEventListener('click', handleDontSave);
    };

    const exportSettings = () => {
        try {
            const saved = localStorage.getItem(config.STORAGE_KEY);
            if (!saved) {
                alert('Нет настроек для экспорта');
                return;
            }

            const data = JSON.parse(saved);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `langlow-settings-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showAutosave();
        } catch (e) {
            console.error('Export error:', e);
            alert('Ошибка экспорта настроек');
        }
    };

    const importSettings = () => {
        dom.importSettingsFile.click();
    };

    const handleImportFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                // Validate data structure
                if (typeof data !== 'object') throw new Error('Invalid settings format');

                // Save to localStorage
                localStorage.setItem(config.STORAGE_KEY, JSON.stringify(data));

                // Reload form with imported data
                loadForm();

                alert('Настройки успешно импортированы!');
                showAutosave();
            } catch (e) {
                console.error('Import error:', e);
                alert('Ошибка импорта настроек: некорректный формат файла');
            }
        };
        reader.readAsText(file);

        // Reset file input
        e.target.value = '';
    };

    const toggleTokenVisibility = (targetId) => {
        const input = document.getElementById(targetId);
        if (!input) return;

        const btn = document.querySelector(`[data-target="${targetId}"]`);
        if (!btn) return;

        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
            btn.title = 'Скрыть';
        } else {
            input.type = 'password';
            btn.textContent = '👁️';
            btn.title = 'Показать';
        }
    };

    TG.modal = {
        captureCurrentSettings,
        openModal,
        closeModalWithoutSave,
        closeModal,
        saveSettingsAndClose,
        showSettingsConfirmDialog,
        exportSettings,
        importSettings,
        handleImportFile,
        toggleTokenVisibility
    };

})(window.TestGen);
