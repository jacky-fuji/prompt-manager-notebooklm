/**
 * CueCard for NotebookLM: ポップアップ管理ロジック
 */

document.addEventListener('DOMContentLoaded', () => {
    const cueListContainer = document.getElementById('cue-list');
    const adminSection = document.getElementById('admin-section');
    const adminModeBtn = document.getElementById('admin-mode-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    // フォーム入力
    const titleInput = document.getElementById('prompt-title');
    const tagsInput = document.getElementById('prompt-tags');
    const favoriteInput = document.getElementById('prompt-favorite');
    const textInput = document.getElementById('prompt-text');
    const editIndexInput = document.getElementById('edit-index');
    const charCountDisplay = document.getElementById('char-count');
    const adminTitle = document.getElementById('admin-title');

    // フィルター要素
    const searchInput = document.getElementById('search-input');
    const tagCloud = document.getElementById('tag-cloud');

    // 設定要素
    const autoDeepResearchInput = document.getElementById('setting-auto-deep-research');

    // フィルタリング状態
    let currentTag = null;
    let searchQuery = '';

    // 初期プロンプトデータ
    const initialPrompts = [
        { title: '銘柄分析用', tags: ['調査', '分析'], text: '以下の銘柄について、直近の決算短信と中期経営計画から、今後の成長性とリスク要因を箇条書きで分析してください。', isFavorite: true },
        { title: '本要約用', tags: ['要約'], text: 'この本の内容を、3つの重要なポイントに絞って、中学生でもわかるように要約してください。', isFavorite: false },
        { title: '動画スクリプト要約', tags: ['YouTube', '要約'], text: 'このトピックに基づいた5分間のYouTube動画用台本（導入、構成、結び）を、親しみやすい語り口で作成してください。', isFavorite: false }
    ];

    /**
     * 文字数カウントの更新
     */
    function updateCharCount() {
        const length = textInput.value.length;
        charCountDisplay.innerText = `${length} / 5000`;
        if (length >= 4500) {
            charCountDisplay.classList.add('warning');
        } else {
            charCountDisplay.classList.remove('warning');
        }
    }

    textInput.addEventListener('input', updateCharCount);

    /**
     * 検索入力イベント
     */
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        loadAndRenderPrompts();
    });

    /**
     * プロンプトと設定をストレージから読み込み
     */
    function loadAndRenderPrompts() {
        // 大容量対応のため local ストレージを使用
        chrome.storage.local.get(['prompts', 'autoDeepResearch'], (result) => {
            let prompts = result.prompts;
            if (!prompts || prompts.length === 0) {
                // 初回起動時はデフォルト値をセット
                prompts = initialPrompts;
                chrome.storage.local.set({ prompts: prompts });
            }

            // 設定の反映
            autoDeepResearchInput.checked = !!result.autoDeepResearch;

            updateTagCloud(prompts);
            renderList(prompts);
        });
    }

    /**
     * 設定変更イベント
     */
    autoDeepResearchInput.addEventListener('change', (e) => {
        chrome.storage.local.set({ autoDeepResearch: e.target.checked });
    });

    // 初期表示
    loadAndRenderPrompts();

    /**
     * 全プロンプトからタグを抽出してクラウドを更新
     */
    function updateTagCloud(prompts) {
        const allTags = new Set();
        prompts.forEach(p => {
            if (p.tags) p.tags.forEach(t => allTags.add(t));
        });

        tagCloud.innerHTML = '';

        // 「すべて」タグ
        const allBtn = document.createElement('button');
        allBtn.className = `tag-chip ${currentTag === null ? 'active' : ''}`;
        allBtn.innerText = 'すべて';
        allBtn.onclick = () => {
            currentTag = null;
            loadAndRenderPrompts();
        };
        tagCloud.appendChild(allBtn);

        [...allTags].sort().forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `tag-chip ${currentTag === tag ? 'active' : ''}`;
            btn.innerText = tag;
            btn.onclick = () => {
                currentTag = (currentTag === tag) ? null : tag;
                loadAndRenderPrompts();
            };
            tagCloud.appendChild(btn);
        });
    }

    /**
     * リストをUIに描画
     */
    function renderList(prompts) {
        cueListContainer.innerHTML = '';

        // 1. フィルタリング適用
        let filtered = prompts.filter(p => {
            const matchesTag = !currentTag || (p.tags && p.tags.includes(currentTag));
            const matchesSearch = !searchQuery ||
                p.title.toLowerCase().includes(searchQuery) ||
                p.text.toLowerCase().includes(searchQuery) ||
                (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery)));
            return matchesTag && matchesSearch;
        });

        // 2. お気に入りを優先してソート
        filtered.sort((a, b) => {
            if (a.isFavorite === b.isFavorite) return 0;
            return a.isFavorite ? -1 : 1;
        });

        filtered.forEach((prompt) => {
            // 元の配列でのインデックスを探す（編集・削除用）
            const originalIndex = prompts.findIndex(p => p === prompt);

            const item = document.createElement('div');
            item.className = `cue-item ${prompt.isFavorite ? 'is-favorite' : ''}`;

            const titleContainer = document.createElement('div');
            titleContainer.style.display = 'flex';
            titleContainer.style.alignItems = 'center';

            if (prompt.isFavorite) {
                const star = document.createElement('span');
                star.className = 'cue-favorite-star';
                star.innerText = '★';
                titleContainer.appendChild(star);
            }

            const title = document.createElement('span');
            title.className = 'cue-item-title';
            title.innerText = prompt.title;
            titleContainer.appendChild(title);

            const preview = document.createElement('span');
            preview.className = 'cue-item-text';
            preview.innerText = prompt.text;

            item.appendChild(titleContainer);
            item.appendChild(preview);

            // タグ表示
            if (prompt.tags && prompt.tags.length > 0) {
                const tagList = document.createElement('div');
                tagList.className = 'cue-tags';
                prompt.tags.forEach(t => {
                    const tagLabel = document.createElement('span');
                    tagLabel.className = 'tag-label';
                    tagLabel.innerText = t;
                    tagList.appendChild(tagLabel);
                });
                item.appendChild(tagList);
            }

            // 操作ボタンコンテナ
            const actions = document.createElement('div');
            actions.className = 'item-actions';
            actions.style.display = adminSection.classList.contains('active') ? 'flex' : 'none';

            // スター切り替えボタン
            const starToggleBtn = document.createElement('button');
            starToggleBtn.className = 'btn-favorite-toggle';
            starToggleBtn.innerText = prompt.isFavorite ? '⭐' : '☆';
            starToggleBtn.title = prompt.isFavorite ? 'お気に入り解除' : 'お気に入り登録';
            starToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(originalIndex);
            });

            // 編集ボタン
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-edit';
            editBtn.innerText = '編集';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                enterEditMode(originalIndex, prompt);
            });

            // 削除ボタン
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.innerText = '削除';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePrompt(originalIndex);
            });

            actions.appendChild(starToggleBtn);
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            item.appendChild(actions);

            // クリックで挿入メッセージを送信（管理モード以外）
            item.addEventListener('click', () => {
                if (!adminSection.classList.contains('active')) {
                    sendToContentScript(prompt.text);
                }
            });

            cueListContainer.appendChild(item);
        });
    }

    /**
     * 編集モードに入る
     */
    function enterEditMode(index, prompt) {
        editIndexInput.value = index;
        titleInput.value = prompt.title;
        tagsInput.value = prompt.tags ? prompt.tags.join(', ') : '';
        favoriteInput.checked = !!prompt.isFavorite;
        textInput.value = prompt.text;
        adminTitle.innerText = 'プロンプトを編集';
        saveBtn.innerText = '更新';
        adminSection.classList.add('active');
        updateCharCount();
        titleInput.focus();
    }

    /**
     * モードをリセット
     */
    function resetForm() {
        editIndexInput.value = -1;
        titleInput.value = '';
        tagsInput.value = '';
        favoriteInput.checked = false;
        textInput.value = '';
        adminTitle.innerText = 'プロンプトを追加';
        saveBtn.innerText = '保存';
        updateCharCount();
    }

    /**
     * アクティブなタブの content.js にテキスト送信
     */
    function sendToContentScript(text) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'insertText', text: text }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('CueCard: Message failed', chrome.runtime.lastError);
                        alert('NotebookLM のページを再読み込みしてください。');
                    } else {
                        // サイドパネルでは閉じない
                        console.log('CueCard: Insertion successful');
                    }
                });
            }
        });
    }

    /**
     * 管理モードの切り替え
     */
    adminModeBtn.addEventListener('click', () => {
        adminSection.classList.toggle('active');
        const isActive = adminSection.classList.contains('active');
        adminModeBtn.innerText = isActive ? '戻る' : '管理モード';

        if (!isActive) resetForm();
        loadAndRenderPrompts();
    });

    /**
     * 保存/更新実行
     */
    saveBtn.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const text = textInput.value.trim();
        const tagsRaw = tagsInput.value.trim();
        const isFavorite = favoriteInput.checked;
        const editIndex = parseInt(editIndexInput.value);

        if (!title || !text) {
            alert('タイトルとプロンプト内容を入力してください。');
            return;
        }

        // タグの配列化（カンマ、全角カンマ、スペース区切りに対応）
        const tags = tagsRaw ? tagsRaw.split(/[,,、\s]+/).filter(t => t.length > 0) : [];

        chrome.storage.local.get(['prompts'], (result) => {
            const prompts = result.prompts || [];

            const newPrompt = { title, tags, text, isFavorite };

            if (editIndex >= 0) {
                prompts[editIndex] = newPrompt;
            } else {
                prompts.push(newPrompt);
            }

            chrome.storage.local.set({ prompts: prompts }, () => {
                if (chrome.runtime.lastError) {
                    alert('保存に失敗しました。');
                    return;
                }
                resetForm();
                adminSection.classList.remove('active');
                adminModeBtn.innerText = '管理モード';
                loadAndRenderPrompts();
            });
        });
    });

    /**
     * お気に入りのトグル
     */
    function toggleFavorite(index) {
        chrome.storage.local.get(['prompts'], (result) => {
            const prompts = result.prompts || [];
            if (prompts[index]) {
                prompts[index].isFavorite = !prompts[index].isFavorite;
                chrome.storage.local.set({ prompts: prompts }, () => {
                    loadAndRenderPrompts();
                });
            }
        });
    }

    /**
     * プロンプトを削除
     */
    function deletePrompt(index) {
        if (!confirm('このプロンプトを削除しますか？')) return;

        chrome.storage.local.get(['prompts'], (result) => {
            const prompts = result.prompts || [];
            prompts.splice(index, 1);
            chrome.storage.local.set({ prompts: prompts }, () => {
                loadAndRenderPrompts();
            });
        });
    }

    cancelBtn.addEventListener('click', () => {
        adminSection.classList.remove('active');
        adminModeBtn.innerText = '管理モード';
        resetForm();
        loadAndRenderPrompts();
    });

    // 初期表示
    loadAndRenderPrompts();
});
