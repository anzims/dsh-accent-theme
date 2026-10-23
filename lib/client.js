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
//              "New session"       -> --dsw-alias-button-elevated-fill
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
//            (.RlGAzG_primary uses --dsw-alias-button-info-fill).
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
// Localisation: dictionaries for the two locales DSH ships (en, zh) plus ru.
// Lookup walks the active language's fallback chain and always terminates at
// `en`, so any other selected language shows English. Without the `locale`
// service the UI falls back to English too.
window.__ModuleLoader__.load({
  id: 'dsh-accent-theme',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const NS = 'dsh-accent-theme'

    // --- Dictionaries --------------------------------------------------------
    const DICTS = {
      en: {
        navTitle: 'Window theme',
        desc: 'Colours for the window, input field, buttons, text and accent. Layers, sidebar, scrollbar and secondary text are derived automatically.',
        darkTheme: 'Dark theme',
        lightTheme: 'Light theme',
        bg: 'Window background',
        input: 'Input background',
        button: 'Button',
        text: 'Main text',
        accent: 'Accent',
        reset: 'Reset',
        previewText: 'Sample text',
        previewButton: 'New session',
        hint: 'Applied immediately, saved in this browser',
        warnText: 'text contrast too low',
        warnTextTitle: 'Text contrast {ratio}:1',
        warnAccent: 'accent blends in',
        warnAccentTitle: 'Accent contrast {ratio}:1',
      },
      zh: {
        navTitle: '窗口主题',
        desc: '窗口背景、输入框、按钮、正文与强调色。层级、侧边栏、滚动条与次要文字会自动推导。',
        darkTheme: '深色主题',
        lightTheme: '浅色主题',
        bg: '窗口背景',
        input: '输入框背景',
        button: '按钮',
        text: '正文颜色',
        accent: '强调色',
        reset: '重置',
        previewText: '示例文字',
        previewButton: '新建会话',
        hint: '立即生效，保存在当前浏览器中',
        warnText: '文字对比度不足',
        warnTextTitle: '文字对比度 {ratio}:1',
        warnAccent: '强调色不明显',
        warnAccentTitle: '强调色对比度 {ratio}:1',
      },
      ru: {
        navTitle: 'Тема окна',
        desc: 'Цвета окна, поля ввода, кнопок, текста и акцента. Слои, боковая панель, скроллбар и вторичный текст выводятся автоматически.',
        darkTheme: 'Тёмная тема',
        lightTheme: 'Светлая тема',
        bg: 'Фон окна',
        input: 'Фон поля ввода',
        button: 'Кнопка',
        text: 'Основной текст',
        accent: 'Акцент',
        reset: 'Сбросить',
        previewText: 'Пример текста',
        previewButton: 'Новая сессия',
        hint: 'Применяется сразу, сохраняется в этом браузере',
        warnText: 'текст плохо читается',
        warnTextTitle: 'Контраст текста {ratio}:1',
        warnAccent: 'акцент сливается',
        warnAccentTitle: 'Контраст акцента {ratio}:1',
      },
    }

    function interpolate(template, params) {
      if (!params) return template
      return template.replace(/\{(\w+)\}/g, (match, name) =>
        name in params ? String(params[name]) : match,
      )
    }

    /**
     * Translator over the `locale` client service. Registration is lazy and
     * owned by an effect, so a plugin unload removes exactly its dictionaries.
     * The built-in pair goes through the object form; `ru` is an external
     * language added by a language pack, so it uses the per-locale form and is
     * harmless when that pack is absent (its dictionary simply never sits in a
     * fallback chain).
     */
    function makeTranslator(ctx) {
      let face
      let removeBuiltins
      let removeRu
      let unsubscribe
      let failed = false
      const listeners = new Set()
      let revision = 0

      const ensure = () => {
        if (face !== undefined || failed) return
        const locale = ctx.get('locale')
        if (locale === undefined) return
        try {
          removeBuiltins = locale.register(NS, { en: DICTS.en, zh: DICTS.zh })
          try {
            removeRu = locale.register(NS, 'ru', DICTS.ru)
          } catch {
            // A language pack may already own this locale for our namespace.
            removeRu = undefined
          }
          face = locale.bind(NS)
          if (typeof locale.subscribe === 'function') {
            unsubscribe = locale.subscribe(() => {
              revision += 1
              for (const cb of listeners) cb()
            })
          }
        } catch (error) {
          // Never retry on every render: a throwing registration would otherwise
          // break the whole settings section instead of just losing translations.
          failed = true
          console.warn('[accent-theme] locale registration failed; using English', error)
        }
      }

      ctx.effect(
        () => () => {
          if (unsubscribe !== undefined) unsubscribe()
          if (removeRu !== undefined) removeRu()
          if (removeBuiltins !== undefined) removeBuiltins()
        },
        'dsh-accent-theme: locale dictionaries',
      )

      return {
        t(key, params) {
          ensure()
          if (face !== undefined) return face(key, params)
          // No locale service: English is the safe default.
          return interpolate(DICTS.en[key] ?? key, params)
        },
        getSnapshot() {
          ensure()
          return revision
        },
        subscribe(cb) {
          listeners.add(cb)
          return () => listeners.delete(cb)
        },
      }
    }

    // --- Defaults ------------------------------------------------------------
    // Dark ships #151531: a navy canvas that reads as "this window" next to the
    // near-black (#151517) of other apps. The composer is one ramp step lighter
    // so it reads as an input, the buttons one step lighter again, and the
    // accent stays the stock blue. The button default is a compromise between
    // the two stock shades it replaces ("+" was #353638, "New session" #43454a)
    // because one colour now drives both.
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
      const hoverL = mix(L.button, '#000000', 0.08)
      const hoverD = mix(D.button, '#ffffff', 0.12)
      add('--dsw-alias-button-elevated-fill', L.button, D.button)
      add('--dsw-alias-button-floating-fill', L.button, D.button)
      add('--dsw-alias-button-floating-hover', hoverL, hoverD)
      add('--dsw-specific-selector', L.button, D.button)
      add('--dsw-alias-interactive-bg-hover-solid', hoverL, hoverD)

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
      '.ac-preview-sample{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ac-preview-round{display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;flex:none;font-size:12px;line-height:1;font-weight:500}',
      '.ac-preview-row{display:flex;gap:8px;align-items:center}',
      // Big buttons in DSH carry a hairline border (ui-sidebar ._2H3hWW_newSession:
      // .5px solid --dsw-alias-border-l3, radius-md, height 38px), while the round
      // "+" (--dsw-specific-selector) has none. Reproduce both so the preview
      // shows the difference instead of a uniform swatch.
      '.ac-preview-pill{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:100%;height:34px;padding:6px 12px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l3);font-size:12px;line-height:18px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ac-hint{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.ac-warn{font-size:11px;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-state-warn-primary);color:#1a1a1a;white-space:nowrap}',
    ].join('')

    function WindowThemeSettings(props) {
      const translator = props.translator
      // Re-render on language switches; slot-rendered copy follows live.
      React.useSyncExternalStore(translator.subscribe, translator.getSnapshot)
      const t = translator.t

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
                { className: 'ac-warn', title: t('warnTextTitle', { ratio: textRatio.toFixed(2) }) },
                t('warnText'),
              )
            : HEX.test(accent) && accentRatio < 3
              ? React.createElement(
                  'span',
                  { className: 'ac-warn', title: t('warnAccentTitle', { ratio: accentRatio.toFixed(2) }) },
                  t('warnAccent'),
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
              t('reset'),
            ),
          ),
          // Mini preview: the canvas, the input field on it (with its "+" button
          // and the accent send button), and a filled button underneath, so all
          // five colours are shown in context instead of as bare swatches.
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
              React.createElement(
                'span',
                {
                  className: 'ac-preview-round',
                  style: {
                    background: HEX.test(button) ? button : 'transparent',
                    color: HEX.test(text) ? text : 'inherit',
                  },
                },
                '+',
              ),
              React.createElement('span', { className: 'ac-preview-sample' }, t('previewText')),
              React.createElement(
                'span',
                {
                  className: 'ac-preview-round',
                  style: {
                    background: HEX.test(accent) ? accent : 'transparent',
                    // Readable glyph on whatever accent the user picked.
                    color: autoText(accent),
                  },
                },
                '\u2191',
              ),
            ),
            React.createElement(
              'div',
              { className: 'ac-preview-row' },
              React.createElement(
                'span',
                {
                  className: 'ac-preview-pill',
                  style: {
                    background: HEX.test(button) ? button : 'transparent',
                    color: HEX.test(text) ? text : 'inherit',
                  },
                },
                t('previewButton'),
              ),
            ),
          ),
          field(mode, 'bg', t('bg')),
          field(mode, 'input', t('input')),
          field(mode, 'button', t('button')),
          field(mode, 'text', t('text')),
          field(mode, 'accent', t('accent')),
        )
      }

      return React.createElement(
        'div',
        { className: 'ac-row' },
        React.createElement(
          'div',
          null,
          React.createElement('h3', { className: 'ac-title' }, t('navTitle')),
          React.createElement('p', { className: 'ac-desc' }, t('desc')),
        ),
        React.createElement(
          'div',
          { className: 'ac-grid' },
          card('dark', t('darkTheme')),
          card('light', t('lightTheme')),
        ),
        React.createElement('div', { className: 'ac-hint' }, t('hint')),
      )
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      const theme = ctx.get('theme')
      const translator = makeTranslator(ctx)

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
          {
            name: 'settings.section',
            id: 'dsh-accent-theme',
            order: 31,
            label: () => translator.t('navTitle'),
          },
          (props) => React.createElement(WindowThemeSettings, { ...props, translator }),
        ),
      )
    }

    const inject = []
    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
