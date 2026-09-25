# ChatGPT Scroll Fix

A small userscript that fixes broken mouse-wheel scrolling in the current ChatGPT web UI.

The issue appears when the conversation scroll container uses `flex-direction: column-reverse` together with ChatGPT's virtualized conversation rendering. On affected setups, the scrollbar can still be dragged, but the mouse wheel does not scroll the conversation correctly.

A naive CSS fix such as changing the container to `flex-direction: column` restores wheel scrolling, but breaks ChatGPT's internal scroll coordinates. During message streaming, the conversation can then jump to the top.

This script keeps both sides happy:

- the browser gets a normal `column` scroll container, so mouse-wheel scrolling works
- ChatGPT still sees the reverse `scrollTop` coordinate system expected by its virtualizer
- `scrollTo()` and `scroll()` calls on the conversation container are translated as well
- React can recreate the conversation container without requiring a page reload

## Install

You need a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/) or Violentmonkey.

### One-click install

[Install chatgpt-scroll-fix.user.js](https://raw.githubusercontent.com/soshroom/chatgpt-scroll-fix/main/chatgpt-scroll-fix.user.js)

Your userscript manager should open the installation screen automatically.

### Manual install

1. Create a new userscript in Tampermonkey or Violentmonkey.
2. Copy the contents of [chatgpt-scroll-fix.user.js](./chatgpt-scroll-fix.user.js).
3. Save the script.
4. Reload `https://chatgpt.com/`.

When the fix is active, the browser console should contain:

```text
[ChatGPT Scroll Fix] reverse proxy attached
```

## How it works

ChatGPT currently uses a reverse flex layout for its main conversation scroll container:

```text
[data-app-action-timeline-scroll]
flex-direction: column-reverse
```

In that layout, ChatGPT's JavaScript expects approximately this coordinate system:

```text
bottom = 0
above  = negative scrollTop
```

After switching the browser layout to a normal column, native coordinates become:

```text
top    = 0
bottom = maxScroll
```

The userscript installs a proxy only on the ChatGPT conversation scroll element and converts between the two coordinate systems:

```text
reverse = native - maxScroll
native  = reverse + maxScroll
```

This means a ChatGPT call such as:

```js
container.scrollTop = 0;
```

still means "scroll to the bottom" from ChatGPT's point of view, while the browser receives the correct physical position for a conventional scroll container.

## Why not just use CSS?

This is enough to restore wheel scrolling:

```css
[data-app-action-timeline-scroll] {
    flex-direction: column !important;
}
```

However, ChatGPT's virtualized conversation code still assumes reverse coordinates. As new tokens stream into an answer, its own scroll management can move the conversation to the wrong physical position.

The coordinate proxy is the part that prevents that jump.

## Scope

The script only patches the element matching:

```css
[data-app-action-timeline-scroll]
```

It does not replace `Element.prototype.scrollTop` globally, so scrollable code blocks, the message composer, sidebars, and other page elements keep their native behavior.

## Compatibility

- Site: `https://chatgpt.com/*`
- Userscript managers: intended for Tampermonkey and Violentmonkey
- No external dependencies
- No network requests
- No data collection

ChatGPT's frontend changes frequently. If OpenAI changes the scroll container or virtualization implementation, this script may need an update.

## Troubleshooting

If the script stops working after a ChatGPT UI update:

1. Open DevTools and inspect the main conversation container.
2. Check whether `[data-app-action-timeline-scroll]` still exists.
3. Check the browser console for `[ChatGPT Scroll Fix] reverse proxy attached`.
4. Open an issue with your browser, userscript manager, and a small DOM snippet around the conversation scroll container.

If you previously tested other scroll-fix scripts that patched DOM prototypes, fully reload the ChatGPT tab before testing this script.

## Disclaimer

This is an unofficial workaround and is not affiliated with or endorsed by OpenAI.

## License

MIT
