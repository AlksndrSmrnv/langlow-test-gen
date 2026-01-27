(function(TG) {
    'use strict';

    const { config, state, utils, cards, selection, jira } = TG;
    const { dom } = state;
    const { plural, md } = utils;
    const { createCard } = cards;
    const { updateSelection } = selection;
    const { ICONS, FEEDBACK_DELAY } = config;

    const showResults = (data, append = false) => {
        dom.errorSection.style.display = 'none';
        dom.plainTextSection.style.display = 'none';

        if (!append) {
            // Replace mode: clear everything
            dom.testsContainer.innerHTML = '';
            dom.additionalChecksContent.innerHTML = '';
            dom.testsSection.style.display = 'none';
            dom.additionalChecksSection.style.display = 'none';
            state.testsData = data.tests;
            // Ensure backward compatibility: add 'used' field if missing
            state.checksData = (data.checks || []).map(c => ({...c, used: c.used !== undefined ? c.used : false}));
        } else {
            // Append mode: add to existing tests
            state.testsData = state.testsData.concat(data.tests);

            // Append new check data if available
            if (data.checks && data.checks.length) {
                // Ensure backward compatibility: add 'used' field if missing
                const newChecks = data.checks.map(c => ({...c, used: c.used !== undefined ? c.used : false}));
                state.checksData = state.checksData.concat(newChecks);
            }
        }

        if (state.testsData.length) {
            dom.testsSection.style.display = 'block';
            dom.testsCount.textContent = `${state.testsData.length} ${plural(state.testsData.length, ['тест', 'теста', 'тестов'])}`;

            if (!append) {
                // Replace mode: render all tests
                state.testsData.forEach((t, i) => dom.testsContainer.appendChild(createCard(t, i)));
            } else {
                // Append mode: clear and re-render all tests to avoid duplicates
                dom.testsContainer.innerHTML = '';
                state.testsData.forEach((t, i) => dom.testsContainer.appendChild(createCard(t, i)));
            }

            dom.toggleAllBtn.textContent = ICONS.expand;
            dom.jiraSection.classList.add('active');
            updateSelection();
        }

        // Handle additional checks (both old and new)
        if (append) {
            // In append mode: keep checks visible if any exist
            if (state.checksData.length) {
                dom.additionalChecksSection.style.display = 'block';
                const grid = dom.additionalChecksContent.querySelector('.additional-checks-grid') || document.createElement('div');
                grid.className = 'additional-checks-grid';
                grid.innerHTML = '';

                // Re-render all checks with correct indices
                state.checksData.forEach((c, i) => grid.appendChild(createCard(c, i, true)));

                if (!dom.additionalChecksContent.querySelector('.additional-checks-grid')) {
                    dom.additionalChecksContent.innerHTML = '';
                    dom.additionalChecksContent.appendChild(grid);
                }

                if (dom.generateFromChecksBtn) {
                    dom.generateFromChecksBtn.style.display = 'block';
                }
            }
        } else {
            // Replace mode: render new checks only
            if (data.checks.length || data.checksRaw) {
                dom.additionalChecksSection.style.display = 'block';
                if (data.checks.length) {
                    const grid = document.createElement('div');
                    grid.className = 'additional-checks-grid';
                    data.checks.forEach((c, i) => grid.appendChild(createCard(c, i, true)));
                    dom.additionalChecksContent.appendChild(grid);
                    // Show generate button when checks are available
                    if (dom.generateFromChecksBtn) {
                        dom.generateFromChecksBtn.style.display = 'block';
                    }
                } else {
                    dom.additionalChecksContent.innerHTML = md(data.checksRaw);
                    if (dom.generateFromChecksBtn) {
                        dom.generateFromChecksBtn.style.display = 'none';
                    }
                }
            }
        }

        dom.resultSection.classList.add('active');

        // Update JIRA button state after showing results
        if (jira && jira.updateJiraSendButtonState) {
            jira.updateJiraSendButtonState();
        }
    };

    const showPlainText = text => {
        dom.testsSection.style.display = 'none';
        dom.additionalChecksSection.style.display = 'none';
        dom.errorSection.style.display = 'none';
        dom.plainTextSection.style.display = 'block';
        dom.plainTextContent.dataset.raw = text;
        dom.plainTextContent.innerHTML = md(text);
        dom.resultSection.classList.add('active');
    };

    const copy = async (content, btn) => {
        if (btn.dataset.copying) return;
        btn.dataset.copying = 'true';

        const orig = btn.textContent;
        try {
            await navigator.clipboard.writeText(content);
            btn.textContent = ICONS.copied;
            btn.classList.add('copied');
        } catch {
            btn.textContent = ICONS.error;
        }

        setTimeout(() => {
            btn.textContent = orig;
            btn.classList.remove('copied');
            delete btn.dataset.copying;
        }, FEEDBACK_DELAY);
    };

    TG.results = {
        showResults,
        showPlainText,
        copy
    };

})(window.TestGen);
