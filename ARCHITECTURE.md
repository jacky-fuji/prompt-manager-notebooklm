# Architecture — Prompt Manager for NotebookLM

> Internal design and file-level architecture of the extension.
> For the functional specification, see [SPEC.md](SPEC.md).

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Chrome Browser                    │
│                                                     │
│  ┌──────────────┐   chrome.runtime    ┌───────────┐ │
│  │  Side Panel   │ ◄──── message ───► │  Content   │ │
│  │  (sidepanel.  │                    │  Script    │ │
│  │   html/js/css)│                    │(content.js)│ │
│  └──────┬───────┘                    └─────┬─────┘ │
│         │                                  │       │
│         │   chrome.storage.local           │       │
│         └──────────┬───────────────────────┘       │
│                    ▼                               │
│  ┌─────────────────────────────────────┐            │
│  │       Local Storage (per-user)      │            │
│  │  • prompts[]    • audioFormat       │            │
│  │  • language     • videoStyle  ...   │            │
│  └─────────────────────────────────────┘            │
│                                                     │
│  ┌──────────────┐                                   │
│  │  Background   │  (Service Worker)                │
│  │  (background. │  — opens side panel on icon click│
│  │   js)         │                                  │
│  └──────────────┘                                   │
│                                                     │
│  ┌──────────────┐                                   │
│  │  Selectors    │  (shared constants)              │
│  │  (selectors.  │  — CSS selectors for NotebookLM  │
│  │   js)         │    DOM elements                  │
│  └──────────────┘                                   │
│                                                     │
│  ┌──────────────┐                                   │
│  │ Translations  │  (i18n dictionary)               │
│  │(translations. │  — 14-language object literal     │
│  │  js)          │                                  │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

---

## 2. File Map

| File | Role | Size |
|---|---|---|
| `manifest.json` | Extension manifest (MV3). Declares permissions, content scripts, side panel, icons, and default locale. | ~900 B |
| `background.js` | Service worker. Sets `openPanelOnActionClick: true` so clicking the toolbar icon opens the side panel. | ~400 B |
| `selectors.js` | Centralized CSS selector constants (`SELECTORS`). Shared between content scripts. Loaded before `content.js`. | ~2.3 KB |
| `content.js` | Content script injected into NotebookLM pages. Handles: prompt text insertion, auto-setting recall (RPA), favorite button injection, and UI change detection. | ~57 KB |
| `translations.js` | Global `TRANSLATIONS` object keyed by locale code. Each locale maps i18n keys → translated strings for the side panel UI and NotebookLM label matching. | ~75 KB |
| `sidepanel.html` | Side panel HTML shell. Form for prompt CRUD, language selector, search box, category accordion, data management buttons, and confirmation modal. | ~10 KB |
| `sidepanel.js` | Side panel logic. State management, prompt CRUD, search/filter, tag system, category section rendering, settings persistence, import/export. | ~61 KB |
| `sidepanel.css` | Side panel styling. | ~13 KB |
| `_locales/*/messages.json` | Chrome i18n locale files for `chrome.i18n.getMessage()`. Used for extension name and description in the Chrome Web Store. | per-locale |
| `icon/` | Extension icons (16, 48, 128 px). | — |
| `docs/` | Static assets for README (`hero.png`, `screenshot.png`). | — |

---

## 3. Component Details

### 3.1 Background Script (`background.js`)

Minimal service worker with a single responsibility:

```
onInstalled → sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
```

### 3.2 Content Script (`content.js`)

Injected into `https://notebooklm.google.com/*`. Contains an IIFE that:

