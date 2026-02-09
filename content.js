(function () {
    // 拡張機能のコンテキストチェック
    function isContextValid() {
        return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    }

    if (!isContextValid()) return;

    console.log('CueCard for NotebookLM: Content script loaded');

    let lastFocusedElement = null;
    let autoDeepResearchEnabled = false;
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
        chrome.storage.local.get(['autoDeepResearch', 'prompts'], (result) => {
            if (chrome.runtime.lastError) return;
            autoDeepResearchEnabled = !!result.autoDeepResearch;
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


            // --- 2. お気に入りボタンの注入 ---

            // --- 2. お気に入りボタンの注入 ---

            // A. コンテキストに応じた注入 (IDやクラスを横断的に監視)
            const injectionTargets = [
                // ID指定のもの
                'episodeFocus-label',   // 音声
                'videoFocus-label',     // 動画
                'userSteeringPrompt-label', // スライド, インフォグラフィック, データテーブル
                // クラス指定のもの
                '.mat-title-medium'     // レポート, クイズ, フラッシュカード
            ];

            const targetElements = [];
            injectionTargets.forEach(selector => {
                if (selector.startsWith('.')) {
                    document.querySelectorAll(selector).forEach(el => targetElements.push(el));
                } else {
                    const el = document.getElementById(selector);
                    if (el) targetElements.push(el);
                }
            });

            targetElements.forEach(item => {
                if (item.querySelector('.cuecard-fav-container')) return;

                // ダイアログ全体のタイトル等からカテゴリを判別
                const dialog = item.closest('mat-dialog-container') || item.closest('configurable-form-dialog') || document.body;
                const dialogText = (dialog.innerText || '');
                const itemText = (item.innerText || '');

                let category = null;

                // 1. タイトル文字列による判別 (優先)
                if (dialogText.includes('音声解説')) category = 'audio';
                else if (dialogText.includes('動画解説')) category = 'video';
                else if (dialogText.includes('インフォグラフィック')) category = 'infographic';
                else if (dialogText.includes('スライド資料')) category = 'slide';
                else if (dialogText.includes('クイズをカスタマイズ')) category = 'quiz';
                else if (dialogText.includes('フラッシュカードのカスタマイズ')) category = 'flashcard';
                else if (dialogText.includes('レポート')) category = 'report';
                else if (dialogText.includes('データテーブル')) category = 'datatable';

                // 2. ラベルテキストによる補完 (ダイアログが見つからない場合など)
                if (!category) {
                    if (itemText.includes('レポート')) category = 'report';
                    else if (itemText.includes('スライド')) category = 'slide';
                    else if (itemText.includes('インフォグラフィック')) category = 'infographic';
                }

                // 3. 特定のカテゴリにおけるバリデーション (誤爆防止)
                if (category === 'report' && !itemText.includes('作成したいレポートの内容を記入してください')) {
                    category = null;
                }
                if ((category === 'quiz' || category === 'flashcard') && !itemText.includes('希望するトピック')) {
                    category = null;
                }

                if (category) {
                    const favButtons = createFavoriteButtons(category);
                    if (favButtons) {
                        item.style.display = 'inline-flex';
                        item.style.alignItems = 'center';
                        item.style.flexWrap = 'wrap';
                        item.style.gap = '8px';
                        item.appendChild(favButtons);
                        console.log(`CueCard: Injected ${category} buttons based on dialog/label context.`);
                    }
                }
            });

            // C. 汎用的なアクションメニュー (.actions-options)
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
            const clicked = document.querySelectorAll('[data-auto-clicked="true"]');
            clicked.forEach(el => {
                if (!document.body.contains(el) || el.offsetParent === null) {
                    el.removeAttribute('data-auto-clicked');
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    setupObserver();
})();
