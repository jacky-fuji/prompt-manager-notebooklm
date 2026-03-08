(function () {
    // Extension context check
    function isContextValid() {
        return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    }

    if (!isContextValid()) return;

    const DEBUG = false;
    const log = (...args) => { if (DEBUG) console.log('[CueCard]', ...args); };

    // --- Failure Detection & Notification ---
    let notificationShown = false;
    function notifyUIChangeWarning(selectorName) {
        if (notificationShown) return;
        notificationShown = true;
        console.warn(`[Prompt Manager] Warning: Could not find critical element (${selectorName}). NotebookLM UI may have updated.`);

        const toast = document.createElement('div');
        toast.textContent = 'Prompt Manager: UI has changed. Some features may not work.';
        toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#f44336;color:white;padding:12px;border-radius:4px;z-index:9999;font-size:12px;box-shadow:0 2px 5px rgba(0,0,0,0.2);';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    // Check critical elements periodically
    let checkCount = 0;
    const criticalCheckInterval = setInterval(() => {
        if (!isContextValid()) {
            clearInterval(criticalCheckInterval);
            return;
        }

        // Omnibar is expected to be present in normal chat views
        const omnibar = document.querySelector(SELECTORS.OMNIBAR);
        if (omnibar) {
            clearInterval(criticalCheckInterval); // Stop checking if found
        } else {
            checkCount++;
            if (checkCount > 10) { // If not found after ~10 seconds
                // Might be on a different page, but log it and optionally show toast
                console.warn('[Prompt Manager] Critical selector check timed out for: ' + SELECTORS.OMNIBAR);
                // notifyUIChangeWarning('OMNIBAR'); // Uncomment if we want to aggressively show toast. Chat UI may legitimately not be open yet.
                clearInterval(criticalCheckInterval);
            }
        }
    }, 1000);
    // ---------------------------------------------------------------

    log('Content script loaded');

    let lastFocusedElement = null;
    let autoDeepResearchEnabled = false;
    let audioFormat = '';
    let flashcardCardCount = '';
    let flashcardDifficulty = '';
    let quizQuestionCount = '';
    let quizDifficulty = '';
    let infographicLayout = '';
    let infographicDetailLevel = '';
    let slideFormat = '';
    let slideLength = '';
    let audioLength = '';
    let reportFormat = '';
    let videoFormat = '';
    let videoStyle = '';
    let chatGoal = '';
    let chatLength = '';
    let favoritePrompts = [];

    // Audio commentary format mapping (internal value -> display label)
    const AUDIO_FORMAT_MAP = {
        '詳細': ['詳細', 'Deep Dive', 'Detaillierte Analyse'],
        '概要': ['概要', 'Brief', 'Zusammenfassung'],
        '評論': ['評論', 'Critique', 'Kritische Bewertung'],
        '議論': ['議論', 'Debate', 'Diskussion']
    };
    const AUDIO_LENGTH_MAP = {
        '短め': ['短め', 'Short', 'Kurz'],
        '標準': ['デフォルト', 'Default', 'Standard']
    };

    // Report format mapping
    const REPORT_FORMAT_MAP = {
        '独自に作成': ['独自に作成', 'Create Your Own'],
        '概要説明資料': ['概要説明資料', 'Briefing Doc'],
        '学習ガイド': ['学習ガイド', 'Study Guide'],
        'ブログ投稿': ['ブログ投稿', 'Blog Post']
    };
    // Video overview format mapping (English labels are used for both JP/EN UI)
    const VIDEO_FORMAT_MAP = {
        'Explainer': ['説明動画', 'Explainer', 'Erklärvideo'],
        'Brief': ['概要', 'Brief', 'Zusammenfassung']
    };
    // Visual style mapping (JP labels for Japanese UI, EN for English)
    const VIDEO_STYLE_MAP = {
        'Auto-select': ['Auto-select', '自動選択', 'Automatische Auswahl'],
        'Custom': ['Custom', 'カスタム', 'Benutzerdefiniert'],
        'Classic': ['Classic', 'クラシック', 'Klassisch'],
        'Whiteboard': ['Whiteboard', 'ホワイトボード', 'Whiteboard'],
        'Kawaii': ['Kawaii', 'カワイイ', 'Kawaii'],
        'Anime': ['Anime', 'アニメ', 'Anime'],
        'Watercolor': ['Watercolor', '水彩画', 'Wasserfarben'],
        'Retro print': ['Retro print', 'レトロスタイル', 'Retro-Druck'],
        'Heritage': ['Heritage', '遺産', 'Traditionell'],
        'Paper-craft': ['Paper-craft', 'ペーパークラフト', 'Papierkunst']
    };

    // Flashcard setting mapping
    const FLASHCARD_COUNT_MAP = {
        '少なめ': ['少なめ', 'Fewer', 'Weniger'],
        '標準': ['標準', 'Standard', 'Standardeinstellung'],
        '多め': ['多め', 'More', 'Mehr']
    };
    const FLASHCARD_DIFFICULTY_MAP = {
        '簡単': ['簡単', 'Easy', 'Einfach'],
        '標準': ['標準', 'Medium', 'Mittel'],
        '難しい': ['難しい', 'Hard', 'Schwierig']
    };

    // Infographic setting mapping
    const INFOGRAPHIC_LAYOUT_MAP = {
        '横向き': ['横向き', 'Landscape', 'Querformat'],
        '縦向き': ['縦向き', 'Portrait', 'Hochformat'],
        '正方形': ['正方形', 'Square', 'Quadrat']
    };
    const INFOGRAPHIC_DETAIL_LEVEL_MAP = {
        '簡潔': ['簡潔', 'Concise', 'Kurzgefasst'],
        '標準': ['標準', 'Standard'],
        '詳細': ['詳細', 'Detailed', 'Detailliert']
    };

    // Slide deck setting mapping
    const SLIDE_FORMAT_MAP = {
        '詳細': ['詳細なスライド', 'Detailed Deck', 'Detaillierte Präsentation'],
        'プレゼンター用': ['プレゼンターのスライド', 'Presenter Slides', 'Folien für Vortragende']
    };
    const SLIDE_LENGTH_MAP = {
        '短め': ['短め', 'Short', 'Kurz'],
        'デフォルト': ['デフォルト', 'Default', 'Standard']
    };
    // Chat setting mapping
    const CHAT_GOAL_MAP = {
        'Default': ['デフォルト', 'Default', 'Standard'],
        'Learning Guide': ['学習ガイド', 'Learning Guide', 'Lernhilfe'],
        'Custom': ['カスタム', 'Custom', 'Benutzerdefiniert']
    };
    const CHAT_LENGTH_MAP = {
        'Default': ['デフォルト', 'Default', 'Standard'],
        'Longer': ['長め', 'Longer', 'Länger'],
        'Shorter': ['短め', 'Shorter', 'Kürzer']
    };

    // Inject basic styles
    const style = document.createElement('style');
    style.textContent = `
        .cuecard-fav-btn {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 4px 10px;
            font-size: 10px;
            cursor: pointer;
            color: #475569;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            width: auto;
            min-width: 40px;
            box-sizing: border-box;
            white-space: nowrap;
        }
        .cuecard-fav-btn:hover {
            background: #e2e8f0;
            border-color: #94a3b8;
        }
        .cuecard-fav-btn.inline {
            width: auto;
            max-width: 200px;
            padding: 2px 6px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .cuecard-fav-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 12px;
            width: 100%;
            flex-basis: 100%; /* Force flex items to the next line */
            clear: both;
        }
        .cuecard-fav-container.inline {
            display: inline-flex;
            flex-wrap: wrap;
            gap: 4px;
            margin: 0 0 0 12px;
            width: auto;
            flex-basis: auto;
            clear: none;
            margin-top: 0;
        }
    `;
    document.head.appendChild(style);

    // Load and cache settings and favorites from local storage
    function refreshSettings() {
        if (!isContextValid()) return;
        chrome.storage.local.get(['autoDeepResearch', 'prompts', 'audioFormat', 'audioLength', 'reportFormat', 'videoFormat', 'videoStyle', 'chatGoal', 'chatLength', 'flashcardCardCount', 'flashcardDifficulty', 'quizQuestionCount', 'quizDifficulty', 'infographicLayout', 'infographicDetailLevel', 'slideFormat', 'slideLength'], (result) => {
            if (chrome.runtime.lastError) return;
            autoDeepResearchEnabled = !!result.autoDeepResearch;
            audioFormat = result.audioFormat || '詳細';
            audioLength = result.audioLength || '標準';
            reportFormat = result.reportFormat || '独自に作成';
            videoFormat = result.videoFormat || 'Explainer';
            videoStyle = result.videoStyle || 'Auto-select';
            chatGoal = result.chatGoal || 'Default';
            chatLength = result.chatLength || 'Default';
            flashcardCardCount = result.flashcardCardCount || '標準';
            flashcardDifficulty = result.flashcardDifficulty || '標準';
            quizQuestionCount = result.quizQuestionCount || '標準';
            quizDifficulty = result.quizDifficulty || '標準';
            infographicLayout = result.infographicLayout || '横向き';
            infographicDetailLevel = result.infographicDetailLevel || '標準';
            slideFormat = result.slideFormat || '詳細';
            slideLength = result.slideLength || 'デフォルト';
            if (result.prompts) {
                favoritePrompts = result.prompts.filter(p => p.isFavorite);
            }
        });
    }

    // Monitor storage changes to update cached variables
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.autoDeepResearch) {
                autoDeepResearchEnabled = !!changes.autoDeepResearch.newValue;
            }
            if (changes.audioFormat) {
                audioFormat = changes.audioFormat.newValue || '';
            }
            if (changes.audioLength) {
                audioLength = changes.audioLength.newValue || '';
            }
            if (changes.reportFormat) {
                reportFormat = changes.reportFormat.newValue || '';
            }
            if (changes.videoFormat) {
                videoFormat = changes.videoFormat.newValue || '';
            }
            if (changes.videoStyle) {
                videoStyle = changes.videoStyle.newValue || '';
            }
            if (changes.flashcardCardCount) {
                flashcardCardCount = changes.flashcardCardCount.newValue || '';
            }
            if (changes.flashcardDifficulty) {
                flashcardDifficulty = changes.flashcardDifficulty.newValue || '';
            }
            if (changes.quizQuestionCount) {
                quizQuestionCount = changes.quizQuestionCount.newValue || '';
            }
            if (changes.quizDifficulty) {
                quizDifficulty = changes.quizDifficulty.newValue || '';
            }
            if (changes.infographicLayout) {
                infographicLayout = changes.infographicLayout.newValue || '';
            }
            if (changes.infographicDetailLevel) {
                infographicDetailLevel = changes.infographicDetailLevel.newValue || '';
            }
            if (changes.slideFormat) {
                slideFormat = changes.slideFormat.newValue || '';
            }
            if (changes.slideLength) {
                slideLength = changes.slideLength.newValue || '';
            }
            if (changes.prompts) {
                const newPrompts = changes.prompts.newValue;
                favoritePrompts = Array.isArray(newPrompts) ? newPrompts.filter(p => p.isFavorite) : [];
            }
        }
    });

    refreshSettings();

    /**
     * Input focus management
     */
    document.addEventListener('focusin', (e) => {
        const target = e.target;
        if (target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
            lastFocusedElement = target;
        }
    });

    /**
     * Receive text insertion message from side panel
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (sender.id !== chrome.runtime.id) return;
        if (request.action === 'insertText') {
            insertText(request.text);
            sendResponse({ status: 'success' });
        }
        return true;
    });

    function insertText(text, contextElement = null) {
        let target = lastFocusedElement;

        // Look for input field near the button
        if (contextElement) {
            const container = contextElement.closest('.control-wrapper') ||
                contextElement.closest('.dialog-container') ||
                contextElement.closest('mat-dialog-content');
            if (container) {
                const found = container.querySelector('textarea') || container.querySelector('[contenteditable="true"]');
                if (found) target = found;
            }
        }

        if (!target) {
            const active = document.activeElement;
            if (active && (active.tagName === 'TEXTAREA' || active.contentEditable === 'true')) {
                target = active;
            }
        }

        if (!target) {
            alert('Please click on the input field before proceeding.\n入力欄をクリックしてから実行してください。');
            return;
        }

        target.focus();
        try {
            if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
                target.setRangeText(text, target.selectionStart, target.selectionEnd, 'end');
                // Notify framework of event
                target.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (target.isContentEditable) {
                // For contenteditable elements
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(text));
                    // Move cursor to the end
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else {
                // Fallback
                document.execCommand('insertText', false, text);
            }
            // Update lastFocusedElement
            lastFocusedElement = target;
        } catch (err) {
            if (DEBUG) console.error('[Prompt Manager] Insertion failed', err);
        }
    }

    /**
     * Generate favorite buttons container
     * @param {string} categoryFilter - Filter by category (e.g., 'audio', 'research')
     * @param {string} subCategoryFilter - Filter by subcategory
     */
    function createFavoriteButtons(categoryFilter = null, subCategoryFilter = null) {
        let filtered = favoritePrompts;
        if (categoryFilter) {
            filtered = favoritePrompts.filter(p => {
                // Match category, fallback to 'research' if not set
                const pCat = p.category || 'research';
                if (pCat !== categoryFilter) return false;

                // Check subcategory
                if (subCategoryFilter) {
                    let sub = p.subCategory;
                    if (!sub) {
                        if (pCat === 'video') sub = 'focus';
                        if (pCat === 'chat') sub = 'chat';
                    }
                    return sub === subCategoryFilter;
                }

                return true;
            });
        }

        if (filtered.length === 0) return null;

        const container = document.createElement('div');
        container.className = 'cuecard-fav-container' + (categoryFilter ? ' inline' : '');
        // Fine-tune styles for inline context injection
        if (categoryFilter) {
            container.style.marginTop = '4px';
            container.style.marginBottom = '8px';
        }

        filtered.forEach((p) => {
            const btn = document.createElement('button');
            btn.className = 'cuecard-fav-btn' + (categoryFilter ? ' inline' : '');
            btn.innerText = `⭐${p.title}`;
            btn.title = p.title + ": " + p.text.substring(0, 100) + (p.text.length > 100 ? '...' : '');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                // Pass context (the button itself) to find nearby input fields
                insertText(p.text, btn);
            });
            container.appendChild(btn);
        });

        return container;
    }

    /**
     * NotebookLM specific: Various automations and UI injections
     */
    function setupObserver() {
        let isProcessing = false;
        let observerTimer = null;

        const observer = new MutationObserver(() => {
            if (!isContextValid()) {
                observer.disconnect();
                return;
            }

            if (observerTimer) return; // Ignore mutations if we already have a frame scheduled

            observerTimer = requestAnimationFrame(() => {
                observerTimer = null;

                // --- 1. Auto-selection (RPA-like behavior) ---

                // A. Deep Research Auto-selection
                if (autoDeepResearchEnabled) {
                    const deepBtn = document.querySelector(SELECTORS.DEEP_RESEARCH_BTN);
                    if (deepBtn && deepBtn.getAttribute('data-auto-clicked') !== 'true') {
                        deepBtn.setAttribute('data-auto-clicked', 'true');
                        deepBtn.click();
                        log('Auto-selected Deep Research (Fast).');
                    }
                }

                // B. Audio commentary settings auto-selection
                if (audioFormat || audioLength) {
                    // Find unprocessed dialogs
                    const dialogs = document.querySelectorAll(SELECTORS.DIALOGS.AUDIO);
                    const audioDialog = Array.from(dialogs).find(d => {
                        const text = d.innerText || '';
                        return text.includes('音声解説をカスタマイズ') || text.includes('Customize Audio Overview') || text.includes('Audio-Zusammenfassung anpassen');
                    });

                    if (audioDialog) {
                        let formatDone = !audioFormat;
                        let lengthDone = !audioLength;

                        // Format selection
                        if (audioFormat && !formatDone) {
                            const labels = audioDialog.querySelectorAll('.tile-label');
                            const targetLabels = AUDIO_FORMAT_MAP[audioFormat] || [audioFormat];

                            for (const label of labels) {
                                const labelText = label.innerText.trim();
                                if (targetLabels.includes(labelText)) {
                                    const radioButton = label.closest('mat-radio-button') || label.closest('.mat-mdc-radio-button') || label.closest('.mat-radio-button');
                                    if (radioButton) {
                                        if (!radioButton.classList.contains('mat-mdc-radio-checked') && radioButton.getAttribute('aria-checked') !== 'true' && !radioButton.classList.contains('mat-radio-checked')) {
                                            const clickTarget = radioButton.querySelector('.tile-content') || radioButton.querySelector('input') || radioButton;
                                            clickTarget.click();
                                            log(`Auto-selected audio format: ${audioFormat}`);
                                        }
                                        formatDone = true;
                                        break;
                                    }
                                }
                            }
                        }

                        // Length selection
                        if (audioLength && !lengthDone) {
                            const wrappers = audioDialog.querySelectorAll('.control-wrapper');
                            wrappers.forEach(wrapper => {
                                const label = wrapper.querySelector('.control-label');
                                if (!label) return;
                                const labelText = label.innerText.trim();
                                if (labelText.includes('長さ') || labelText.includes('Length') || labelText.includes('Länge')) {
                                    const buttons = wrapper.querySelectorAll('mat-button-toggle button');
                                    const targetTexts = AUDIO_LENGTH_MAP[audioLength] || [audioLength];
                                    for (const btn of buttons) {
                                        const btnText = btn.innerText.trim();
                                        if (targetTexts.some(txt => btnText.includes(txt))) {
                                            const toggle = btn.closest('mat-button-toggle');
                                            if (toggle && !toggle.classList.contains('mat-button-toggle-checked')) {
                                                btn.click();
                                                log(`Auto-selected audio length: ${audioLength}`);
                                            }
                                            lengthDone = true;
                                            break;
                                        }
                                    }
                                }
                            });
                        }

                        if (formatDone && lengthDone) {
                            audioDialog.setAttribute('data-auto-formatted', 'true');
                        }
                    }
                }


                // C. Auto-select flashcard format
                if (flashcardCardCount || flashcardDifficulty) {
                    const dialogs = document.querySelectorAll(SELECTORS.DIALOGS.FLASHCARD);
                    const flashDialog = Array.from(dialogs).find(d => {
                        const text = d.innerText || '';
                        return text.includes('フラッシュカード') || text.includes('Flashcards') || text.includes('Lernkarten anpassen');
                    });

                    if (flashDialog) {
                        let countDone = !flashcardCardCount;
                        let diffDone = !flashcardDifficulty;

                        const rows = flashDialog.querySelectorAll('.row .column');
                        rows.forEach(col => {
                            const h2 = col.querySelector('h2');
                            if (!h2) return;
                            const headerText = h2.innerText.trim();

                            // Number of Cards
                            if (flashcardCardCount && (headerText.includes('カードの枚数') || headerText.includes('Number of Cards') || headerText.includes('Anzahl der Karten'))) {
                                const buttons = col.querySelectorAll('button');
                                const targetTexts = FLASHCARD_COUNT_MAP[flashcardCardCount] || [flashcardCardCount];
                                for (const btn of buttons) {
                                    const btnText = btn.innerText.trim();
                                    if (targetTexts.some(txt => btnText.includes(txt))) {
                                        if (btn.classList.contains('unselected-option-button')) {
                                            btn.click();
                                            log(`Auto-selected flashcard count: ${flashcardCardCount}`);
                                        }
                                        countDone = true;
                                        break;
                                    }
                                }
                            }

                            // Level of Difficulty
                            if (flashcardDifficulty && (headerText.includes('難易度レベル') || headerText.includes('Level of Difficulty') || headerText.includes('Schwierigkeitsgrad'))) {
                                const buttons = col.querySelectorAll('button');
                                const targetTexts = FLASHCARD_DIFFICULTY_MAP[flashcardDifficulty] || [flashcardDifficulty];
                                for (const btn of buttons) {
                                    const btnText = btn.innerText.trim();
                                    if (targetTexts.some(txt => btnText.includes(txt))) {
                                        if (btn.classList.contains('unselected-option-button')) {
                                            btn.click();
                                            log(`Auto-selected flashcard difficulty: ${flashcardDifficulty}`);
                                        }
                                        diffDone = true;
                                        break;
                                    }
                                }
                            }
                        });

                        if (countDone && diffDone) {
                            flashDialog.setAttribute('data-auto-formatted-flash', 'true');
                        }
                    }
                }

                // D. Auto-select quiz format
                if (quizQuestionCount || quizDifficulty) {
                    const dialogs = document.querySelectorAll(SELECTORS.DIALOGS.QUIZ);
                    const quizDialog = Array.from(dialogs).find(d => {
                        const text = d.innerText || '';
                        return text.includes('クイズ') || text.includes('Quiz');
                    });

                    if (quizDialog) {
                        let countDone = !quizQuestionCount;
                        let diffDone = !quizDifficulty;

                        const rows = quizDialog.querySelectorAll('.row .column');
                        rows.forEach(col => {
                            const h2 = col.querySelector('h2');
                            if (!h2) return;
                            const headerText = h2.innerText.trim();

                            // Number of Questions
                            if (quizQuestionCount && (headerText.includes('質問の数') || headerText.includes('Number of Questions') || headerText.includes('Anzahl der Fragen'))) {
                                const buttons = col.querySelectorAll('button');
                                const targetTexts = FLASHCARD_COUNT_MAP[quizQuestionCount] || [quizQuestionCount];
                                for (const btn of buttons) {
                                    const btnText = btn.innerText.trim();
                                    if (targetTexts.some(txt => btnText.includes(txt))) {
                                        if (btn.classList.contains('unselected-option-button')) {
                                            btn.click();
                                            log(`Auto-selected quiz question count: ${quizQuestionCount}`);
                                        }
                                        countDone = true;
                                        break;
                                    }
                                }
                            }

                            // Level of Difficulty
                            if (quizDifficulty && (headerText.includes('難易度レベル') || headerText.includes('Level of Difficulty') || headerText.includes('Schwierigkeitsgrad'))) {
                                const buttons = col.querySelectorAll('button');
                                const targetTexts = FLASHCARD_DIFFICULTY_MAP[quizDifficulty] || [quizDifficulty];
                                for (const btn of buttons) {
                                    const btnText = btn.innerText.trim();
                                    if (targetTexts.some(txt => btnText.includes(txt))) {
                                        if (btn.classList.contains('unselected-option-button')) {
                                            btn.click();
                                            log(`Auto-selected quiz difficulty: ${quizDifficulty}`);
                                        }
                                        diffDone = true;
                                        break;
                                    }
                                }
                            }
                        });

                        if (countDone && diffDone) {
                            quizDialog.setAttribute('data-auto-formatted-quiz', 'true');
                        }
                    }
                }

                // E. Auto-select infographic format
                if (infographicLayout || infographicDetailLevel) {
                    const dialogs = document.querySelectorAll(SELECTORS.DIALOGS.INFOGRAPHIC);
                    const infoDialog = Array.from(dialogs).find(d => {
                        const text = d.innerText || '';
                        return text.includes('インフォグラフィック') || text.includes('Infographic') || text.includes('Infografik');
                    });

                    if (infoDialog) {
                        let layoutDone = !infographicLayout;
                        let detailDone = !infographicDetailLevel;

                        const wrappers = infoDialog.querySelectorAll('.control-wrapper');
                        wrappers.forEach(wrapper => {
                            const label = wrapper.querySelector('.control-label');
                            if (!label) return;
                            const labelText = label.innerText.trim();

                            // Layout
                            if (infographicLayout && (labelText.includes('レイアウト') || labelText.includes('Choose orientation') || labelText.includes('Ausrichtung auswählen') || labelText.includes('Layout'))) {
                                const buttons = wrapper.querySelectorAll('mat-button-toggle button');
                                const targetTexts = INFOGRAPHIC_LAYOUT_MAP[infographicLayout] || [infographicLayout];
                                for (const btn of buttons) {
                                    // .mat-button-toggle-label-content is inside the button
                                    const btnText = btn.innerText.trim();
                                    if (targetTexts.some(txt => btnText.includes(txt))) {
                                        const toggle = btn.closest('mat-button-toggle');
                                        if (toggle && !toggle.classList.contains('mat-button-toggle-checked')) {
                                            btn.click();
                                            log(`Auto-selected infographic layout: ${infographicLayout}`);
                                        }
                                        layoutDone = true;
                                        break;
                                    }
                                }
                            }

                            // Level of detail
                            if (infographicDetailLevel && (labelText.includes('詳細レベル') || labelText.includes('Level of detail') || labelText.includes('Detaillierungsgrad'))) {
                                const buttons = wrapper.querySelectorAll('mat-button-toggle button');
                                const targetTexts = INFOGRAPHIC_DETAIL_LEVEL_MAP[infographicDetailLevel] || [infographicDetailLevel];
                                for (const btn of buttons) {
                                    const btnText = btn.innerText.trim();
                                    if (targetTexts.some(txt => btnText.includes(txt))) {
                                        const toggle = btn.closest('mat-button-toggle');
                                        if (toggle && !toggle.classList.contains('mat-button-toggle-checked')) {
                                            btn.click();
                                            log(`Auto-selected infographic detail level: ${infographicDetailLevel}`);
                                        }
                                        detailDone = true;
                                        break;
                                    }
                                }
                            }
                        });

                        if (layoutDone && detailDone) {
                            infoDialog.setAttribute('data-auto-formatted-infographic', 'true');
                        }
                    }
                }

                // F. Auto-select slide deck format
                if (slideFormat || slideLength) {
                    const dialogs = document.querySelectorAll(SELECTORS.DIALOGS.SLIDE);
                    const slideDialog = Array.from(dialogs).find(d => {
                        const text = (d.innerText || '').toLowerCase();
                        return text.includes('スライド') || text.includes('deck') || text.includes('folie') || text.includes('präsentation');
                    });

                    if (slideDialog) {
                        let formatDone = !slideFormat;
                        let lengthDone = !slideLength;

                        const wrappers = slideDialog.querySelectorAll('.control-wrapper');
                        wrappers.forEach(wrapper => {
                            const label = wrapper.querySelector('.control-label');
                            if (!label) return;
                            const labelText = label.innerText.trim();

                            // Format (mat-radio-button handling)
                            if (slideFormat && (labelText.includes('形式') || labelText.includes('Format'))) {
                                const radioButtons = wrapper.querySelectorAll('mat-radio-button');
                                const targetTexts = SLIDE_FORMAT_MAP[slideFormat] || [slideFormat];
                                for (const radio of radioButtons) {
                                    const radioText = radio.innerText.trim();
                                    if (targetTexts.some(txt => radioText.includes(txt))) {
                                        if (!radio.classList.contains('mat-mdc-radio-checked')) {
                                            // Try clicking native input, or radio itself
                                            const input = radio.querySelector('input[type="radio"]');
                                            if (input) {
                                                input.click();
                                            } else {
                                                radio.click();
                                            }
                                            log(`Auto-selected slide format: ${slideFormat}`);
                                        }
                                        formatDone = true;
                                        break;
                                    }
                                }
                            }

                            // Length (mat-button-toggle handling)
                            if (slideLength && (labelText.includes('長さ') || labelText.includes('Length') || labelText.includes('Länge'))) {
                                const buttons = wrapper.querySelectorAll('mat-button-toggle button');
                                const targetTexts = SLIDE_LENGTH_MAP[slideLength] || [slideLength];
                                for (const btn of buttons) {
                                    const btnText = btn.innerText.trim();
                                    if (targetTexts.some(txt => btnText.includes(txt))) {
                                        const toggle = btn.closest('mat-button-toggle');
                                        if (toggle && !toggle.classList.contains('mat-button-toggle-checked')) {
                                            btn.click();
                                            log(`Auto-selected slide length: ${slideLength}`);
                                        }
                                        lengthDone = true;
                                        break;
                                    }
                                }
                            }
                        });

                        if (formatDone && lengthDone) {
                            slideDialog.setAttribute('data-auto-formatted-slide', 'true');
                        }
                    }
                }

                // H. Auto-select video overview settings
                if (videoFormat || videoStyle) {
                    const dialogs = document.querySelectorAll(SELECTORS.DIALOGS.VIDEO);
                    const videoDialog = Array.from(dialogs).find(d => {
                        const text = d.innerText || '';
                        return text.includes('動画解説をカスタマイズ') || text.includes('Customize Video Overview') || text.includes('Video-Übersicht anpassen');
                    });

                    if (videoDialog) {
                        let formatDone = !videoFormat;
                        let styleDone = !videoStyle;

                        // Format selection (tile-label)
                        if (videoFormat && !formatDone) {
                            const targetLabels = VIDEO_FORMAT_MAP[videoFormat] || [videoFormat];
                            const tileLabels = videoDialog.querySelectorAll('.tile-label');
                            for (const lbl of tileLabels) {
                                if (targetLabels.some(t => lbl.innerText.trim().includes(t))) {
                                    const radio = lbl.closest('mat-radio-button');
                                    if (radio && !radio.classList.contains('mat-mdc-radio-checked') && radio.getAttribute('aria-checked') !== 'true' && !radio.classList.contains('mat-radio-checked')) {
                                        const clickTarget = radio.querySelector('.tile-content') || radio.querySelector('input') || radio;
                                        clickTarget.click();
                                        log(`Auto-selected video format: ${videoFormat}`);
                                    }
                                    formatDone = true;
                                    break;
                                }
                            }
                        }

                        // Visual style selection (carousel .mat-body-small)
                        if (videoStyle && !styleDone) {
                            const targetLabels = VIDEO_STYLE_MAP[videoStyle] || [videoStyle];
                            const carouselLabels = videoDialog.querySelectorAll('.carousel-radio-button .mat-body-small');
                            for (const lbl of carouselLabels) {
                                if (targetLabels.some(t => lbl.innerText.trim().includes(t))) {
                                    const radio = lbl.closest('mat-radio-button');
                                    if (radio && !radio.classList.contains('mat-mdc-radio-checked') && radio.getAttribute('aria-checked') !== 'true' && !radio.classList.contains('mat-radio-checked')) {
                                        const input = radio.querySelector('input[type="radio"]');
                                        if (input) input.click(); else radio.click();
                                        log(`Auto-selected video style: ${videoStyle}`);
                                    }
                                    styleDone = true;
                                    break;
                                }
                            }
                        }

                        // If formats are fundamentally missing from NotebookLM video UI, prevent infinite looping
                        if (!formatDone && videoDialog.querySelectorAll('.tile-label').length === 0) {
                            formatDone = true;
                        }

                        if (formatDone && styleDone) {
                            videoDialog.setAttribute('data-auto-formatted-video', 'true');
                        }
                    }
                }

                // G. Auto-select chat format
                if (chatGoal || chatLength) {
                    const dialogs = document.querySelectorAll(SELECTORS.DIALOGS.CHAT);
                    const chatDialog = Array.from(dialogs).find(d => {
                        const text = d.innerText || '';
                        return text.includes('チャットを設定') || text.includes('Configure Chat') || text.includes('Chat konfigurieren');
                    });

                    if (chatDialog) {
                        let goalDone = !chatGoal;
                        let lengthDone = !chatLength;

                        // Define your conversational goal, style, or role
                        if (chatGoal && !goalDone) {
                            const wrappers = chatDialog.querySelectorAll('.prompt-section, .style-section');
                            for (const wrapper of wrappers) {
                                const title = wrapper.querySelector('.section-title');
                                if (!title) continue;
                                const titleText = title.innerText.trim();
                                if (titleText.includes('目的') || titleText.includes('conversational goal') || titleText.includes('ziel') || titleText.includes('festlegen')) {
                                    const buttons = wrapper.querySelectorAll('mat-button-toggle button');
                                    const targetTexts = CHAT_GOAL_MAP[chatGoal] || [chatGoal];
                                    for (const btn of buttons) {
                                        const btnText = btn.innerText.trim();
                                        if (targetTexts.some(txt => btnText.includes(txt))) {
                                            const toggle = btn.closest('mat-button-toggle');
                                            if (toggle && !toggle.classList.contains('mat-button-toggle-checked')) {
                                                btn.click();
                                                log(`Auto-selected chat goal: ${chatGoal}`);
                                            }
                                            goalDone = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        // Choose your response length
                        if (chatLength && !lengthDone) {
                            const wrappers = chatDialog.querySelectorAll('.prompt-section, .style-section');
                            for (const wrapper of wrappers) {
                                const title = wrapper.querySelector('.section-title');
                                if (!title) continue;
                                const titleText = title.innerText.trim();
                                if (titleText.includes('長さ') || titleText.includes('response length') || titleText.includes('antwortlänge') || titleText.includes('länge')) {
                                    const buttons = wrapper.querySelectorAll('mat-button-toggle button');
                                    const targetTexts = CHAT_LENGTH_MAP[chatLength] || [chatLength];
                                    for (const btn of buttons) {
                                        const btnText = btn.innerText.trim();
                                        if (targetTexts.some(txt => btnText.includes(txt))) {
                                            const toggle = btn.closest('mat-button-toggle');
                                            if (toggle && !toggle.classList.contains('mat-button-toggle-checked')) {
                                                btn.click();
                                                log(`Auto-selected chat length: ${chatLength}`);
                                            }
                                            lengthDone = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        if (goalDone && lengthDone) {
                            chatDialog.setAttribute('data-auto-formatted-chat', 'true');
                        }
                    }
                }


                // --- 2. Inject favorite buttons ---

                // A. Context-based injection (Strict matching based on ID or text content)
                const injectionLabels = document.querySelectorAll(SELECTORS.INJECTION_LABELS);

                injectionLabels.forEach(label => {
                    if (label.querySelector('.cuecard-fav-container')) return;

                    const text = (label.innerText || '').trim();
                    let category = null;
                    let subCategory = null;

                    // Match the target label of each category strictly by content (text)
                    if (text.includes('作成したいレポートの内容を記入してください') || text.includes('Describe the report you want to create') || text.includes('Beschreiben Sie den Bericht, der erstellt werden soll')) {
                        category = 'report';
                    } else if (text.includes('希望するトピック') || text.includes('What should the topic be?') || text.includes('Was soll das Thema sein?')) {
                        // Distinguish between Quiz and Flashcard from the overall dialog title, etc.z
                        const dialog = label.closest('mat-dialog-container') || label.closest('configurable-form-dialog') || document.body;
                        const dialogText = (dialog.innerText || '').toLowerCase();
                        if (dialogText.includes('クイズ') || dialogText.includes('quiz')) {
                            category = 'quiz';
                        } else if (dialogText.includes('フラッシュカード') || dialogText.includes('flashcards') || dialogText.includes('lernkarten') || dialogText.includes('Karteikarten')) {
                            category = 'flashcard';
                        }
                    } else if (text.includes('インフォグラフィックについて説明してください') || text.includes('Describe the infographic you want to create') || text.includes('Beschreiben Sie die Infografik, die Sie erstellen möchten')) {
                        // Consider differences like 'Describe...' phrasing in Japanese vs English
                        category = 'infographic';
                    } else if (text.includes('スライドについて説明してください') || text.includes('Describe the slide deck you want to create') || text.includes('Beschreiben Sie die Präsentation, die Sie erstellen möchten')) {
                        category = 'slide';
                    } else if ((text.includes('データテーブル') && text.includes('説明')) ||
                        text.includes('Describe the data table you want to create') ||
                        text.includes('Datentabelle beschreiben, die erstellt werden soll') ||
                        label.id === 'userSteeringPrompt-label') {
                        category = 'datatable';
                    } else if (label.id === 'episodeFocus-label') {
                        category = 'audio';
                    } else if (label.id === 'videoFocus-label') {
                        category = 'video';
                        subCategory = 'focus';
                    } else if (text.includes('カスタム ビジュアル スタイルを説明してください') ||
                        text.includes('独自のビジュアル スタイルを説明してください') ||
                        text.includes('独自のビジュアルスタイルを説明してください') ||
                        text.includes('Describe a custom visual style') ||
                        text.includes('Beschreiben Sie einen benutzerdefinierten visuellen Stil')) {
                        category = 'video';
                        subCategory = 'style';
                    }

                    if (category) {
                        const favButtons = createFavoriteButtons(category, subCategory);
                        if (favButtons) {
                            label.style.display = 'inline-flex';
                            label.style.alignItems = 'center';
                            label.style.flexWrap = 'wrap';
                            label.style.gap = '8px';
                            label.appendChild(favButtons);
                            log(`Injected ${category} buttons based on strict label match: "${text.substring(0, 15)}..."`);
                        }
                    }
                });

                // B. Generic action menu (.actions-options)
                const targetParents = document.querySelectorAll(SELECTORS.ACTIONS_OPTIONS);
                targetParents.forEach(parent => {
                    if (!parent.querySelector('.cuecard-fav-container')) {
                        const resButtons = createFavoriteButtons('research');

                        if (resButtons) {
                            // Adjust parent layout (allow wrapping and left alignment)
                            parent.style.display = 'flex';
                            parent.style.flexWrap = 'wrap';
                            parent.style.justifyContent = 'flex-start';
                            parent.style.alignItems = 'flex-start';
                            parent.style.gap = '4px';

                            parent.appendChild(resButtons);
                            log('Injected research favorite buttons to an .actions-options container.');
                        }
                    }
                });

                // Fallback: If .actions-options is not found (just in case)
                if (targetParents.length === 0) {
                    const triggers = Array.from(document.querySelectorAll('button[aria-haspopup="menu"]'));
                    const resBtn = triggers.find(b => (b.innerText || '').includes('Research'));
                    if (resBtn && resBtn.parentElement && !resBtn.parentElement.querySelector('.cuecard-fav-container')) {
                        const resButtons = createFavoriteButtons('research');
                        if (resButtons) {
                            const fallBackParent = resBtn.parentElement;
                            fallBackParent.style.display = 'flex';
                            fallBackParent.style.flexWrap = 'wrap';
                            fallBackParent.style.gap = '4px';
                            fallBackParent.appendChild(resButtons);
                        }
                    }
                }

                // C. Main chat area (omnibar)
                const omnibar = document.querySelector(SELECTORS.OMNIBAR);
                if (omnibar && omnibar.parentElement) {
                    if (!omnibar.parentElement.querySelector('.cuecard-fav-container.chat-main-fav')) {
                        const chatButtons = createFavoriteButtons('chat', 'chat');
                        if (chatButtons) {
                            chatButtons.classList.add('chat-main-fav');
                            // Place above omnibar (outside the input area)
                            chatButtons.style.display = 'flex';
                            chatButtons.style.flexWrap = 'wrap';
                            chatButtons.style.justifyContent = 'flex-start';
                            chatButtons.style.gap = '6px';
                            chatButtons.style.marginBottom = '12px';
                            chatButtons.style.padding = '0 20px';
                            chatButtons.style.width = '100%';
                            chatButtons.style.zIndex = '100'; // Ensure it's in front

                            omnibar.parentElement.insertBefore(chatButtons, omnibar);
                            log('Injected chat favorite buttons before omnibar.');
                        }
                    }
                }

                // D. Conversation Style dialog (Customize Chat)
                const styleToggles = document.querySelector(SELECTORS.PROMPT_SECTION_TOGGLES);
                if (styleToggles && styleToggles.parentElement) {
                    const parent = styleToggles.parentElement;

                    // Check if "Custom" is selected
                    const checkedToggle = styleToggles.querySelector('.mat-button-toggle-checked');
                    const isCustomSelected = checkedToggle && (
                        checkedToggle.innerText.includes('Custom') ||
                        checkedToggle.innerText.includes('カスタム') ||
                        checkedToggle.innerText.includes('Benutzerdefiniert') ||
                        (checkedToggle.querySelector('button') && checkedToggle.querySelector('button').getAttribute('aria-label') === 'Custom button')
                    );

                    let chatButtons = parent.querySelector('.cuecard-fav-container.chat-style-fav');

                    if (isCustomSelected) {
                        if (!chatButtons) {
                            chatButtons = createFavoriteButtons('chat', 'style');
                            if (chatButtons) {
                                chatButtons.classList.add('chat-style-fav');
                                chatButtons.style.display = 'flex';
                                chatButtons.style.flexWrap = 'wrap';
                                chatButtons.style.justifyContent = 'flex-start';
                                chatButtons.style.gap = '6px';
                                chatButtons.style.marginTop = '12px';
                                chatButtons.style.marginBottom = '12px';
                                chatButtons.style.width = '100%';
                                styleToggles.parentNode.insertBefore(chatButtons, styleToggles.nextSibling);
                                log('Injected chat style favorite buttons (active).');
                            }
                        } else {
                            chatButtons.style.display = 'flex';
                        }
                    } else {
                        if (chatButtons) {
                            chatButtons.style.display = 'none';
                        }
                    }
                }

                if (isProcessing) return;

                // --- 3. Expand menu (if setting is enabled) ---
                if (autoDeepResearchEnabled) {
                    const buttons = document.querySelectorAll('button');
                    for (const btn of buttons) {
                        const text = (btn.innerText || '').trim();
                        if (btn.getAttribute('aria-haspopup') === 'menu' &&
                            text.includes('Research') &&
                            !text.includes('Deep')) {

                            if (btn.getAttribute('data-auto-opened') !== 'true') {
                                isProcessing = true;
                                btn.setAttribute('data-auto-opened', 'true');
                                btn.click();
                                log('Auto-opening web research menu...');
                                setTimeout(() => { isProcessing = false; }, 100);
                                break;
                            }
                        }
                    }
                }

                // Cleanup
                const clicked = document.querySelectorAll('[data-auto-clicked="true"], [data-auto-formatted="true"]');
                clicked.forEach(el => {
                    if (!document.body.contains(el) || el.offsetParent === null) {
                        el.removeAttribute('data-auto-clicked');
                        el.removeAttribute('data-auto-formatted');
                    }
                });
            }); // End of requestAnimationFrame
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    setupObserver();
})();
