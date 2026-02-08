(function () {
    // 拡張機能のコンテキストチェック
    function isContextValid() {
        return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    }

    if (!isContextValid()) return;

    console.log('CueCard for NotebookLM: Content script loaded');

    let lastFocusedElement = null;
    let autoDeepResearchEnabled = false;

    // 設定をロードしてキャッシュ
    function refreshSettings() {
        if (!isContextValid()) return;
        chrome.storage.local.get(['autoDeepResearch'], (result) => {
            if (chrome.runtime.lastError) return;
            autoDeepResearchEnabled = !!result.autoDeepResearch;
        });
    }

    // ストレージ変更を監視
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.autoDeepResearch) {
            autoDeepResearchEnabled = !!changes.autoDeepResearch.newValue;
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

    function insertText(text) {
        if (!lastFocusedElement) {
            const active = document.activeElement;
            if (active && (active.tagName === 'TEXTAREA' || active.contentEditable === 'true')) {
                lastFocusedElement = active;
            }
        }
        if (!lastFocusedElement) {
            alert('入力欄をクリックしてから実行してください。');
            return;
        }
        lastFocusedElement.focus();
        try {
            document.execCommand('insertText', false, text);
        } catch (err) {
            console.error('CueCard: Insertion failed', err);
        }
    }

    /**
     * NotebookLM 専用: Deep Research 自動選択
     */
    function setupObserver() {
        let isProcessing = false;

        const observer = new MutationObserver(() => {
            if (!isContextValid()) {
                observer.disconnect();
                return;
            }

            if (!autoDeepResearchEnabled) return;

            // 1. メニュー内のオプション自体を探す（最優先）
            const deepBtn = document.querySelector('.research-option-deep-research');
            if (deepBtn && deepBtn.getAttribute('data-auto-clicked') !== 'true') {
                // オプション選択時はロック中であっても即座に実行を試みる
                deepBtn.setAttribute('data-auto-clicked', 'true');
                deepBtn.click();
                console.log('CueCard: Auto-selected Deep Research (Fast).');
                return;
            }

            if (isProcessing) return;

            // 2. メニューを開くトリガーボタンを探す
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
                        // メニューが開くまでの短いロック（100ms程度で十分）
                        setTimeout(() => { isProcessing = false; }, 100);
                        break;
                    }
                }
            }

            // クリーンアップ
            if (!deepBtn) {
                document.querySelectorAll('[data-auto-clicked="true"]').forEach(el => {
                    if (!document.body.contains(el) || el.offsetParent === null) {
                        el.removeAttribute('data-auto-clicked');
                    }
                });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    setupObserver();
})();
