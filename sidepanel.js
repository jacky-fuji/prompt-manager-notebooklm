/**
 * Prompt Manager for NotebookLM: サイドパネル管理ロジック
 */

document.addEventListener('DOMContentLoaded', () => {
    // 多言語対応データ
    const TRANSLATIONS = {
        ja: {
            'app-title': 'Prompt Manager for NotebookLM',
            'label-language': '言語切替',
            'search-placeholder': '保存済みのプロンプトを検索...',
            'tag-all': 'すべて',
            'cat-research': 'ソース検索',
            'cat-audio': '音声解説',
            'cat-video': '動画解説',
            'cat-report': 'レポート',
            'cat-flashcard': 'フラッシュカード',
            'cat-quiz': 'クイズ',
            'cat-infographic': 'インフォグラフィック',
            'cat-slide': 'スライド資料',
            'cat-datatable': 'Data Table',
            'setting-deep-research': 'Deep Research をデフォルトにする',
            'setting-audio-format': 'デフォルト形式',
            'opt-detail': '詳細',
            'opt-summary': '概要',
            'opt-critique': '評論',
            'opt-debate': '議論',
            'no-prompts': 'プロンプトがありません',
            'admin-add-title': 'プロンプトの追加',
            'admin-edit-title': 'プロンプトを編集',
            'label-category': 'カテゴリ',
            'placeholder-title': 'タイトル（例: 銘柄分析）',
            'placeholder-tags': 'タグ (Enterで追加)',
            'placeholder-text': 'プロンプト内容',
            'label-favorite': '⭐ お気に入り登録',
            'btn-save': '保存',
            'btn-update': '更新',
            'btn-cancel': 'キャンセル',
            'err-title-empty': 'タイトルを入力してください。',
            'err-title-long': 'タイトルは20文字以内で入力してください。',
            'err-text-empty': 'プロンプト内容を入力してください。',
            'err-text-long': 'プロンプト内容は5000文字以内で入力してください。',
            'err-tag-count': 'タグは10個までです。',
            'err-tag-length': 'タグは20文字以内で入力してください。',
            'err-cat-invalid': '無効なカテゴリです。',
            'err-cat-limit': 'このカテゴリには最大20件まで登録できます。',
            'confirm-save': 'プロンプトを保存しますか？',
            'confirm-update': '変更を保存しますか？',
            'confirm-cancel': '編集を取り消しますか？',
            'confirm-delete-prefix': '',
            'confirm-delete-suffix': 'のプロンプトを削除しますか？',
            'btn-confirm-yes': 'はい',
            'btn-confirm-no': 'キャンセル',
            'btn-confirm-delete': '削除',
            'btn-confirm-back': 'いいえ',
            'tag-suffix': '個',
            'reload-page': 'ページを再読み込みしてください。'
        },
        en: {
            'app-title': 'Prompt Manager for NotebookLM',
            'label-language': 'Language',
            'search-placeholder': 'Search saved prompts...',
            'tag-all': 'All',
            'cat-research': 'Research sources',
            'cat-audio': 'Audio Overview',
            'cat-video': 'Video Overview',
            'cat-report': 'Reports',
            'cat-flashcard': 'Flashcards',
            'cat-quiz': 'Quiz',
            'cat-infographic': 'Infographic',
            'cat-slide': 'Slide Deck',
            'cat-datatable': 'Data Table',
            'setting-deep-research': 'Use Deep Research as default',
            'setting-audio-format': 'Default format',
            'opt-detail': 'Deep Dive',
            'opt-summary': 'Brief',
            'opt-critique': 'Critique',
            'opt-debate': 'Debate',
            'no-prompts': 'No prompts available',
            'admin-add-title': 'Add Prompt',
            'admin-edit-title': 'Edit Prompt',
            'label-category': 'Category',
            'placeholder-title': 'Title (e.g., Stock Analysis)',
            'placeholder-tags': 'Tags (Enter to add)',
            'placeholder-text': 'Enter prompt...',
            'label-favorite': '⭐ Add to favorite',
            'btn-save': 'Save',
            'btn-update': 'Update',
            'btn-cancel': 'Cancel',
            'err-title-empty': 'Please enter a title.',
            'err-title-long': 'Title must be 20 characters or less.',
            'err-text-empty': 'Please enter the prompt.',
            'err-text-long': 'Prompt content must be 5000 characters or less.',
            'err-tag-count': 'Maximum 10 tags allowed.',
            'err-tag-length': 'Each tag must be 20 characters or less.',
            'err-cat-invalid': 'Invalid category.',
            'err-cat-limit': 'Maximum 20 prompts allowed per category.',
            'confirm-save': 'Do you want to save this prompt?',
            'confirm-update': 'Do you want to save changes?',
            'confirm-cancel': 'Discard changes?',
            'confirm-delete-prefix': 'Delete "',
            'confirm-delete-suffix': '"?',
            'btn-confirm-yes': 'Yes',
            'btn-confirm-no': 'Cancel',
            'btn-confirm-delete': 'Delete',
            'btn-confirm-back': 'No',
            'tag-suffix': ' tags',
            'reload-page': 'Please reload the page.'
        }
    };

    // アプリケーションの状態管理
    const state = {
        language: 'ja',
        currentInputTags: [],
        searchQuery: '',
        selectedTags: new Set(),
        onConfirmAction: null
    };

    /**
     * 静的要素の翻訳適用
     */
    function updateStaticTranslations() {
        const langData = TRANSLATIONS[state.language];

        // テキストの置換
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (langData[key]) {
                el.innerText = langData[key];
            }
        });

        // プレースホルダーの置換
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (langData[key]) {
                el.placeholder = langData[key];
            }
        });
    }

    function applyLanguageChange() {
        loadAndRenderPrompts();
    }

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
    const languageSelect = document.getElementById('language-select');
    const titleInput = document.getElementById('prompt-title');
    const categoryInput = document.getElementById('prompt-category');
    const tagsInputContainer = document.getElementById('tags-input-container');
    const tagsInputElement = document.getElementById('prompt-tags-input');
    const tagsHiddenInput = document.getElementById('prompt-tags');
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

    // 言語切替イベント
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            state.language = e.target.value;
            chrome.storage.local.set({ language: state.language }, () => {
                applyLanguageChange();
            });
        });
    }

    // バリデーション定数
    const VALID_CATEGORIES = ['research', 'audio', 'video', 'report', 'flashcard', 'quiz', 'infographic', 'slide', 'datatable'];
    const MAX_TITLE_LENGTH = 20;
    const MAX_TAG_LENGTH = 20;
    const MAX_TAG_COUNT = 10;
    const MAX_TEXT_LENGTH = 5000;
    const MAX_PROMPTS_PER_CATEGORY = 20;

    // フィルタリング状態

    // 初期プロンプトデータ
    const initialPrompts = [
        { title: '銘柄分析用', category: 'research', tags: ['調査', '分析'], text: '以下の銘柄について、直近の決算短信と中期経営計画から、今後の成長性とリスク要因を箇条書きで分析してください。', isFavorite: true },
        { title: 'Stock Analysis', category: 'research', tags: ['Research', 'Analysis'], text: 'Analyze the growth potential and risk factors of the following stock based on its latest financial results and medium-term business plan in bullet points.', isFavorite: true },
        { title: '音声解説サンプル', category: 'audio', tags: ['解説', '入門'], text: 'このソースの内容を、ラジオ番組の構成案として整理してください。主な聴取層はビジネスパーソンで、最新トレンドの紹介というトーンでお願いします。', isFavorite: true },
        { title: 'Audio Summary Sample', category: 'audio', tags: ['Summary', 'Learning'], text: 'Please organize the content of this source as a radio program script. The main audience is business professionals, and the tone should be like an introduction to latest trends.', isFavorite: true },
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
        const count = state.currentInputTags.length;
        const suffix = TRANSLATIONS[state.language]['tag-suffix'];
        tagsCharCountDisplay.innerText = `${count} / ${MAX_TAG_COUNT}${suffix}`;
        if (count >= MAX_TAG_COUNT) {
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

    // タグ入力ロジック
    if (tagsInputElement) {
        // コンテナクリックで入力にフォーカス
        tagsInputContainer.addEventListener('click', () => {
            tagsInputElement.focus();
        });

        tagsInputElement.addEventListener('keydown', (e) => {
            if (e.isComposing) return; // IME変換中は無視

            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTagFromInput();
            } else if (e.key === 'Backspace' && tagsInputElement.value === '' && state.currentInputTags.length > 0) {
                state.currentInputTags.pop();
                renderInputTags();
                updateTagsCharCount();
            }
        });

        tagsInputElement.addEventListener('blur', () => {
            addTagFromInput();
        });
    }

    function addTagFromInput() {
        const val = tagsInputElement.value.trim().replace(/,/g, '');
        if (val) {
            if (val.length > MAX_TAG_LENGTH) {
                showValidationError(tagsInputContainer, `タグは${MAX_TAG_LENGTH}文字以内で入力してください。`);
                return;
            }
            // 重複チェック（オプション）
            if (!state.currentInputTags.includes(val)) {
                state.currentInputTags.push(val);
                renderInputTags();
                updateTagsCharCount();
            }
            tagsInputElement.value = '';
            clearValidationErrors(); // エラーがあれば消す
        }
    }

    function renderInputTags() {
        // 既存のチップを削除（input以外）
        const chips = tagsInputContainer.querySelectorAll('.tag-chip-input');
        chips.forEach(c => c.remove());

        // チップを再生成してinputの前に挿入
        state.currentInputTags.forEach((tag, index) => {
            const chip = document.createElement('div');
            chip.className = 'tag-chip-input';

            const span = document.createElement('span');
            span.innerText = tag;
            chip.appendChild(span);

            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                state.currentInputTags.splice(index, 1);
                renderInputTags();
                updateTagsCharCount();
            };
            chip.appendChild(removeBtn);

            tagsInputContainer.insertBefore(chip, tagsInputElement);
        });

        // 隠しフィールド更新
        tagsHiddenInput.value = state.currentInputTags.join(',');
    }

    /**
     * 検索入力イベント
     */
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            loadAndRenderPrompts();
        });
    }

    /**
     * プロンプトと設定をストレージから読み込み
     */
    function loadAndRenderPrompts() {
        chrome.storage.local.get(['prompts', 'autoDeepResearch', 'audioFormat', 'language'], (result) => {
            // 言語設定の反映
            if (result.language) {
                state.language = result.language;
                if (languageSelect) languageSelect.value = state.language;
            }
            updateStaticTranslations();
            updateTagsCharCount();
            updateCharCount();
            updateTitleCharCount();

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
        allBtn.className = `tag-chip ${state.selectedTags.size === 0 ? 'active' : ''}`;
        allBtn.innerText = TRANSLATIONS[state.language]['tag-all'];
        allBtn.onclick = () => {
            state.selectedTags.clear();
            loadAndRenderPrompts();
        };
        tagCloud.appendChild(allBtn);

        [...allTags].sort().forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `tag-chip ${state.selectedTags.has(tag) ? 'active' : ''}`;
            btn.innerText = tag;
            btn.onclick = () => {
                if (state.selectedTags.has(tag)) {
                    state.selectedTags.delete(tag);
                } else {
                    state.selectedTags.add(tag);
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
            const matchesTag = state.selectedTags.size === 0 ||
                (p.tags && Array.from(state.selectedTags).every(t => p.tags.includes(t)));
            const matchesSearch = !state.searchQuery ||
                p.title.toLowerCase().includes(state.searchQuery) ||
                p.text.toLowerCase().includes(state.searchQuery) ||
                (p.tags && p.tags.some(t => t.toLowerCase().includes(state.searchQuery)));
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
            if (catPrompts.length === 0 && !state.searchQuery && state.selectedTags.size === 0) {
                const empty = document.createElement('div');
                empty.style.padding = '8px 12px';
                empty.style.fontSize = '12px';
                empty.style.color = '#94a3b8';
                empty.style.textAlign = 'left';
                empty.innerText = TRANSLATIONS[state.language]['no-prompts'];
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
        tagsHiddenInput.value = prompt.tags ? prompt.tags.join(',') : '';
        state.currentInputTags = prompt.tags ? [...prompt.tags] : [];
        renderInputTags();
        favoriteInput.checked = !!prompt.isFavorite;
        textInput.value = prompt.text;
        adminTitle.innerText = TRANSLATIONS[state.language]['admin-edit-title'];
        saveBtn.innerText = TRANSLATIONS[state.language]['btn-update'];
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
            const message = TRANSLATIONS[state.language][isUpdate ? 'confirm-update' : 'confirm-save'];

            // バリデーションチェック（簡易）
            if (!titleInput.value.trim() || !textInput.value.trim()) {
                // エラー表示のため、バリデーションロジックだけ実行させる
                executeSave();
                return;
            }

            showConfirmModal(message, TRANSLATIONS[state.language]['btn-confirm-yes'], TRANSLATIONS[state.language]['btn-confirm-no'], () => {
                executeSave();
            });
        };
    }

    function executeSave() {
        clearValidationErrors();

        const title = titleInput.value.trim();
        const category = categoryInput.value;
        const text = textInput.value.trim();
        const tags = state.currentInputTags;
        const isFavorite = favoriteInput.checked;
        const editIndex = parseInt(editIndexInput.value);

        let hasError = false;

        if (!title) {
            showValidationError(titleInput, TRANSLATIONS[state.language]['err-title-empty']);
            hasError = true;
        } else if (title.length > MAX_TITLE_LENGTH) {
            showValidationError(titleInput, TRANSLATIONS[state.language]['err-title-long']);
            hasError = true;
        }

        if (!text) {
            showValidationError(textInput, TRANSLATIONS[state.language]['err-text-empty']);
            hasError = true;
        } else if (text.length > MAX_TEXT_LENGTH) {
            showValidationError(textInput, TRANSLATIONS[state.language]['err-text-long']);
            hasError = true;
        }

        if (!VALID_CATEGORIES.includes(category)) {
            showValidationError(categoryInput, TRANSLATIONS[state.language]['err-cat-invalid']);
            hasError = true;
        }

        if (tags.length > MAX_TAG_COUNT) {
            showValidationError(tagsInputContainer, TRANSLATIONS[state.language]['err-tag-count']);
            hasError = true;
        } else if (tags.some(t => t.length > MAX_TAG_LENGTH)) {
            showValidationError(tagsInputContainer, TRANSLATIONS[state.language]['err-tag-length']);
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
                    showValidationError(categoryInput, TRANSLATIONS[state.language]['err-cat-limit']);
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

        tagsInputElement.value = '';
        tagsHiddenInput.value = '';
        state.currentInputTags = [];
        renderInputTags();

        favoriteInput.checked = false;
        textInput.value = '';
        adminTitle.innerText = TRANSLATIONS[state.language]['admin-add-title'];
        saveBtn.innerText = TRANSLATIONS[state.language]['btn-save'];
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
        const message = `${TRANSLATIONS[state.language]['confirm-delete-prefix']}${title}${TRANSLATIONS[state.language]['confirm-delete-suffix']}`;
        showConfirmModal(message, TRANSLATIONS[state.language]['btn-confirm-delete'], TRANSLATIONS[state.language]['btn-confirm-no'], () => {
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
        state.onConfirmAction = onConfirm;
        confirmModal.classList.add('active');
    }

    if (confirmYesBtn) {
        confirmYesBtn.onclick = () => {
            if (state.onConfirmAction) {
                state.onConfirmAction();
            }
            closeModal();
        };
    }

    if (confirmNoBtn) {
        confirmNoBtn.onclick = closeModal;
    }

    function closeModal() {
        confirmModal.classList.remove('active');
        state.onConfirmAction = null;
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
                    if (chrome.runtime.lastError) alert(TRANSLATIONS[state.language]['reload-page']);
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
            showConfirmModal(TRANSLATIONS[state.language]['confirm-cancel'], TRANSLATIONS[state.language]['btn-confirm-yes'], TRANSLATIONS[state.language]['btn-confirm-no'], () => {
                resetForm();
            });
        };
    }

    // 初期起動
    loadAndRenderPrompts();
});
