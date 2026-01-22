(function(TG) {
    'use strict';

    const { config, utils } = TG;
    const { md } = utils;
    const { ICONS } = config;

    const createCard = (test, idx, isCheck = false) => {
        const card = document.createElement('div');
        card.className = isCheck ? 'card check-card' : 'card collapsed';
        card.dataset.idx = idx;

        const header = document.createElement('div');
        header.className = 'card-header';

        const headerLeft = document.createElement('div');
        headerLeft.className = 'card-header-left';

        // Add checkbox for both regular tests and additional checks
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = isCheck ? 'check-card-checkbox' : 'card-checkbox';
        checkbox.dataset.idx = idx;
        headerLeft.appendChild(checkbox);

        const cardId = document.createElement('div');
        cardId.className = isCheck ? 'card-id warning' : 'card-id';
        cardId.textContent = test.id;
        headerLeft.appendChild(cardId);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-outline';
        copyBtn.dataset.copy = idx;
        copyBtn.textContent = ICONS.copy;

        header.appendChild(headerLeft);
        header.appendChild(copyBtn);

        const content = document.createElement('div');
        content.className = 'card-content';
        content.innerHTML = md(test.content);

        card.appendChild(header);
        card.appendChild(content);

        return card;
    };

    const updateCard = (idx, content) => {
        const card = document.querySelector(`.card[data-idx="${idx}"]`);
        if (card) card.querySelector('.card-content').innerHTML = md(content);
    };

    TG.cards = {
        createCard,
        updateCard
    };

})(window.TestGen);