1. **Extension context check** — Validates `chrome.runtime.id` to avoid errors after extension reload.
2. **State variables** — Caches settings (`autoDeepResearchEnabled`, `audioFormat`, etc.) and `favoritePrompts[]`.
3. **Settings loader** (`refreshSettings`) — Reads all settings from `chrome.storage.local` on load, and listens for changes via `chrome.storage.onChanged`.
4. **Focus tracking** — Monitors `focusin` events to track the last focused `<textarea>` or `contentEditable` element.
5. **Message listener** — Receives `{ action: 'insertText', text }` from the side panel and calls `insertText()`.
6. **`insertText(text, contextElement)`** — Inserts text into the target input field. Handles `<textarea>`, `<input>`, and `contentEditable` elements.
7. **`createFavoriteButtons(category, subCategory)`** — Builds a container of ⭐ buttons for a given category; each button calls `insertText()` on click.
8. **`setupObserver()` → `MutationObserver`** — Watches the entire `document.body` for structural DOM changes. On each mutation batch (throttled via `requestAnimationFrame`):
   - **Auto-selection (A–H):** For each dialog type (Audio, Flashcard, Quiz, Infographic, Slide, Video, Chat), finds the dialog by its title text (multilingual matching), then clicks the matching radio buttons / toggle buttons per saved preferences. Marks dialogs with `data-auto-formatted-*` attributes to prevent re-processing.
   - **Favorite injection (A–D):** Injects ⭐ buttons next to label elements identified by `SELECTORS.INJECTION_LABELS`, inside `.actions-options` containers, above the omnibar (chat), and inside the Customize Chat dialog's style section.
   - **Menu expansion:** When Deep Research is enabled, auto-opens the "Research" dropdown menu.
   - **Cleanup:** Removes stale `data-auto-*` attributes from detached elements.
9. **UI change warning** — If the `omnibar` element is not found within ~10 seconds, logs a warning (optional toast notification).

### 3.3 Selector Registry (`selectors.js`)

Global `SELECTORS` object with three groups:

- **Top-level selectors:** `DEEP_RESEARCH_BTN`, `MENU_TRIGGERS`, `ACTIONS_OPTIONS`, `OMNIBAR`, `PROMPT_SECTION_TOGGLES`.
- **`DIALOGS`:** Complex CSS selectors for each dialog type, using `:not([data-auto-formatted*])` to skip already-processed dialogs.
- **`DIALOG_INTERNALS`:** Selectors for elements within dialogs (tile labels, control wrappers, radio buttons, toggle buttons, etc.).

### 3.4 Side Panel (`sidepanel.html` + `sidepanel.js` + `sidepanel.css`)

#### State Management

A central `state` object holds ephemeral UI state:

```js
state = { language, currentInputTags[], searchQuery, selectedTags, onConfirmAction, videoTab, chatTab }
```

#### Key Functions

| Function | Purpose |
|---|---|
| `t(key)` | Translation helper: `TRANSLATIONS[lang][key]` → `chrome.i18n.getMessage` fallback |
| `updateStaticTranslations()` | Applies `data-i18n` / `data-i18n-placeholder` attributes |
| `initCategorySections()` | Dynamically builds category accordion sections with per-category settings panels |
| `loadAndRenderPrompts()` | Main render loop: reads storage → updates settings UI → renders prompt cards |
| `renderCategorizedList(prompts)` | Renders prompt cards grouped by category, respecting search/filter/tab |
| `updateTagCloud(prompts)` | Builds clickable tag chips for filtering |
| Import / Export | `btnExport` → JSON download; `btnImportTrigger` → file picker → JSON merge |

#### Category-Specific Settings

Each category section may include inline settings controls (dropdowns, toggles) that persist to `chrome.storage.local` and are reflected by the content script's auto-selection logic.

### 3.5 Translations (`translations.js`)

A single `TRANSLATIONS` object literal:

```js
const TRANSLATIONS = {
  en: { "app-title": "Prompt Manager for NotebookLM", ... },
  ja: { ... },
  es: { ... },
  // ... 14 locales total
};
```

Keys match `data-i18n` attributes in `sidepanel.html` and are used by `t(key)` in `sidepanel.js`.

### 3.6 Label Matching Maps (`content.js`)

Format/option mapping constants used by the auto-selection logic to match NotebookLM's UI labels across languages:

