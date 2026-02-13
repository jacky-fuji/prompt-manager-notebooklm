/**
 * CueCard for NotebookLM: サイドパネル管理ロジック
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
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    // フォーム入力
    const titleInput = document.getElementById('prompt-title');
    const categoryInput = document.getElementById('prompt-category');
    const tagsInput = document.getElementById('prompt-tags');
    const favoriteInput = document.getElementById('prompt-favorite');
    const textInput = document.getElementById('prompt-text');
    const editIndexInput = document.getElementById('edit-index');
    const charCountDisplay = document.getElementById('char-count');
    const titleCharCountDisplay = document.getElementById('title-char-count');
    const tagsCharCountDisplay = document.getElementById('tags-char-count');
    const adminTitle = document.getElementById('admin-title');

    // フィルター要素
    const searchInput = document.getElementById('search-input');
    const tagCloud = document.getElementById('tag-cloud');

    // 設定要素
    const autoDeepResearchInput = document.getElementById('setting-auto-deep-research');
    const audioFormatInput = document.getElementById('setting-audio-format');

    // カスタムモーダル要素
    const confirmModal = document.getElementById('custom-confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    const confirmNoBtn = document.getElementById('confirm-no-btn');
    let onConfirmAction = null;

    // バリデーション定数
    const VALID_CATEGORIES = ['research', 'audio', 'video', 'report', 'flashcard', 'quiz', 'infographic', 'slide', 'datatable'];
    const MAX_TITLE_LENGTH = 10;
    const MAX_TAG_LENGTH = 10;
    const MAX_TAG_COUNT = 10;
    const MAX_TEXT_LENGTH = 5000;
    const MAX_PROMPTS_PER_CATEGORY = 20;

    // フィルタリング状態
    const selectedTags = new Set();
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
        header.addEventListener('click', (e) => {
            // ＋ボタンのクリックはアコーディオン開閉しない
            if (e.target.closest('.btn-add-category')) return;
            header.classList.toggle('collapsed');
        });
    });

    /**
     * カテゴリ別「＋」ボタン：フォームのカテゴリを設定してスクロール
     */
    document.querySelectorAll('.btn-add-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const category = btn.dataset.category;
            resetForm();
            categoryInput.value = category;
            adminSection.scrollIntoView({ behavior: 'smooth' });
            titleInput.focus();
        });
    });

    /**
     * 文字数カウントの更新
     */
    function updateCharCount() {
        if (!textInput) return;
        const length = textInput.value.length;
        charCountDisplay.innerText = `${length} / ${MAX_TEXT_LENGTH}`;
        if (length >= MAX_TEXT_LENGTH - 500) {
            charCountDisplay.classList.add('warning');
        } else {
            charCountDisplay.classList.remove('warning');
        }
    }

    function updateTitleCharCount() {
        if (!titleInput) return;
        const length = titleInput.value.length;
        titleCharCountDisplay.innerText = `${length} / ${MAX_TITLE_LENGTH}`;
        if (length >= MAX_TITLE_LENGTH) {
            titleCharCountDisplay.classList.add('warning');
        } else {
            titleCharCountDisplay.classList.remove('warning');
        }
    }

    function updateTagsCharCount() {
        if (!tagsInput) return;
        const raw = tagsInput.value.trim();
        const tags = raw ? raw.split(/[,,、\s]+/).filter(t => t.length > 0) : [];
        tagsCharCountDisplay.innerText = `${tags.length} / ${MAX_TAG_COUNT}個`;
        if (tags.length >= MAX_TAG_COUNT) {
            tagsCharCountDisplay.classList.add('warning');
        } else {
            tagsCharCountDisplay.classList.remove('warning');
        }
    }

    if (textInput) {
        textInput.addEventListener('input', updateCharCount);
    }
    if (titleInput) {
        titleInput.addEventListener('input', updateTitleCharCount);
    }
    if (tagsInput) {
        tagsInput.addEventListener('input', updateTagsCharCount);
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
            let prompts = Array.isArray(result.prompts) ? result.prompts : null;
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

        while (tagCloud.firstChild) tagCloud.removeChild(tagCloud.firstChild);
        const allBtn = document.createElement('button');
        allBtn.className = `tag-chip ${selectedTags.size === 0 ? 'active' : ''}`;
        allBtn.innerText = 'すべて';
        allBtn.onclick = () => {
            selectedTags.clear();
            loadAndRenderPrompts();
        };
        tagCloud.appendChild(allBtn);

        [...allTags].sort().forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `tag-chip ${selectedTags.has(tag) ? 'active' : ''}`;
            btn.innerText = tag;
            btn.onclick = () => {
                if (selectedTags.has(tag)) {
                    selectedTags.delete(tag);
                } else {
                    selectedTags.add(tag);
                }
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
            if (c) while (c.firstChild) c.removeChild(c.firstChild);
        });

        // フィルタリング
        let filtered = prompts.filter(p => {
            // AND検索: 選択されたすべてのタグを持っているか
            const matchesTag = selectedTags.size === 0 ||
                (p.tags && Array.from(selectedTags).every(t => p.tags.includes(t)));
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

            // プロンプトがない場合は「なし」を表示
            if (catPrompts.length === 0 && !searchQuery && selectedTags.size === 0) {
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

        const header = document.createElement('div');
        header.className = 'cue-item-header';

        const title = document.createElement('span');
        title.className = 'cue-item-title';
        title.innerText = prompt.title;
        header.appendChild(title);

        // 操作ボタン（常時表示）
        const actions = document.createElement('div');
        actions.className = 'item-actions';

        const starToggleBtn = document.createElement('button');
        starToggleBtn.className = 'btn-favorite-toggle';
        starToggleBtn.innerText = prompt.isFavorite ? '⭐' : '☆';
        starToggleBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(index); };

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.innerText = '✏️';
        editBtn.onclick = (e) => { e.stopPropagation(); enterEditMode(index, prompt); };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.innerText = '🗑️';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deletePrompt(index, prompt.title); };

        actions.appendChild(starToggleBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        header.appendChild(actions);

        item.appendChild(header);

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



        item.onclick = () => {
            sendToContentScript(prompt.text);
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
        updateCharCount();
        updateTitleCharCount();
        updateTagsCharCount();
        adminSection.scrollIntoView({ behavior: 'smooth' });
        titleInput.focus();
    }

    /**
     * 保存/更新
     */
    if (saveBtn) {
        saveBtn.onclick = () => {
            const isUpdate = parseInt(editIndexInput.value) >= 0;
            const message = isUpdate ? '変更を保存しますか？' : 'プロンプトを保存しますか？';

            // バリデーションチェック（簡易）
            if (!titleInput.value.trim() || !textInput.value.trim()) {
                // エラー表示のため、バリデーションロジックだけ実行させる
                executeSave();
                return;
            }

            showConfirmModal(message, 'はい', 'キャンセル', () => {
                executeSave();
            });
        };
    }

    function executeSave() {
        clearValidationErrors();

        const title = titleInput.value.trim();
        const category = categoryInput.value;
        const text = textInput.value.trim();
        const tagsRaw = tagsInput.value.trim();
        const isFavorite = favoriteInput.checked;
        const editIndex = parseInt(editIndexInput.value);

        let hasError = false;

        if (!title) {
            showValidationError(titleInput, 'タイトルを入力してください。');
            hasError = true;
        } else if (title.length > MAX_TITLE_LENGTH) {
            showValidationError(titleInput, `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください。`);
            hasError = true;
        }

        if (!text) {
            showValidationError(textInput, 'プロンプト内容を入力してください。');
            hasError = true;
        } else if (text.length > MAX_TEXT_LENGTH) {
            showValidationError(textInput, `プロンプト内容は${MAX_TEXT_LENGTH}文字以内で入力してください。`);
            hasError = true;
        }

        if (!VALID_CATEGORIES.includes(category)) {
            showValidationError(categoryInput, '無効なカテゴリです。');
            hasError = true;
        }

        const tags = tagsRaw ? tagsRaw.split(/[,,、\s]+/).filter(t => t.length > 0) : [];
        if (tags.length > MAX_TAG_COUNT) {
            showValidationError(tagsInput, `タグは${MAX_TAG_COUNT}個以内で設定してください。`);
            hasError = true;
        } else if (tags.some(t => t.length > MAX_TAG_LENGTH)) {
            showValidationError(tagsInput, `各タグは${MAX_TAG_LENGTH}文字以内で入力してください。`);
            hasError = true;
        }

        if (hasError) return;

        chrome.storage.local.get(['prompts'], (result) => {
            const prompts = Array.isArray(result.prompts) ? result.prompts : [];
            const newPrompt = { title, category, tags, text, isFavorite };

            // カテゴリ別の件数上限チェック（新規追加時のみ）
            if (editIndex < 0) {
                const catCount = prompts.filter(p => (p.category || 'research') === category).length;
                if (catCount >= MAX_PROMPTS_PER_CATEGORY) {
                    showValidationError(categoryInput, `このカテゴリには最大${MAX_PROMPTS_PER_CATEGORY}件まで登録できます。`);
                    return;
                }
            }

            if (editIndex >= 0) {
                prompts[editIndex] = newPrompt;
            } else {
                prompts.push(newPrompt);
            }

            chrome.storage.local.set({ prompts: prompts }, () => {
                resetForm();
                loadAndRenderPrompts();
            });
        });
    }

    function resetForm() {
        clearValidationErrors();
        editIndexInput.value = -1;
        titleInput.value = '';
        categoryInput.value = 'research';
        tagsInput.value = '';
        favoriteInput.checked = false;
        textInput.value = '';
        adminTitle.innerText = 'プロンプトの追加';
        saveBtn.innerText = '保存';
        updateCharCount();
        updateTitleCharCount();
        updateTagsCharCount();
    }

    /**
     * バリデーションエラーの表示
     */
    function showValidationError(inputElement, message) {
        inputElement.classList.add('input-error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        errorDiv.textContent = message;
        inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
    }

    function clearValidationErrors() {
        document.querySelectorAll('.validation-error').forEach(el => el.remove());
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
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

    function deletePrompt(index, title) {
        showConfirmModal(`${title}のプロンプトを削除しますか？`, '削除', 'キャンセル', () => {
            chrome.storage.local.get(['prompts'], (result) => {
                const prompts = result.prompts || [];
                prompts.splice(index, 1);
                chrome.storage.local.set({ prompts: prompts }, () => {
                    loadAndRenderPrompts();
                });
            });
        });
    }

    function showConfirmModal(message, yesLabel, noLabel, onConfirm) {
        confirmMessage.innerText = message;
        confirmYesBtn.innerText = yesLabel;
        confirmNoBtn.innerText = noLabel;
        onConfirmAction = onConfirm;
        confirmModal.classList.add('active');
    }

    if (confirmYesBtn) {
        confirmYesBtn.onclick = () => {
            if (onConfirmAction) {
                onConfirmAction();
            }
            closeModal();
        };
    }

    if (confirmNoBtn) {
        confirmNoBtn.onclick = closeModal;
    }

    function closeModal() {
        confirmModal.classList.remove('active');
        onConfirmAction = null;
    }

    // モーダルの外側をクリックして閉じる
    window.onclick = (event) => {
        if (event.target === confirmModal) {
            closeModal();
        }
    };

    function sendToContentScript(text) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'insertText', text: text }, (res) => {
                    if (chrome.runtime.lastError) alert('ページを再読み込みしてください。');
                });
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            // 入力が空なら確認せずにリセット
            if (!titleInput.value.trim() && !textInput.value.trim() && parseInt(editIndexInput.value) === -1) {
                resetForm();
                return;
            }
            showConfirmModal('編集を取り消しますか？', 'はい', 'いいえ', () => {
                resetForm();
            });
        };
    }

    // 初期起動
    loadAndRenderPrompts();
});
