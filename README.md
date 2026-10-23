# dsh-accent-theme

Тема окна для DeepSeek Harness (DSH Web GUI): цвет фона окна, поля ввода,
кнопок, основного текста и акцента — отдельно для тёмной и светлой темы.

Плагин использует только официальную точку расширения
`ctx.theme.overrideTokens()` из `@deepseek-ai/dsh-client-ui-theme`;
файлы вендора не патчатся.

## Что настраивается

Раздел **Настройки → Тема окна** (слот `settings.section`, порядок 31).
Пять цветов на каждую тему, применяются сразу и сохраняются в браузере.

| Настройка | Токены |
|---|---|
| **Фон окна** | `--dsw-alias-bg-base`, `--dsw-alias-bg-document-preview`, `--dsw-alias-bg-layer-1/2/3`, `--dsw-alias-bg-module-platform`, `--dsw-alias-bg-multi-select`, `--dsw-specific-sidebar-fill`, `--dsw-alias-markdown-code-block`, `--dsw-alias-scrollbar-bg-l1/l2`, `--dsw-alias-scrollbar-hover-l1` |
| **Фон поля ввода** | `--dsw-specific-input-major` |
| **Кнопка** | `--dsw-alias-button-elevated-fill`, `--dsw-alias-button-floating-fill`, `--dsw-specific-selector` + ховеры `--dsw-alias-button-floating-hover`, `--dsw-alias-interactive-bg-hover-solid` |
| **Основной текст** | `--dsw-alias-label-primary`, `--dsw-alias-label-secondary`, `--dsw-alias-label-tertiary` |
| **Акцент** | `--dsw-alias-state-business-primary`, `--dsw-alias-link`, `--dsw-alias-button-info-fill`, `--dsw-alias-button-info-hover` |

Итого 25 токенов. Значения по умолчанию — константа `DEFAULTS` в
`lib/client.js`:

| | фон | поле | кнопка | текст | акцент |
|---|---|---|---|---|---|
| тёмная | `#151531` | `#2c2c46` | `#38384f` | `#f9fafb` | `#7aaaff` |
| светлая | `#ffffff` | `#ffffff` | `#f9fafb` | `#0f1115` | `#4176e6` |

Светлая тема по умолчанию совпадает со стоковой.

## Производные значения

Считаются в sRGB, вручную задавать не нужно:

```
слои      = mix(bg, #ffffff, k)   # k: тёмная 5.5/10/14.5%, светлая 35/55/75%
secondary = mix(text, bg, 0.18)   # светлая 0.34
tertiary  = mix(text, bg, 0.32)   # светлая 0.475
ховер кнопки = mix(button, #fff, 0.12) тёмная / mix(button, #000, 0.08) светлая
```

Слои смешиваются к белому, поэтому «приподнятая поверхность светлее фона»
выполняется в обеих темах. Вторичный и третичный текст выводятся из основного,
иначе при необычном цвете текста иерархия рассыпалась бы.

## Установка

Требуется DSH с включённым web-профилем. Плагин ставится в профиль
(у десктопного приложения он называется `desktop`).

### Вариант 1: через CLI

```powershell
# 1. положить репозиторий в постоянное место на стороне Windows
#    (например %USERPROFILE%\.dsh\plugins\dsh-accent-theme)

# 2. поставить как зависимость профиля
dsh plugin --profile desktop add "file:$env:USERPROFILE\.dsh\plugins\dsh-accent-theme"

# 3. перезапустить DSH
```

`dsh plugin` просто вызывает `pnpm add` в папке профиля, поэтому зависимость
попадает в `package.json` и lockfile. У пакета объявлен `dsh.bundle.patch`,
поэтому бандл обычно прописывается автоматически; если нет — добавить
`dsh-accent-theme` в `dsh.profile.bundles`.

### Вариант 2: вручную

1. Скопировать папку в `%USERPROFILE%\.dsh\profiles\desktop\node_modules\dsh-accent-theme`.
2. В `%USERPROFILE%\.dsh\profiles\desktop\package.json` добавить
   `"dsh-accent-theme"` в `dependencies` и в `dsh.profile.bundles`.
