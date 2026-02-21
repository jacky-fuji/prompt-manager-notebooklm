(function () {
    // 拡張機能のコンテキストチェック / Extension context check
    function isContextValid() {
        return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    }

    if (!isContextValid()) return;

    const DEBUG = false;
    const log = (...args) => { if (DEBUG) console.log('[CueCard]', ...args); };

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
    let favoritePrompts = [];

    // 音声解説形式のマッピング（内部値 -> 表示ラベル） / Audio commentary format mapping (internal value -> display label)
    const AUDIO_FORMAT_MAP = {
        '詳細': ['詳細', 'Deep Dive'],
        '概要': ['概要', 'Brief'],
        '評論': ['評論', 'Critique'],
        '議論': ['議論', 'Debate']
    };

    // フラッシュカード設定のマッピング / Flashcard setting mapping
    const FLASHCARD_COUNT_MAP = {
        '少なめ': ['少なめ', 'Fewer'],
        '標準': ['標準', 'Standard'],
        '多め': ['多め', 'More']
    };
    const FLASHCARD_DIFFICULTY_MAP = {
        '簡単': ['簡単', 'Easy'],
        '標準': ['標準', 'Medium'],
        '難しい': ['難しい', 'Hard']
    };

    // インフォグラフィック設定のマッピング / Infographic setting mapping
    const INFOGRAPHIC_LAYOUT_MAP = {
        '横向き': ['横向き', 'Landscape'],
        '縦向き': ['縦向き', 'Portrait'],
        '正方形': ['正方形', 'Square']
    };
    const INFOGRAPHIC_DETAIL_LEVEL_MAP = {
        '簡潔': ['簡潔', 'Concise'],
        '標準': ['標準', 'Standard'],
        '詳細': ['詳細', 'Detailed']
    };

    // スライド資料設定のマッピング / Slide setting mapping
    const SLIDE_FORMAT_MAP = {
        '詳細': ['詳細なスライド', 'Detailed Deck'],
        'プレゼンター用': ['プレゼンターのスライド', 'Presenter Slides']
    };
    const SLIDE_LENGTH_MAP = {
        '短め': ['短め', 'Short'],
        'デフォルト': ['デフォルト', 'Default']
    };

    // 基本スタイルの注入 / Inject basic styles
    const style = document.createElement('style');
    style.textContent = `
        .cuecard-fav-btn {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 4px 6px;
            font-size: 10px;
            cursor: pointer;
            color: #475569;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            width: calc(33.33% - 6px);
            box-sizing: border-box;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .cuecard-fav-btn:hover {
            background: #e2e8f0;
            border-color: #94a3b8;
        }
        .cuecard-fav-btn.inline {
            width: auto;
            max-width: 100px;
            padding: 2px 6px;
        }
        .cuecard-fav-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 12px;
            width: 100%;
            flex-basis: 100%; /* 強制的に次の行へ送る / Force to the next line */
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

    // 設定とお気に入りをロードしてキャッシュ / Load and cache settings and favorites
    function refreshSettings() {
        if (!isContextValid()) return;
        chrome.storage.local.get(['autoDeepResearch', 'prompts', 'audioFormat', 'flashcardCardCount', 'flashcardDifficulty', 'quizQuestionCount', 'quizDifficulty', 'infographicLayout', 'infographicDetailLevel', 'slideFormat', 'slideLength'], (result) => {
            if (chrome.runtime.lastError) return;
            autoDeepResearchEnabled = !!result.autoDeepResearch;
            audioFormat = result.audioFormat || '詳細';
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

    // ストレージ変更を監視 / Monitor storage changes
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.autoDeepResearch) {
                autoDeepResearchEnabled = !!changes.autoDeepResearch.newValue;
            }
            if (changes.audioFormat) {
                audioFormat = changes.audioFormat.newValue || '';
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
     * 入力フォーカス管理 / Input focus management
     */
    document.addEventListener('focusin', (e) => {
        const target = e.target;
        if (target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
            lastFocusedElement = target;
        }
    });

    /**
     * テキスト挿入メッセージの受信 / Receive text insertion message
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

        // ボタンの近傍から入力欄を探す / Look for input field near the button
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
            alert('入力欄をクリックしてから実行してください。');
            return;
        }

        target.focus();
        try {
            if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
                target.setRangeText(text, target.selectionStart, target.selectionEnd, 'end');
                // フレームワークにイベントを通知
                target.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (target.isContentEditable) {
                // contenteditable要素の場合
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(text));
                    // カーソルを末尾に移動
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else {
                // フォールバック
                document.execCommand('insertText', false, text);
            }
            // lastFocusedElement を更新しておく
            lastFocusedElement = target;
        } catch (err) {
            if (DEBUG) console.error('[Prompt Manager] Insertion failed', err);
        }
    }

    /**
     * お気に入りボタンの生成
     * @param {string} categoryFilter - カテゴリで絞り込む場合 ('audio', 'research'等)
     */
    function createFavoriteButtons(categoryFilter = null) {
        let filtered = favoritePrompts;
        if (categoryFilter) {
            filtered = favoritePrompts.filter(p => {
                // 特定のカテゴリに合致するか、'research'指定時はカテゴリ未設定のものも救済する
                if (p.category === categoryFilter) return true;
                if (categoryFilter === 'research' && !p.category) return true;
                return false;
            });
        }

        if (filtered.length === 0) return null;

        const container = document.createElement('div');
        container.className = 'cuecard-fav-container' + (categoryFilter ? ' inline' : '');
        // コンテキスト埋め込み用にスタイルを微調整
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
                // コンテキスト（ボタン自身）を渡して、近くの入力欄を探させる
                insertText(p.text, btn);
            });
            container.appendChild(btn);
        });

        return container;
    }

    /**
     * NotebookLM 専用: 各種自動化とUI注入
     */
    function setupObserver() {
        let isProcessing = false;

        const observer = new MutationObserver(() => {
            if (!isContextValid()) {
                observer.disconnect();
                return;
            }

            // --- 1. 自動選択機能 (RPA的な動作) ---

            // A. Deep Research 自動選択
            if (autoDeepResearchEnabled) {
                const deepBtn = document.querySelector('.research-option-deep-research');
                if (deepBtn && deepBtn.getAttribute('data-auto-clicked') !== 'true') {
                    deepBtn.setAttribute('data-auto-clicked', 'true');
                    deepBtn.click();
                    log('Auto-selected Deep Research (Fast).');
                }
            }

            // B. 音声解説形式の自動選択
            if (audioFormat) {
                // 未処理のダイアログを探す
                const dialogs = document.querySelectorAll('mat-dialog-container:not([data-auto-formatted="true"]), configurable-form-dialog:not([data-auto-formatted="true"])');
                const audioDialog = Array.from(dialogs).find(d => {
                    const text = d.innerText || '';
                    return text.includes('音声解説をカスタマイズ') || text.includes('Customize Audio Overview');
                });

                if (audioDialog) {
                    const labels = audioDialog.querySelectorAll('.tile-label');
                    const targetLabels = AUDIO_FORMAT_MAP[audioFormat] || [audioFormat];

                    for (const label of labels) {
                        const labelText = label.innerText.trim();
                        if (targetLabels.includes(labelText)) {
                            const radioButton = label.closest('mat-radio-button') || label.closest('.mat-mdc-radio-button') || label.closest('.mat-radio-button');
                            if (radioButton) {
                                // 既に選択済みなら完了マークを付けて終了
                                if (radioButton.classList.contains('mat-mdc-radio-checked') || radioButton.getAttribute('aria-checked') === 'true' || radioButton.classList.contains('mat-radio-checked')) {
                                    audioDialog.setAttribute('data-auto-formatted', 'true');
                                    break;
                                }

                                // クリック対象を特定（視覚的なカード部分 .tile-content または input を優先）
                                const clickTarget = radioButton.querySelector('.tile-content') || radioButton.querySelector('input') || radioButton;
                                clickTarget.click();

                                audioDialog.setAttribute('data-auto-formatted', 'true');
                                log(`Auto-selected audio format: ${audioFormat}`);
                                break;
                            }
                        }
                    }
                }
            }


            // C. フラッシュカード形式の自動選択 / Auto-select flashcard format
            if (flashcardCardCount || flashcardDifficulty) {
                const dialogs = document.querySelectorAll('mat-dialog-container:not([data-auto-formatted-flash="true"]), configurable-form-dialog:not([data-auto-formatted-flash="true"])');
                const flashDialog = Array.from(dialogs).find(d => {
                    const text = d.innerText || '';
                    return text.includes('フラッシュカード') || text.includes('Flashcards');
                });

                if (flashDialog) {
                    let countDone = !flashcardCardCount;
                    let diffDone = !flashcardDifficulty;

                    const rows = flashDialog.querySelectorAll('.row .column');
                    rows.forEach(col => {
                        const h2 = col.querySelector('h2');
                        if (!h2) return;
                        const headerText = h2.innerText.trim();

                        // カードの枚数 / Number of Cards
                        if (flashcardCardCount && (headerText.includes('カードの枚数') || headerText.includes('Number of Cards'))) {
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

                        // 難易度レベル / Level of Difficulty
                        if (flashcardDifficulty && (headerText.includes('難易度レベル') || headerText.includes('Level of Difficulty'))) {
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

            // D. クイズ形式の自動選択 / Auto-select quiz format
            if (quizQuestionCount || quizDifficulty) {
                const dialogs = document.querySelectorAll('mat-dialog-container:not([data-auto-formatted-quiz="true"]), configurable-form-dialog:not([data-auto-formatted-quiz="true"])');
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

                        // 質問の数 / Number of Questions
                        if (quizQuestionCount && (headerText.includes('質問の数') || headerText.includes('Number of Questions'))) {
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

                        // 難易度レベル / Level of Difficulty
                        if (quizDifficulty && (headerText.includes('難易度レベル') || headerText.includes('Level of Difficulty'))) {
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

            // E. インフォグラフィック形式の自動選択 / Auto-select infographic format
            if (infographicLayout || infographicDetailLevel) {
                const dialogs = document.querySelectorAll('mat-dialog-container:not([data-auto-formatted-infographic="true"]), configurable-form-dialog:not([data-auto-formatted-infographic="true"])');
                const infoDialog = Array.from(dialogs).find(d => {
                    const text = d.innerText || '';
                    return text.includes('インフォグラフィック') || text.includes('Infographic');
                });

                if (infoDialog) {
                    let layoutDone = !infographicLayout;
                    let detailDone = !infographicDetailLevel;

                    const wrappers = infoDialog.querySelectorAll('.control-wrapper');
                    wrappers.forEach(wrapper => {
                        const label = wrapper.querySelector('.control-label');
                        if (!label) return;
                        const labelText = label.innerText.trim();

                        // レイアウト / Layout
                        if (infographicLayout && (labelText.includes('レイアウト') || labelText.includes('Choose orientation'))) {
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

                        // 詳細レベル / Level of detail
                        if (infographicDetailLevel && (labelText.includes('詳細レベル') || labelText.includes('Level of detail'))) {
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

            // F. スライド資料形式の自動選択 / Auto-select slide deck format
            if (slideFormat || slideLength) {
                const dialogs = document.querySelectorAll('mat-dialog-container:not([data-auto-formatted-slide="true"]), configurable-form-dialog:not([data-auto-formatted-slide="true"])');
                const slideDialog = Array.from(dialogs).find(d => {
                    const text = (d.innerText || '').toLowerCase();
                    return text.includes('スライド') || text.includes('deck');
                });

                if (slideDialog) {
                    let formatDone = !slideFormat;
                    let lengthDone = !slideLength;

                    const wrappers = slideDialog.querySelectorAll('.control-wrapper');
                    wrappers.forEach(wrapper => {
                        const label = wrapper.querySelector('.control-label');
                        if (!label) return;
                        const labelText = label.innerText.trim();

                        // 形式 / Format (mat-radio-button handling)
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

                        // 長さ / Length (mat-button-toggle handling)
                        if (slideLength && (labelText.includes('長さ') || labelText.includes('Length'))) {
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


            // --- 2. お気に入りボタンの注入 ---

            // A. コンテキストに応じた注入 (IDやテキスト内容に基づく厳密な判定)
            const injectionLabels = document.querySelectorAll('#episodeFocus-label, #videoFocus-label, #userSteeringPrompt-label, .mat-title-medium, .control-label');

            injectionLabels.forEach(label => {
                if (label.querySelector('.cuecard-fav-container')) return;

                const text = (label.innerText || '').trim();
                let category = null;

                // 各カテゴリのターゲットラベルを内容（テキスト）で厳密に照合
                if (text.includes('作成したいレポートの内容を記入してください') || text.includes('Describe the report you want to create')) {
                    category = 'report';
                } else if (text.includes('希望するトピック') || text.includes('What should the topic be?')) {
                    // ダイアログ全体のタイトル等から クイズ vs フラッシュカード を判別
                    const dialog = label.closest('mat-dialog-container') || label.closest('configurable-form-dialog') || document.body;
                    const dialogText = (dialog.innerText || '').toLowerCase();
                    if (dialogText.includes('クイズ') || dialogText.includes('quiz')) {
                        category = 'quiz';
                    } else if (dialogText.includes('フラッシュカード') || dialogText.includes('flashcards')) {
                        category = 'flashcard';
                    }
                } else if (text.includes('インフォグラフィックについて説明してください') || text.includes('Describe the infographic you want to create')) {
                    // 日本語版は「説明してください」、英語版は「Describe ...」などの差異を考慮
                    category = 'infographic';
                } else if (text.includes('スライドについて説明してください') || text.includes('Describe the slide deck you want to create')) {
                    category = 'slide';
                } else if ((text.includes('データテーブル') && text.includes('説明')) ||
                    text.includes('Describe the data table you want to create') ||
                    label.id === 'userSteeringPrompt-label') {
                    category = 'datatable';
                } else if (label.id === 'episodeFocus-label') {
                    category = 'audio';
                } else if (label.id === 'videoFocus-label') {
                    category = 'video';
                }

                if (category) {
                    const favButtons = createFavoriteButtons(category);
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

            // B. 汎用的なアクションメニュー (.actions-options)
            const targetParents = document.querySelectorAll('.actions-options');
            targetParents.forEach(parent => {
                if (!parent.querySelector('.cuecard-fav-container')) {
                    const favButtons = createFavoriteButtons('research');
                    if (favButtons) {
                        // 親のレイアウトを調整（改行許可と左揃え） / Adjust parent layout (allow wrapping and left alignment)
                        parent.style.display = 'flex';
                        parent.style.flexWrap = 'wrap';
                        parent.style.justifyContent = 'flex-start';
                        parent.style.alignItems = 'flex-start';

                        parent.appendChild(favButtons);
                        log('Injected research favorite buttons to an .actions-options container.');
                    }
                }
            });

            // フォールバック: .actions-options が見つからない場合（念のため） / Fallback: If .actions-options is not found (just in case)
            if (targetParents.length === 0) {
                const triggers = Array.from(document.querySelectorAll('button[aria-haspopup="menu"]'));
                const resBtn = triggers.find(b => (b.innerText || '').includes('Research'));
                if (resBtn && resBtn.parentElement && !resBtn.parentElement.querySelector('.cuecard-fav-container')) {
                    const favButtons = createFavoriteButtons('research');
                    if (favButtons) {
                        const fallBackParent = resBtn.parentElement;
                        fallBackParent.style.display = 'flex';
                        fallBackParent.style.flexWrap = 'wrap';
                        fallBackParent.appendChild(favButtons);
                    }
                }
            }

            if (isProcessing) return;

            // --- 3. メニュー展開（設定有効時） ---
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

            // クリーンアップ / Cleanup
            const clicked = document.querySelectorAll('[data-auto-clicked="true"], [data-auto-formatted="true"]');
            clicked.forEach(el => {
                if (!document.body.contains(el) || el.offsetParent === null) {
                    el.removeAttribute('data-auto-clicked');
                    el.removeAttribute('data-auto-formatted');
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    setupObserver();
})();
