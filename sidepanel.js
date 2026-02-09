/**
 * CueCard for NotebookLM: ポップアップ管理ロジック
 */

document.addEventListener('DOMContentLoaded', () => {
    // コンテナ
    const adminSection = document.getElementById('admin-section');
    const listContainers = {
        research: document.getElementById('list-research'),
        audio: document.getElementById('list-audio'),
        video: document.getElementById('list-video'),
        report: document.getElementById('list-report'),
        flashcard: document.getElementById('list-flashcard'),
        quiz: document.getElementById('list-quiz'),
        infographic: document.getElementById('list-infographic'),
        slide: document.getElementById('list-slide'),
        datatable: document.getElementById('list-datatable')
    };

    // ボタン
    const adminModeBtn = document.getElementById('admin-mode-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const scrollToAdminBtn = document.getElementById('scroll-to-admin-btn');

    // フォーム入力
    const titleInput = document.getElementById('prompt-title');
    const categoryInput = document.getElementById('prompt-category');
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
    const audioFormatInput = document.getElementById('setting-audio-format');

    // フィルタリング状態
    let currentTag = null;
    let searchQuery = '';

    // 初期プロンプトデータ
    const initialPrompts = [
        { title: '銘柄分析用', category: 'research', tags: ['調査', '分析'], text: '以下の銘柄について、直近の決算短信と中期経営計画から、今後の成長性とリスク要因を箇条書きで分析してください。', isFavorite: true },
        { title: '本要約用', category: 'audio', tags: ['要約'], text: 'この本の内容を、3つの重要なポイントに絞って、中学生でもわかるように要約してください。', isFavorite: true },
        { title: '動画スクリプト作成', category: 'video', tags: ['YouTube'], text: 'このトピックに基づいた5分間のYouTube動画用台本（導入、構成、結び）を、親しみやすい語り口で作成してください。', isFavorite: false }
    ];

    /**
     * アコーディオンの開閉制御
     */
    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
        });
    });

    /**
     * クイックナビゲーション（プロンプト追加フォームへスクロール）
     */
    if (scrollToAdminBtn) {
        scrollToAdminBtn.addEventListener('click', (e) => {
            e.preventDefault();
            adminSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    /**
     * 文字数カウントの更新
     */
    function updateCharCount() {
        if (!textInput) return;
        const length = textInput.value.length;
        charCountDisplay.innerText = `${length} / 5000`;
        if (length >= 4500) {
            charCountDisplay.classList.add('warning');
        } else {
            charCountDisplay.classList.remove('warning');
        }
    }

    if (textInput) {
        textInput.addEventListener('input', updateCharCount);
    }

    /**
     * 検索入力イベント
     */
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            loadAndRenderPrompts();
        });
    }

    /**
     * プロンプトと設定をストレージから読み込み
     */
    function loadAndRenderPrompts() {
        chrome.storage.local.get(['prompts', 'autoDeepResearch', 'audioFormat'], (result) => {
            let prompts = result.prompts;
            if (!prompts || prompts.length === 0) {
                prompts = initialPrompts;
                chrome.storage.local.set({ prompts: prompts });
            }

            // カテゴリ欠損の補完（移行用）
            prompts.forEach(p => {
                if (!p.category) p.category = 'research';
            });

            // 設定の反映
            if (autoDeepResearchInput) {
                autoDeepResearchInput.checked = !!result.autoDeepResearch;
            }
            if (audioFormatInput && result.audioFormat) {
                audioFormatInput.value = result.audioFormat;
            }

            updateTagCloud(prompts);
            renderCategorizedList(prompts);
        });
    }

    /**
     * 設定変更イベント
     */
    if (autoDeepResearchInput) {
        autoDeepResearchInput.addEventListener('change', (e) => {
            chrome.storage.local.set({ autoDeepResearch: e.target.checked });
        });
    }

    if (audioFormatInput) {
        audioFormatInput.addEventListener('change', (e) => {
            chrome.storage.local.set({ audioFormat: e.target.value });
        });
    }

    /**
     * タグクラウドの更新
     */
    function updateTagCloud(prompts) {
        if (!tagCloud) return;
        const allTags = new Set();
        prompts.forEach(p => {
            if (p.tags) p.tags.forEach(t => allTags.add(t));
        });

        tagCloud.innerHTML = '';
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
     * カテゴリ別にリストを描画
     */
    function renderCategorizedList(prompts) {
        // 各コンテナをクリア
        Object.values(listContainers).forEach(c => {
            if (c) c.innerHTML = '';
        });

        // フィルタリング
        let filtered = prompts.filter(p => {
            const matchesTag = !currentTag || (p.tags && p.tags.includes(currentTag));
            const matchesSearch = !searchQuery ||
                p.title.toLowerCase().includes(searchQuery) ||
                p.text.toLowerCase().includes(searchQuery) ||
                (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery)));
            return matchesTag && matchesSearch;
        });

        // カテゴリごとに描画
        const categories = ['research', 'audio', 'video', 'report', 'flashcard', 'quiz', 'infographic', 'slide', 'datatable'];
        categories.forEach(cat => {
            if (!listContainers[cat]) return;

            const catPrompts = filtered.filter(p => {
                if (cat === 'research') {
                    return p.category === cat || !p.category;
                }
                return p.category === cat;
            });

            // お気に入り優先ソート
            catPrompts.sort((a, b) => {
                if (a.isFavorite === b.isFavorite) return 0;
                return a.isFavorite ? -1 : 1;
            });

            catPrompts.forEach(prompt => {
                const originalIndex = prompts.findIndex(p => p === prompt);
                const item = createPromptElement(prompt, originalIndex);
                listContainers[cat].appendChild(item);
            });

            // プロンプトがない場合は「なし」を表示（任意）
            if (catPrompts.length === 0 && !searchQuery && !currentTag) {
                const empty = document.createElement('div');
                empty.style.padding = '8px';
                empty.style.fontSize = '12px';
                empty.style.color = '#94a3b8';
                empty.style.textAlign = 'center';
                empty.innerText = 'プロンプトがありません';
                listContainers[cat].appendChild(empty);
            }
        });
    }

    /**
     * プロンプト要素の作成
     */
    function createPromptElement(prompt, index) {
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

        // 操作ボタン（管理モード時）
        const actions = document.createElement('div');
        actions.className = 'item-actions';
        actions.style.display = adminSection.classList.contains('active') ? 'flex' : 'none';

        const starToggleBtn = document.createElement('button');
        starToggleBtn.className = 'btn-favorite-toggle';
        starToggleBtn.innerText = prompt.isFavorite ? '⭐' : '☆';
        starToggleBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(index); };

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.innerText = '編集';
        editBtn.onclick = (e) => { e.stopPropagation(); enterEditMode(index, prompt); };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.innerText = '削除';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deletePrompt(index); };

        actions.appendChild(starToggleBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(actions);

        item.onclick = () => {
            if (!adminSection.classList.contains('active')) {
                sendToContentScript(prompt.text);
            }
        };

        return item;
    }

    /**
     * 編集モード
     */
    function enterEditMode(index, prompt) {
        editIndexInput.value = index;
        titleInput.value = prompt.title;
        categoryInput.value = prompt.category || 'research';
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
     * 保存/更新
     */
    if (saveBtn) {
        saveBtn.onclick = () => {
            const title = titleInput.value.trim();
            const category = categoryInput.value;
            const text = textInput.value.trim();
            const tagsRaw = tagsInput.value.trim();
            const isFavorite = favoriteInput.checked;
            const editIndex = parseInt(editIndexInput.value);

            if (!title || !text) {
                alert('タイトルと内容を入力してください。');
                return;
            }

            const tags = tagsRaw ? tagsRaw.split(/[,,、\s]+/).filter(t => t.length > 0) : [];

            chrome.storage.local.get(['prompts'], (result) => {
                const prompts = result.prompts || [];
                const newPrompt = { title, category, tags, text, isFavorite };

                if (editIndex >= 0) {
                    prompts[editIndex] = newPrompt;
                } else {
                    prompts.push(newPrompt);
                }

                chrome.storage.local.set({ prompts: prompts }, () => {
                    resetForm();
                    adminSection.classList.remove('active');
                    adminModeBtn.innerText = '管理モード';
                    if (scrollToAdminBtn) scrollToAdminBtn.style.display = 'none';
                    loadAndRenderPrompts();
                });
            });
        };
    }

    function resetForm() {
        editIndexInput.value = -1;
        titleInput.value = '';
        categoryInput.value = 'research';
        tagsInput.value = '';
        favoriteInput.checked = false;
        textInput.value = '';
        adminTitle.innerText = 'プロンプトを追加';
        saveBtn.innerText = '保存';
        updateCharCount();
    }

    function toggleFavorite(index) {
        chrome.storage.local.get(['prompts'], (result) => {
            const prompts = result.prompts || [];
            if (prompts[index]) {
                prompts[index].isFavorite = !prompts[index].isFavorite;
                chrome.storage.local.set({ prompts: prompts }, loadAndRenderPrompts);
            }
        });
    }

    function deletePrompt(index) {
        if (!confirm('削除しますか？')) return;
        chrome.storage.local.get(['prompts'], (result) => {
            const prompts = result.prompts || [];
            prompts.splice(index, 1);
            chrome.storage.local.set({ prompts: prompts }, loadAndRenderPrompts);
        });
    }

    function sendToContentScript(text) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'insertText', text: text }, (res) => {
                    if (chrome.runtime.lastError) alert('ページを再読み込みしてください。');
                });
            }
        });
    }

    if (adminModeBtn) {
        adminModeBtn.onclick = () => {
            adminSection.classList.toggle('active');
            const isActive = adminSection.classList.contains('active');
            adminModeBtn.innerText = isActive ? '戻る' : '管理モード';
            if (scrollToAdminBtn) scrollToAdminBtn.style.display = isActive ? 'block' : 'none';
            if (!isActive) resetForm();
            loadAndRenderPrompts();
        };
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            adminSection.classList.remove('active');
            adminModeBtn.innerText = '管理モード';
            if (scrollToAdminBtn) scrollToAdminBtn.style.display = 'none';
            resetForm();
            loadAndRenderPrompts();
        };
    }

    // 初期起動
    loadAndRenderPrompts();
});