```
AUDIO_FORMAT_MAP, AUDIO_LENGTH_MAP, REPORT_FORMAT_MAP,
VIDEO_FORMAT_MAP, VIDEO_STYLE_MAP, FLASHCARD_COUNT_MAP,
FLASHCARD_DIFFICULTY_MAP, INFOGRAPHIC_LAYOUT_MAP,
INFOGRAPHIC_DETAIL_LEVEL_MAP, SLIDE_FORMAT_MAP, SLIDE_LENGTH_MAP,
CHAT_GOAL_MAP, CHAT_LENGTH_MAP
```

Each map is `{ internalKey: [label_ja, label_en, label_de, ...] }`.

---

## 4. Data Flow

### 4.1 Prompt Insertion Flow

```
User clicks prompt card (side panel)
  → sidepanel.js sends chrome.runtime.sendMessage({ action: 'insertText', text })
    → content.js receives message
      → insertText(text) into lastFocusedElement
        → dispatches 'input' event to notify NotebookLM's framework
```

### 4.2 Auto-Setting Flow

```
User opens a NotebookLM dialog (e.g., Audio Overview)
  → MutationObserver in content.js detects new dialog DOM
    → Reads cached setting (e.g., audioFormat = '議論')
      → Finds matching label via AUDIO_FORMAT_MAP
        → Clicks the corresponding radio/toggle button
          → Marks dialog with data-auto-formatted="true"
```

### 4.3 Settings Sync Flow

```
User changes a setting in the side panel dropdown
  → sidepanel.js writes to chrome.storage.local
    → chrome.storage.onChanged listener in content.js updates cached variable
      → Next MutationObserver cycle uses updated value
```

---

## 5. Security & Privacy

- **No external network requests.** All data stays in `chrome.storage.local`.
- **No analytics or tracking.** See [PRIVACY.md](PRIVACY.md).
- **Content Security Policy:** `script-src 'self'; object-src 'self'`
- **Host permissions** limited to `https://notebooklm.google.com/*`.
- **Extension context validation:** `content.js` checks `chrome.runtime.id` before any operation to avoid errors after hot-reload.

---

---

## 6. Related Documents

- [README.md](README.md) — Project overview, installation, and usage
- [SPEC.md](SPEC.md) — Functional specification
- [PRIVACY.md](PRIVACY.md) — Privacy policy
- [LICENSE](LICENSE) — MIT License

---

## 7. Development Guidelines & SOP

### 7.1 Lifecycle of a New Setting

When adding a new auto-setting (e.g., "Infographic Visual Style"), the following **5-step checklist** must be followed to avoid synchronization bugs:

1.  **Side Panel UI (`sidepanel.html/js`)**:
    - Add the `<select>` or `<input>` to `sidepanel.html`.
    - Add a `change` event listener in `sidepanel.js` to save the value to `chrome.storage.local`.
2.  **Content Script Initialization (`content.js` - `refreshSettings`)**:
    - [ ] Add the key to the `chrome.storage.local.get` array.
    - [ ] **CRITICAL**: Assign the result to a local variable (e.g., `infographicStyle = result.infographicStyle || 'Default'`).
3.  **Content Script Awareness (`content.js` - `chrome.storage.onChanged`)**:
    - [ ] Add a listener block to update the local variable when the user changes it in the side panel.
4.  **Label Mapping (`content.js` / `translations.js`)**:
    - Create a mapping object (e.g., `INFOGRAPHIC_STYLE_MAP`) to handle multi-language label matching.
5.  **Automation Logic (`content.js` - `setupObserver`)**:
    - Implement the clicking logic.

### 7.2 Robust Automation Patterns

- **Prefer Carousel Direct Selection**: For carousel-based radios (common in NotebookLM), use `SELECTORS.DIALOG_INTERNALS.CAROUSEL_LABEL` and iterate through all labels. This is more robust than looking for a section title (e.g., "Visual Style"), as section titles are prone to localization differences (e.g., presence/absence of spaces).
- **Throttle with `requestAnimationFrame`**: All DOM interactions should be inside the throttled observer loop to handle rapid UI changes.
- **Mark as Processed**: Always set a `data-auto-formatted-*` attribute on the dialog container once all settings are applied to prevent infinite loops and reduce CPU overhead.
