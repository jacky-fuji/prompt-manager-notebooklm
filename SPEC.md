# Specification — Prompt Manager for NotebookLM

> Complete functional specification for the Chrome extension.
> For architecture and design details, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Overview

**Prompt Manager for NotebookLM** is a Chrome extension that allows users to save, organize, and one-click inject reusable prompts into [Google NotebookLM](https://notebooklm.google.com).

- **Extension Type:** Chrome Extension (Manifest V3)
- **Target Site:** `https://notebooklm.google.com/*`
- **License:** [MIT](LICENSE)
- **Privacy:** [PRIVACY.md](PRIVACY.md)

---

## 2. Feature Requirements

### 2.1 Prompt Management

| Feature | Description |
|---|---|
| **Create / Edit / Delete** | Full CRUD for prompts via the side panel form. |
| **Title** | Max 20 characters. |
| **Content** | Max 10,000 characters (long-form prompt support). |
| **Tags** | Up to 10 tags per prompt, max 20 characters each. |
| **Favorites** | Mark any prompt as ⭐ favorite for quick-access injection. |
| **Prompts per category** | Max 20 prompts per category. |

### 2.2 Category System

Each prompt belongs to exactly one category. Some categories support subcategories.

| Category | Internal Key | Subcategories |
|---|---|---|
| Research Sources | `research` | — |
| Chat | `chat` | `chat` (main input), `style` (Conversation Style) |
| Audio Overview | `audio` | — |
| Video Overview | `video` | `focus` (AI Host Focus), `style` (Custom Visual Style) |
| Reports | `report` | — |
| Flashcards | `flashcard` | — |
| Quiz | `quiz` | — |
| Infographic | `infographic` | — |
| Slide Deck | `slide` | — |
| Data Table | `datatable` | — |

### 2.3 Prompt Injection

- **One-click injection:** Click a prompt card → the prompt text is inserted into the currently focused NotebookLM input field.
- **Favorite button injection:** Favorite prompts appear as contextual ⭐ buttons directly inside the NotebookLM UI, next to the appropriate input fields (e.g., above the chat bar, inside Customize Chat dialog, Audio/Video customization panels, etc.).
- **Target detection:** The extension identifies the correct input field using DOM label matching, dialog detection, and the omnibar element.

### 2.4 Auto-Setting Recall (RPA-like Automation)

The extension can remember and automatically re-apply NotebookLM dialog settings each time a dialog opens.

| Dialog | Auto-settings |
|---|---|
| **Research Sources** | Deep Research toggle (on/off) |
| **Chat (Configure Chat)** | Goal (Default / Learning Guide / Custom), Response length (Default / Longer / Shorter) |
| **Audio Overview** | Format (Deep Dive / Brief / Critique / Debate), Length (Short / Default) |
| **Video Overview** | Format (Explainer / Brief), Visual style (Auto-select / Custom / Classic / Whiteboard / Kawaii / Anime / Watercolor / Retro print / Heritage / Paper-craft) |
| **Flashcards** | Card count (Fewer / Standard / More), Difficulty (Easy / Medium / Hard) |
| **Quiz** | Question count (Fewer / Standard / More), Difficulty (Easy / Medium / Hard) |
| **Infographic** | Layout (Landscape / Portrait / Square), Detail level (Concise / Standard / Detailed), Visual style (Auto-select / Sketch / Kawaii / Professional / Scientific / Anime / Clay / Editorial / Instructional / Bento Grid / Bricks) |
| **Slide Deck** | Format (Detailed Deck / Presenter Slides), Length (Short / Default) |

### 2.5 Search & Filtering

- **Full-text search:** Searches across prompt title, content, and tags.
- **Tag cloud:** Displays all tags; clicking a tag filters the visible prompts.
- **Combined filtering:** Search and tag filters work simultaneously.

### 2.6 Internationalization (i18n)

| # | Language | Locale Code |
|---|---|---|
| 1 | English | `en` |
| 2 | Japanese | `ja` |
| 3 | Spanish | `es` |
| 4 | French | `fr` |
| 5 | German | `de` |
| 6 | Portuguese (Brazil) | `pt_BR` |
| 7 | Italian | `it` |
| 8 | Russian | `ru` |
| 9 | Chinese (Simplified) | `zh_CN` |
| 10 | Chinese (Traditional, Taiwan) | `zh_TW` |
| 11 | Korean | `ko` |
| 12 | Vietnamese | `vi` |
| 13 | Indonesian | `id` |
| 14 | Hindi | `hi` |

- **Auto-detection:** On first install, the UI language is detected from the browser locale.
- **Manual switch:** Users can manually select a language from the side panel header.
- **Dual-layer i18n:** `translations.js` for in-panel UI + `_locales/*/messages.json` for Chrome API (`chrome.i18n`).
- **Selector label matching:** `content.js` matches NotebookLM dialog labels across languages to correctly inject buttons and auto-select options.

### 2.7 Data Management

| Feature | Description |
|---|---|
| **Export** | Export all prompts as a `.json` file. |
| **Import** | Import prompts from a `.json` file (additive merge). |
| **Storage** | All data stored locally via `chrome.storage.local`. |

---

## 3. Browser Requirements

| Requirement | Value |
|---|---|
| **Browser** | Google Chrome (or Chromium-based browsers) |
| **Manifest** | V3 |
| **Permissions** | `storage`, `sidePanel` |
| **Host Permissions** | `https://notebooklm.google.com/*` |

---

## 4. Data Model

### 4.1 Prompt Object

```json
{
  "title": "Stock Analysis",
  "category": "research",
  "subCategory": "",
  "tags": ["Research", "Analysis"],
  "text": "Analyze the growth potential and risk factors...",
  "isFavorite": true
}
```

### 4.2 Settings (stored individually in `chrome.storage.local`)

| Key | Type | Default |
|---|---|---|
| `language` | string | auto-detected |
| `autoDeepResearch` | boolean | `false` |
| `audioFormat` | string | `"詳細"` |
| `audioLength` | string | `"標準"` |
| `reportFormat` | string | `"独自に作成"` |
| `videoFormat` | string | `"Explainer"` |
| `videoStyle` | string | `"Auto-select"` |
| `chatGoal` | string | `"Default"` |
| `chatLength` | string | `"Default"` |
| `flashcardCardCount` | string | `"標準"` |
| `flashcardDifficulty` | string | `"標準"` |
| `quizQuestionCount` | string | `"標準"` |
| `quizDifficulty` | string | `"標準"` |
| `infographicLayout` | string | `"横向き"` |
| `infographicDetailLevel` | string | `"標準"` |
| `slideFormat` | string | `"詳細"` |
| `slideLength` | string | `"デフォルト"` |

---

## 5. Validation Rules

| Field | Rule |
|---|---|
| Title | Required, max 20 characters |
| Tags | Max 10 tags, each max 20 characters |
| Prompt text | Required, max 10,000 characters |
| Category | Must be one of `VALID_CATEGORIES` |
| Prompts per category | Max 20 |

---

## 6. Related Documents

- [README.md](README.md) — Project overview, installation guide, and usage instructions
- [ARCHITECTURE.md](ARCHITECTURE.md) — Architecture and design details
- [PRIVACY.md](PRIVACY.md) — Privacy policy
- [LICENSE](LICENSE) — MIT License