3. Перезапустить DSH.

Способ рабочий, но хрупкий: профиль использует pnpm, и пакета нет в lockfile —
любой `dsh plugin add/remove` или `pnpm install` может его вычистить.
Предпочтителен вариант 1.

### Обновление после правок

```powershell
$p = "$env:USERPROFILE\.dsh\plugins\dsh-accent-theme"
robocopy <путь-к-репозиторию> $p /E /NFL /NDL /NJH /NJS /NP
```

Затем перезапустить DSH: горячей перезагрузки у готовой сборки нет.

## Где хранятся выбранные цвета

Не в файлах плагина, а в браузере: `localStorage`, ключ
`dsh-accent-theme:settings:v2`, структура
`{ dark: {bg,input,button,text,accent}, light: {...} }`.

Физически Windows: `%APPDATA%\@deepseek-ai\dsh-desktop\Local Storage\leveldb`.
Поэтому при переносе на другой ПК цвета не переезжают — плагин стартует с
`DEFAULTS`. Чтобы перенести, либо выберите заново в настройках, либо впишите
нужные цвета в `DEFAULTS` в `lib/client.js`.

Если в хранилище лежит более старая структура (только `bg` + `accent`),
`normalize()` достроит остальные поля: поле ввода и кнопка выводятся из фона,
текст подбирается по яркости фона.

## Языки

Интерфейс раздела переводится вслед за языком DSH. Словари зарегистрированы
через сервис `locale` (`@deepseek-ai/dsh-client-locale`):

| Язык DSH | Что покажет плагин |
|---|---|
| English (`en`) | английский |
| 中文 (`zh`) | китайский |
| Русский (`ru`) | русский |
| любой другой | **английский** |

`en` и `zh` — встроенные локали DSH, регистрируются объектной формой
`locale.register(ns, { en, zh })`. Русский добавляется пакетом-русификатором как
внешний язык, поэтому его словарь регистрируется отдельно:
`locale.register(ns, 'ru', {...})`. Если русификатора нет, словарь просто не
попадает ни в одну цепочку — ошибки не будет.

Ключевое: поиск строки идёт по цепочке fallback активного языка, и она **всегда
завершается на `en`**. Поэтому при любом языке без нашего словаря показывается
английский — это и есть требуемое поведение, отдельной проверки не нужно.
Если сервис `locale` недоступен вовсе, плагин тоже показывает английский.

Строки, отрисованные в слоте настроек, переключаются без перезагрузки страницы:
компонент подписан на `locale.subscribe` через `useSyncExternalStore`.

## Структура

```
package.json        манифест; объявляет dsh.client (браузерная половина) и dsh.bundle.patch
cordis.patch.yml    точка монтирования: строка id: accent-theme
lib/index.js        хостовая половина (пустая; нужна, чтобы строка смонтировалась)
lib/client.js       вся логика: цвета, производные, словари en/zh/ru, раздел настроек
```

## Грабли

1. **BOM в `package.json` профиля ломает запуск DSH**:
   `SyntaxError: Unexpected token '', "﻿{" is not valid JSON`. `Set-Content
   -Encoding UTF8` в PowerShell 5 добавляет BOM; писать через
   `[System.IO.File]::WriteAllText($p, $json, (New-Object System.Text.UTF8Encoding($false)))`.
2. **Несуществующий токен не даёт ошибки** — присвоение просто ничего не делает.
   Имена токенов проверяются поиском по исходнику ui-theme:
   `Select-String -Path <ui-theme>/lib/client.js -Pattern '--dsw-alias-<имя>:'`.
3. **Значения обязаны быть парами `{ light, dark }`** — голая строка кидает
   `TypeError` намеренно, иначе при смене темы текст станет нечитаемым.

## Лицензия

MIT — полный текст в [LICENSE](LICENSE).

Коротко: можно использовать, менять и встраивать в том числе в закрытые
проекты; нужно лишь сохранить текст лицензии. Альтернативы, если понадобится:
Apache-2.0 (то же плюс явная патентная лицензия), GPL/AGPL (производные обязаны
оставаться открытыми).
