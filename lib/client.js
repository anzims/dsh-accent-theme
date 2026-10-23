// dsh-accent-theme - browser half.
//
// Window theming for the DSH Web GUI, built on the official
// `ctx.theme.overrideTokens(source, tokens)` seam of
// @deepseek-ai/dsh-client-ui-theme (no vendor files are patched).
//
// Five independent colours per palette:
//   bg     - window canvas: --dsw-alias-bg-base plus the derived surface ramp
//            (bg-layer-1/2/3, sidebar, code blocks, scrollbar).
//   input  - composer / text-field fill: --dsw-specific-input-major, the token
//            the conversation package paints its rounded composer card with.
//   button - the neutral filled button family. One colour drives all of them,
//            because DSH gives each button its own token:
//              "Новая сессия"      -> --dsw-alias-button-elevated-fill
//              floating buttons    -> --dsw-alias-button-floating-fill
//              "+" in the composer -> --dsw-specific-selector
//              their hovers        -> --dsw-alias-button-floating-hover,
//                                     --dsw-alias-interactive-bg-hover-solid
//            Deliberately NOT covered: --dsw-alias-button-primary-fill (the
//            high-contrast CTA, whose label depends on a fixed dark fill),
//            the toolbar tokens (they carry their own alpha) and the
//            ghost-active pairs (a selected state, not a resting fill).
//   text   - main text: --dsw-alias-label-primary, with secondary and tertiary
//            derived from it so the type hierarchy stays coherent.
//   accent - focus ring, links, info buttons, and the composer send button
//            (`.RlGAzG_primary` uses --dsw-alias-button-info-fill).
//
// Every token value MUST be a { light, dark } pair: the runtime rejects a bare
// string on purpose, because one value for both palettes goes illegible when
// the user switches colour scheme.
//
// Derived relationships, all mixed in sRGB:
//   surfaces  = mix(bg,  #ffffff, k)         (elevated = lighter, both palettes)
//   secondary = mix(text, bg, 0.18 dark / 0.34 light)
//   tertiary  = mix(text, bg, 0.32 dark / 0.475 light)
//
// NOT used: --dsw-alias-brand-primary (resolves to neutral-bluish-1000 #0f1115
// in light mode, the near-black primary-button fill) and
// --dsw-alias-tooltip-bg / --dsw-alias-bg-overlay (their light-palette values
// are intentionally dark, so deriving them from a light background would flip
// their meaning).
window.__ModuleLoader__.load({
  id: 'dsh-accent-theme',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')

    // --- Defaults ------------------------------------------------------------
    // Dark ships #151531: a navy canvas that reads as "this window" next to the
    // near-black (#151517) of other apps. The composer is one ramp step lighter
    // so it reads as an input, the buttons one step lighter again, and the
    // accent stays the stock blue. The button default is a compromise between
    // the two stock shades it replaces ("+" was #353638, "Новая сессия"
    // #43454a) because one colour now drives both.
    const DEFAULTS = {
      dark: { bg: '#151531', input: '#2c2c46', button: '#38384f', text: '#f9fafb', accent: '#7aaaff' },
      light: { bg: '#ffffff', input: '#ffffff', button: '#f9fafb', text: '#0f1115', accent: '#4176e6' },
    }
    const STORAGE_KEY = 'dsh-accent-theme:settings:v2'

    const HEX = /^#[0-9a-fA-F]{6}$/
    const MODES = ['dark', 'light']

    function rgbOf(hex) {
      const n = parseInt(hex.slice(1), 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    function hexOf(ch) {
      return '#' + ch.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')
    }
    /** Mix `hex` toward `target` (#ffffff / #000000 / another hex) by `amount`. */
    function mix(hex, target, amount) {
      if (!HEX.test(hex) || !HEX.test(target)) return hex
      const a = rgbOf(hex)
      const b = rgbOf(target)
      return hexOf(a.map((c, i) => c + (b[i] - c) * amount))
    }
    function luminance(hex) {
      if (!HEX.test(hex)) return 0
      const ch = rgbOf(hex).map((c) => {
        const s = c / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
    }
    function contrast(a, b) {
      const la = luminance(a)
      const lb = luminance(b)
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
    }
    /** Readable text colour for a surface: light on dark, dark on light. */
    function autoText(bg) {
      if (!HEX.test(bg)) return DEFAULTS.dark.text
      return luminance(bg) < 0.35 ? '#f9fafb' : '#0f1115'
    }

    // --- Persistence ---------------------------------------------------------
    function normalize(raw) {
      const out = { dark: { ...DEFAULTS.dark }, light: { ...DEFAULTS.light } }
      if (raw === null || typeof raw !== 'object') return out
      for (const mode of MODES) {
        const src = raw[mode]
        if (src === null || typeof src !== 'object') continue
        if (typeof src.bg === 'string' && HEX.test(src.bg)) out[mode].bg = src.bg
        if (typeof src.accent === 'string' && HEX.test(src.accent)) out[mode].accent = src.accent
        // Older payloads only had bg + accent; derive what is missing so the
        // result stays coherent with whatever canvas the user already picked.
        out[mode].input =
          typeof src.input === 'string' && HEX.test(src.input) ? src.input : mix(out[mode].bg, '#ffffff', 0.1)
        out[mode].button =
          typeof src.button === 'string' && HEX.test(src.button)
            ? src.button
            : mix(out[mode].bg, '#ffffff', 0.155)
        out[mode].text =
          typeof src.text === 'string' && HEX.test(src.text) ? src.text : autoText(out[mode].bg)
      }
      return out
    }

    function readSettings() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw !== null) return normalize(JSON.parse(raw))
      } catch {
        /* fall through to defaults */
      }
      return { dark: { ...DEFAULTS.dark }, light: { ...DEFAULTS.light } }
    }

    function writeSettings(value) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        /* storage unavailable; the live override still applies */
      }
    }

    // --- Live state ----------------------------------------------------------
    let settings = readSettings()
    const listeners = new Set()
    function subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    }
    function emit() {
      for (const fn of listeners) fn()
    }

    /** Build the { light, dark } token layer for the current settings. */
    function buildTokens() {
      const L = settings.light
      const D = settings.dark
      const tokens = {}
      const add = (name, light, dark) => {
        tokens[name] = { light, dark }
      }

      // Window canvas.
      add('--dsw-alias-bg-base', L.bg, D.bg)
      add('--dsw-alias-bg-document-preview', L.bg, D.bg)

      // Surface ramp: toward white, so "elevated = lighter" holds in both
      // palettes. Dark steps are small; light steps are large because a
      // near-white base must stay near-white (stock light layers are #fff).
      const ramp = { light: [0.35, 0.55, 0.75], dark: [0.055, 0.1, 0.145] }
      const layers = ['--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2', '--dsw-alias-bg-layer-3']
      for (const [i, name] of layers.entries()) {
        add(name, mix(L.bg, '#ffffff', ramp.light[i]), mix(D.bg, '#ffffff', ramp.dark[i]))
      }
      add('--dsw-alias-bg-module-platform', mix(L.bg, '#ffffff', ramp.light[2]), mix(D.bg, '#ffffff', ramp.dark[2]))

      // Slightly recessed surfaces.
      add('--dsw-alias-bg-multi-select', mix(L.bg, '#000000', 0.02), mix(D.bg, '#ffffff', 0.04))
      add('--dsw-specific-sidebar-fill', mix(L.bg, '#000000', 0.02), mix(D.bg, '#ffffff', 0.03))
      add('--dsw-alias-markdown-code-block', mix(L.bg, '#000000', 0.02), mix(D.bg, '#ffffff', 0.03))

      // Scrollbar rails follow the same ramp.
      add('--dsw-alias-scrollbar-bg-l1', mix(L.bg, '#000000', 0.1), mix(D.bg, '#ffffff', 0.22))
      add('--dsw-alias-scrollbar-bg-l2', mix(L.bg, '#000000', 0.17), mix(D.bg, '#ffffff', 0.35))
      add('--dsw-alias-scrollbar-hover-l1', mix(L.bg, '#000000', 0.17), mix(D.bg, '#ffffff', 0.35))

      // Composer / text field fill.
      add('--dsw-specific-input-major', L.input, D.input)

      // Neutral filled buttons, all driven by the single button colour.
      // The hover tokens are shared "solid interactive" surfaces, so they are
      // tinted from the button colour rather than left at the stock grey,
      // which would flash on a coloured button.
      const hoverL = mix(L.button, '#000000', 0.08)
      const hoverD = mix(D.button, '#ffffff', 0.12)
      add('--dsw-alias-button-elevated-fill', L.button, D.button) // "Новая сессия"
      add('--dsw-alias-button-floating-fill', L.button, D.button) // floating buttons
      add('--dsw-alias-button-floating-hover', hoverL, hoverD) // their hover
      add('--dsw-specific-selector', L.button, D.button) // "+" in the composer
      add('--dsw-alias-interactive-bg-hover-solid', hoverL, hoverD) // "+" hover

      // Text: the three-level hierarchy derives from the chosen text colour.
      add('--dsw-alias-label-primary', L.text, D.text)
      add('--dsw-alias-label-secondary', mix(L.text, L.bg, 0.34), mix(D.text, D.bg, 0.18))
      add('--dsw-alias-label-tertiary', mix(L.text, L.bg, 0.475), mix(D.text, D.bg, 0.32))

      // Accent family (also the composer send button).
      add('--dsw-alias-state-business-primary', L.accent, D.accent)
      add('--dsw-alias-link', L.accent, D.accent)
      add('--dsw-alias-button-info-fill', L.accent, D.accent)
      add('--dsw-alias-button-info-hover', mix(L.accent, '#000000', 0.12), mix(D.accent, '#ffffff', 0.15))

      return tokens
    }

    const CSS = [
      '.ac-row{display:flex;flex-direction:column;gap:14px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}',
      '.ac-title{margin:0;font-size:14px;font-weight:400;color:var(--dsw-alias-label-primary);line-height:22px}',
      '.ac-desc{margin:2px 0 0;font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:18px}',
      '.ac-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}',
      '.ac-card{display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}',
      '.ac-card-head{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.ac-reset{border:none;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;cursor:pointer;padding:3px 8px;border-radius:6px}',
      '.ac-reset:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.ac-field{display:flex;align-items:center;gap:10px}',
      '.ac-field-label{flex:1;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.ac-hex{width:96px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 8px;font-family:ui-monospace,Menlo,monospace;font-size:12px}',
      '.ac-swatch{width:30px;height:30px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);padding:0;background:0 0;cursor:pointer;flex:none}',
      '.ac-preview{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2)}',
      '.ac-preview-field{display:flex;align-items:center;gap:8px;border-radius:12px;padding:6px 8px;font-size:12px;line-height:18px}',
      '.ac-preview-btn{width:18px;height:18px;border-radius:50%;flex:none}',
      '.ac-dot{width:10px;height:10px;border-radius:50%;flex:none}',
      '.ac-hint{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.ac-warn{font-size:11px;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-state-warn-primary);color:#1a1a1a;white-space:nowrap}',
    ].join('')

    function WindowThemeSettings() {
      const [local, setLocal] = React.useState(() => ({
        dark: { ...settings.dark },
        light: { ...settings.light },
      }))
      React.useEffect(() => {
        return subscribe(() => setLocal({ dark: { ...settings.dark }, light: { ...settings.light } }))
      }, [])

      const commit = (next) => {
        setLocal(next)
        settings = next
        writeSettings(next)
        emit()
      }

      // Draft edit: show the typed value immediately, commit only when valid.
      const edit = (mode, key, value) => {
        const next = { dark: { ...local.dark }, light: { ...local.light } }
        next[mode][key] = value
        setLocal(next)
        if (HEX.test(value)) commit(next)
      }

      // Restore one palette only; the other theme keeps its colours.
      const resetMode = (mode) => {
        const next = { dark: { ...local.dark }, light: { ...local.light } }
        next[mode] = { ...DEFAULTS[mode] }
        commit(next)
      }

      const field = (mode, key, label) =>
        React.createElement(
          'div',
          { className: 'ac-field' },
          React.createElement('span', { className: 'ac-field-label' }, label),
          React.createElement('input', {
            className: 'ac-hex',
            value: local[mode][key],
            spellCheck: false,
            'aria-label': label,
            onChange: (e) => edit(mode, key, e.target.value),
          }),
          React.createElement('input', {
            className: 'ac-swatch',
            type: 'color',
            value: HEX.test(local[mode][key]) ? local[mode][key] : '#000000',
            onChange: (e) => edit(mode, key, e.target.value),
          }),
        )

      const card = (mode, label) => {
        const { bg, input, button, text, accent } = local[mode]
        const textRatio = contrast(bg, text)
        const accentRatio = contrast(accent, bg)
        const valid = HEX.test(bg) && HEX.test(text)
        const warn = !valid
          ? null
          : textRatio < 4.5
            ? React.createElement(
                'span',
                { className: 'ac-warn', title: 'Контраст текста ' + textRatio.toFixed(2) + ':1' },
                'текст плохо читается',
              )
            : HEX.test(accent) && accentRatio < 3
              ? React.createElement(
                  'span',
                  { className: 'ac-warn', title: 'Контраст акцента ' + accentRatio.toFixed(2) + ':1' },
                  'акцент сливается',
                )
              : null

        return React.createElement(
          'div',
          { className: 'ac-card' },
          React.createElement(
            'div',
            { className: 'ac-card-head' },
            React.createElement('span', { style: { flex: '1' } }, label),
            warn,
            React.createElement(
              'button',
              { className: 'ac-reset', onClick: () => resetMode(mode) },
              'Сбросить',
            ),
          ),
          // Mini preview: canvas, the input field on it, its "+" button, the
          // accent dot (send button colour) and sample text.
          React.createElement(
            'div',
            { className: 'ac-preview', style: { background: HEX.test(bg) ? bg : 'transparent' } },
            React.createElement(
              'div',
              {
                className: 'ac-preview-field',
                style: {
                  background: HEX.test(input) ? input : 'transparent',
                  color: HEX.test(text) ? text : 'inherit',
                },
              },
              React.createElement('span', {
                className: 'ac-preview-btn',
                style: { background: HEX.test(button) ? button : 'transparent' },
              }),
              React.createElement('span', { style: { flex: '1' } }, 'Пример текста'),
              React.createElement('span', {
                className: 'ac-dot',
                style: { background: HEX.test(accent) ? accent : 'transparent' },
              }),
            ),
          ),
          field(mode, 'bg', 'Фон окна'),
          field(mode, 'input', 'Фон поля ввода'),
          field(mode, 'button', 'Кнопка'),
          field(mode, 'text', 'Основной текст'),
          field(mode, 'accent', 'Акцент'),
        )
      }

      return React.createElement(
        'div',
        { className: 'ac-row' },
        React.createElement(
          'div',
          null,
          React.createElement('h3', { className: 'ac-title' }, 'Тема окна'),
          React.createElement(
            'p',
            { className: 'ac-desc' },
            'Цвета окна, поля ввода, кнопок, основного текста и акцента. Слои, боковая панель, скроллбар и вторичный текст выводятся автоматически.',
          ),
        ),
        React.createElement(
          'div',
          { className: 'ac-grid' },
          card('dark', 'Тёмная тема'),
          card('light', 'Светлая тема'),
        ),
        React.createElement(
          'div',
          { className: 'ac-hint' },
          'Применяется сразу, сохраняется в этом браузере',
        ),
      )
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      const theme = ctx.get('theme')
      if (theme === undefined) {
        console.warn('[accent-theme] theme service unavailable; no override applied')
      } else {
        // Re-push the layer whenever the user picks a colour. overrideTokens
        // replaces this source's whole layer and restacks it on top.
        const push = () => theme.overrideTokens('dsh-accent-theme', buildTokens())
        ctx.effect(() => {
          const dispose = push()
          const unsubscribe = subscribe(push)
          return () => {
            unsubscribe()
            dispose()
          }
        }, 'dsh-accent-theme: window + accent override layer')
      }

      if (slots === undefined) return

      const styleTag = document.createElement('style')
      styleTag.dataset.plugin = 'dsh-accent-theme'
      styleTag.textContent = CSS
      ctx.effect(() => {
        document.head.appendChild(styleTag)
        return () => styleTag.remove()
      }, 'dsh-accent-theme: styles')

      slots.inject('settings.section', () =>
        slots.register(
          { name: 'settings.section', id: 'dsh-accent-theme', order: 31, label: () => 'Тема окна' },
          (props) => React.createElement(WindowThemeSettings, props),
        ),
      )
    }

    const inject = []
    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
