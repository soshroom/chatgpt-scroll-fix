// ==UserScript==
// @name         ChatGPT Scroll Fix
// @namespace    https://github.com/soshroom/chatgpt-scroll-fix
// @version      1.1.1
// @description  Fix ChatGPT mouse-wheel scrolling and restore middle-click on New chat.
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

    const SELECTOR = '[data-app-action-timeline-scroll]';

    const scrollTopDescriptor =
        Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop') ||
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop');

    if (!scrollTopDescriptor?.get || !scrollTopDescriptor?.set) {
        console.error('[ChatGPT Scroll Fix] scrollTop descriptor not found');
        return;
    }

    const nativeGetScrollTop = scrollTopDescriptor.get;
    const nativeSetScrollTop = scrollTopDescriptor.set;

    const nativeScrollTo = Element.prototype.scrollTo;
    const nativeScroll = Element.prototype.scroll;

    function getMaxScroll(el) {
        return Math.max(0, el.scrollHeight - el.clientHeight);
    }

    function getNativeScrollTop(el) {
        return nativeGetScrollTop.call(el);
    }

    function setNativeScrollTop(el, value) {
        nativeSetScrollTop.call(el, value);
    }

    /*
     * ChatGPT's reverse layout expects:
     *   bottom = 0
     *   above  = negative values
     *
     * A normal column layout expects:
     *   top    = 0
     *   bottom = maxScroll
     *
     * Conversion:
     *   reverse = native - maxScroll
     *   native  = reverse + maxScroll
     */
    function reverseToNative(el, value) {
        return value + getMaxScroll(el);
    }

    function nativeToReverse(el, value) {
        return value - getMaxScroll(el);
    }

    function patchScrollContainer(el) {
        if (el.__chatgptScrollProxyInstalled) {
            return;
        }

        Object.defineProperty(el, '__chatgptScrollProxyInstalled', {
            value: true,
            configurable: true
        });

        // Save the current position while ChatGPT still uses column-reverse.
        const oldReversePosition = getNativeScrollTop(el);

        // Use conventional browser scrolling so the mouse wheel behaves normally.
        el.style.setProperty('flex-direction', 'column', 'important');

        // Keep exposing reverse scrollTop coordinates to ChatGPT's virtualizer.
        Object.defineProperty(el, 'scrollTop', {
            configurable: true,
            enumerable: false,

            get() {
                return nativeToReverse(this, getNativeScrollTop(this));
            },

            set(value) {
                const numericValue = Number(value);

                if (!Number.isFinite(numericValue)) {
                    return;
                }

                const max = getMaxScroll(this);
                const native = Math.max(
                    0,
                    Math.min(max, reverseToNative(this, numericValue))
                );

                setNativeScrollTop(this, native);
            }
        });

        if (nativeScrollTo) {
            Object.defineProperty(el, 'scrollTo', {
                configurable: true,

                value: function (arg1, arg2) {
                    if (
                        typeof arg1 === 'number' &&
                        typeof arg2 === 'number'
                    ) {
                        return nativeScrollTo.call(
                            this,
                            arg1,
                            reverseToNative(this, arg2)
                        );
                    }

                    if (arg1 && typeof arg1 === 'object') {
                        const options = { ...arg1 };

                        if (
                            options.top !== undefined &&
                            Number.isFinite(Number(options.top))
                        ) {
                            options.top = reverseToNative(
                                this,
                                Number(options.top)
                            );
                        }

                        return nativeScrollTo.call(this, options);
                    }

                    return nativeScrollTo.call(this, arg1, arg2);
                }
            });
        }

        if (nativeScroll) {
            Object.defineProperty(el, 'scroll', {
                configurable: true,

                value: function (arg1, arg2) {
                    if (
                        typeof arg1 === 'number' &&
                        typeof arg2 === 'number'
                    ) {
                        return nativeScroll.call(
                            this,
                            arg1,
                            reverseToNative(this, arg2)
                        );
                    }

                    if (arg1 && typeof arg1 === 'object') {
                        const options = { ...arg1 };

                        if (
                            options.top !== undefined &&
                            Number.isFinite(Number(options.top))
                        ) {
                            options.top = reverseToNative(
                                this,
                                Number(options.top)
                            );
                        }

                        return nativeScroll.call(this, options);
                    }

                    return nativeScroll.call(this, arg1, arg2);
                }
            });
        }

        // Restore the same physical position after switching to column.
        requestAnimationFrame(() => {
            const max = getMaxScroll(el);

            setNativeScrollTop(
                el,
                Math.max(
                    0,
                    Math.min(max, oldReversePosition + max)
                )
            );
        });

        console.log('[ChatGPT Scroll Fix] reverse proxy attached');
    }

    function scan() {
        document
            .querySelectorAll(SELECTOR)
            .forEach(patchScrollContainer);
    }

    const observer = new MutationObserver(scan);

    function start() {
        scan();

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    if (document.documentElement) {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    }

    /*
     * ChatGPT renders "New chat" as a button instead of a link.
     * Restore the browser-like middle-click behavior without changing
     * the normal left-click action handled by ChatGPT.
     */
    function getNewChatButton(target) {
        if (!(target instanceof Element)) {
            return null;
        }

        const button = target.closest('button');

        if (!button) {
            return null;
        }

        const label = button.getAttribute('aria-label')?.trim();

        const text = button.textContent
            ?.replace(/\s+/g, ' ')
            .trim();

        if (
            label === 'Новый чат' ||
            label === 'New chat' ||
            text === 'Новый чат' ||
            text === 'New chat'
        ) {
            return button;
        }

        return null;
    }

    document.addEventListener(
        'mousedown',
        event => {
            if (event.button !== 1 || !getNewChatButton(event.target)) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
        },
        true
    );

    document.addEventListener(
        'auxclick',
        event => {
            if (event.button !== 1 || !getNewChatButton(event.target)) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            window.open(
                `${location.origin}/`,
                '_blank',
                'noopener'
            );
        },
        true
    );
})();
