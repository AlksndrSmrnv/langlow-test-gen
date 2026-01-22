(function(TG) {
    'use strict';

    const { state } = TG;

    const $ = sel => document.querySelectorAll(sel);

    const escapeHtml = str => str.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);

    const md = text => {
        if (typeof marked === 'undefined') return escapeHtml(text);
        return marked.parse(text, { breaks: true });
    };

    const plural = (n, forms) => {
        const mod = [n % 10, n % 100];
        if (mod[0] === 1 && mod[1] !== 11) return forms[0];
        if (mod[0] >= 2 && mod[0] <= 4 && (mod[1] < 10 || mod[1] >= 20)) return forms[1];
        return forms[2];
    };

    const sessionId = () => {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}_${Math.random().toString(36).slice(2, 10)}`;
    };

    const getSettings = () => ({
        url: state.dom.langflowUrl?.value.trim() || '',
        agentUrl: state.dom.agentChatLangflowUrl?.value.trim() || '',
        jiraUrl: state.dom.jiraLangflowUrl?.value.trim() || '',
        apiKey: state.dom.apiKey?.value.trim() || '',
        format: state.dom.apiFormat?.value || 'standard'
    });

    const buildBody = (data, format, sid) => {
        const base = { output_type: 'chat', input_type: 'chat', session_id: sid };
        if (format === 'inputs') return { ...base, inputs: { input_value: data } };
        if (format === 'message') return { ...base, message: data };
        return { ...base, input_value: data };
    };

    const headers = key => {
        const h = { 'Content-Type': 'application/json' };
        if (key) { h['Authorization'] = `Bearer ${key}`; h['x-api-key'] = key; }
        return h;
    };

    const headersXml = key => {
        const h = { 'Content-Type': 'application/xml' };
        if (key) { h['Authorization'] = `Bearer ${key}`; h['x-api-key'] = key; }
        return h;
    };

    const extractResponse = r =>
        r.outputs?.[0]?.outputs?.[0]?.results?.message?.text ||
        r.result || r.message || JSON.stringify(r, null, 2);

    const scrollToBottom = container => {
        if (container) container.scrollTop = container.scrollHeight;
    };

    TG.utils = {
        $,
        escapeHtml,
        md,
        plural,
        sessionId,
        getSettings,
        buildBody,
        headers,
        headersXml,
        extractResponse,
        scrollToBottom
    };

})(window.TestGen);
