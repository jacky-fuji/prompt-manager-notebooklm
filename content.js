(function () {
    // 拡張機能のコンテキストチェック
    function isContextValid() {
        return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    }

    if (!isContextValid()) return;

    console.log('CueCard for NotebookLM: Content script loaded');

    let lastFocusedElement = null;
    let autoDeepResearchEnabled = false;
    let audioFormat = '';
    let favoritePrompts = [];

    // 基本スタイルの注入
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
            flex-basis: 100%; /* 強制的に次の行へ送る */
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

    // 設定とお気に入りをロードしてキャッシュ
    function refreshSettings() {
        if (!isContextValid()) return;
        chrome.storage.local.get(['autoDeepResearch', 'prompts', 'audioFormat'], (result) => {
            if (chrome.runtime.lastError) return;
            autoDeepResearchEnabled = !!result.autoDeepResearch;
            audioFormat = result.audioFormat || '';
            if (result.prompts) {
                favoritePrompts = result.prompts.filter(p => p.isFavorite);
            }
        });
    }

    // ストレージ変更を監視
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.autoDeepResearch) {
                autoDeepResearchEnabled = !!changes.autoDeepResearch.newValue;
            }
            if (changes.audioFormat) {
                audioFormat = changes.audioFormat.newValue || '';
            }
            if (changes.prompts) {
                favoritePrompts = changes.prompts.newValue.filter(p => p.isFavorite);
            }
        }
    });

    refreshSettings();

    /**
     * 入力フォーカス管理
     */
    document.addEventListener('focusin', (e) => {
        const target = e.target;
        if (target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
            lastFocusedElement = target;
        }
    });

    /**
     * テキスト挿入メッセージの受信
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'insertText') {
            insertText(request.text);
            sendResponse({ status: 'success' });
        }
        return true;
    });

    function insertText(text, contextElement = null) {
        let target = lastFocusedElement;

        // ボタンの近傍から入力欄を探す
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
            document.execCommand('insertText', false, text);
            // lastFocusedElement を更新しておく
            lastFocusedElement = target;
        } catch (err) {
            console.error('CueCard: Insertion failed', err);
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
                    console.log('CueCard: Auto-selected Deep Research (Fast).');
                }
            }

            // B. 音声解説形式の自動選択
            if (audioFormat) {
                // 未処理のダイアログを探す
                const dialogs = document.querySelectorAll('mat-dialog-container:not([data-auto-formatted="true"]), configurable-form-dialog:not([data-auto-formatted="true"])');
                const audioDialog = Array.from(dialogs).find(d => (d.innerText || '').includes('音声解説をカスタマイズ'));

                if (audioDialog) {
                    const labels = audioDialog.querySelectorAll('.tile-label');
                    for (const label of labels) {
                        if (label.innerText.trim() === audioFormat) {
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
                                console.log(`CueCard: Auto-selected audio format: ${audioFormat}`);
                                break;
                            }
                        }
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
                if (text.includes('作成したいレポートの内容を記入してください')) {
                    category = 'report';
                } else if (text.includes('希望するトピック')) {
                    // ダイアログ全体のタイトル等から クイズ vs フラッシュカード を判別
                    const dialog = label.closest('mat-dialog-container') || label.closest('configurable-form-dialog') || document.body;
                    const dialogText = (dialog.innerText || '');
                    category = dialogText.includes('クイズ') ? 'quiz' : 'flashcard';
                } else if (text.includes('インフォグラフィックについて説明してください')) {
                    category = 'infographic';
                } else if (text.includes('スライドについて説明してください')) {
                    category = 'slide';
                } else if (text.includes('データテーブル') && (text.includes('説明') || label.id === 'userSteeringPrompt-label')) {
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
                        console.log(`CueCard: Injected ${category} buttons based on strict label match: "${text.substring(0, 15)}..."`);
                    }
                }
            });

            // B. 汎用的なアクションメニュー (.actions-options)
            const targetParents = document.querySelectorAll('.actions-options');
            targetParents.forEach(parent => {
                if (!parent.querySelector('.cuecard-fav-container')) {
                    const favButtons = createFavoriteButtons('research');
                    if (favButtons) {
                        // 親のレイアウトを調整（改行許可と左揃え）
                        parent.style.display = 'flex';
                        parent.style.flexWrap = 'wrap';
                        parent.style.justifyContent = 'flex-start';
                        parent.style.alignItems = 'flex-start';

                        parent.appendChild(favButtons);
                        console.log('CueCard: Injected research favorite buttons to an .actions-options container.');
                    }
                }
            });

            // フォールバック: .actions-options が見つからない場合（念のため）
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
                            console.log('CueCard: Auto-opening web research menu...');
                            setTimeout(() => { isProcessing = false; }, 100);
                            break;
                        }
                    }
                }
            }

            // クリーンアップ
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
