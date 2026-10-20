// ==UserScript==
// @name         ChatGPT New Chat Middle Click
// @namespace    https://github.com/soshroom/chatgpt-scroll-fix
// @version      1.2.0
// @description  Open a new ChatGPT chat in a new tab with middle-click.
// @author       soshroom
// @match        https://chatgpt.com/*
// @homepageURL  https://github.com/soshroom/chatgpt-scroll-fix
// @supportURL   https://github.com/soshroom/chatgpt-scroll-fix/issues
// @updateURL    https://raw.githubusercontent.com/soshroom/chatgpt-scroll-fix/main/chatgpt-scroll-fix.user.js
// @downloadURL  https://raw.githubusercontent.com/soshroom/chatgpt-scroll-fix/main/chatgpt-scroll-fix.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    function getNewChatButton(target) {
        if (!(target instanceof Element)) {
            return null;
        }

        const button = target.closest('button');

        if (!button) {
            return null;
        }

        const label = button.getAttribute('aria-label')?.trim();
        const text = button.textContent?.replace(/\s+/g, ' ').trim();

        return (
            label === 'Новый чат' ||
            label === 'New chat' ||
            text === 'Новый чат' ||
            text === 'New chat'
        ) ? button : null;
    }

    document.addEventListener('mousedown', event => {
        if (event.button !== 1 || !getNewChatButton(event.target)) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);

    document.addEventListener('auxclick', event => {
        if (event.button !== 1 || !getNewChatButton(event.target)) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        window.open(`${location.origin}/`, '_blank', 'noopener');
    }, true);
})();
