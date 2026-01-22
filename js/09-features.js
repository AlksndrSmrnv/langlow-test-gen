(function(TG) {
    'use strict';

    const { state, storage, utils } = TG;
    const { dom } = state;
    const { createFeatureItem, saveForm } = storage;
    const { $ } = utils;

    const updateRemoveBtns = () => {
        const items = $('.feature-item');
        const display = items.length > 1 ? 'block' : 'none';
        items.forEach(item => {
            const btn = item.querySelector('.btn-remove');
            if (btn) btn.style.display = display;
        });
    };

    const addFeature = () => {
        dom.featureList.appendChild(createFeatureItem());
        updateRemoveBtns();
        saveForm();
    };

    const removeFeature = btn => {
        btn.closest('.feature-item').remove();
        updateRemoveBtns();
        saveForm();
    };

    TG.features = {
        addFeature,
        removeFeature,
        updateRemoveBtns
    };

})(window.TestGen);
