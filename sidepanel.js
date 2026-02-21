/**
 * Prompt Manager for NotebookLM: サイドパネル管理ロジック / Side Panel Management Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    // アプリケーションの状態管理 / Application State Management
    const state = {
        language: 'ja',
        currentInputTags: [],
        searchQuery: '',
        selectedTags: new Set(),
        onConfirmAction: null
    };

    /**
     * 静的要素の翻訳適用 / Apply translations to static elements
     */
    function updateStaticTranslations() {
        const langData = TRANSLATIONS[state.language];

        // テキストの置換 / Replace text
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (langData[key]) {
                el.innerText = langData[key];
            }
        });

        // プレースホルダーの置換 / Replace placeholders
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

    // バリデーション定数とカテゴリ定義（ここを一括管理の元にする） / Validation constants and category definitions (Centralized management)
    const VALID_CATEGORIES = ['research', 'audio', 'video', 'report', 'flashcard', 'quiz', 'infographic', 'slide', 'datatable'];
    const MAX_TITLE_LENGTH = 20;
    const MAX_TAG_LENGTH = 20;
    const MAX_TAG_COUNT = 10;
    const MAX_TEXT_LENGTH = 5000;
    const MAX_PROMPTS_PER_CATEGORY = 20;

    // コンテナ / Containers
    const adminSection = document.getElementById('admin-section');
    const promptListContainer = document.getElementById('prompt-list-container');
    const listContainers = {}; // 動的に紐付け / Dynamically linked

    // ボタン / Buttons
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    // フォーム入力 / Form inputs
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

    // フィルター要素 / Filter elements
    const searchInput = document.getElementById('search-input');
    const tagCloud = document.getElementById('tag-cloud');

    // 設定要素 (動的生成されるためここでの取得は不要) / Settings elements (No need to retrieve here as they are dynamically generated)

    // カスタムモーダル要素 / Custom modal elements
    const confirmModal = document.getElementById('custom-confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    const confirmNoBtn = document.getElementById('confirm-no-btn');

    // 言語切替イベント / Language switch event
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            state.language = e.target.value;
            chrome.storage.local.set({ language: state.language }, () => {
                applyLanguageChange();
            });
        });
    }

    /**
     * カテゴリセクションの動的生成 / Dynamic generation of category sections
     */
    function initCategorySections() {
        if (!promptListContainer) return;
        promptListContainer.innerHTML = ''; // クリア / Clear

        VALID_CATEGORIES.forEach(cat => {
            const section = document.createElement('section');
            section.className = 'category-section';
            section.dataset.category = cat;

            // 各カテゴリ固有の追加設定（Deep Research, Audio Formatなど） / Category-specific settings (Deep Research, Audio Format, etc.)
            let extraSettingsHtml = '';
            if (cat === 'research') {
                extraSettingsHtml = `
                    <div class="settings-panel" style="margin-bottom: 8px;">
                        <div class="setting-item">
                            <span class="setting-label" data-i18n="setting-deep-research">Deep Research をデフォルトにする</span>
                            <label class="switch">
                                <input type="checkbox" id="setting-auto-deep-research">
                                <span class="slider round"></span>
                            </label>
                        </div>
                    </div>`;
            } else if (cat === 'audio') {
                extraSettingsHtml = `
                    <div class="settings-panel" style="margin-bottom: 8px;">
                        <div class="setting-item">
                            <span class="setting-label" data-i18n="setting-audio-format">デフォルト形式</span>
                            <select id="setting-audio-format" class="setting-select">
                                <option value="">(自動選択なし)</option>
                                <option value="詳細" data-i18n="opt-detail">詳細</option>
                                <option value="概要" data-i18n="opt-summary">概要</option>
                                <option value="評論" data-i18n="opt-critique">評論</option>
                                <option value="議論" data-i18n="opt-debate">議論</option>
                            </select>
                        </div>
                    </div>`;
            } else if (cat === 'flashcard') {
                extraSettingsHtml = `
                    <div class="settings-panel" style="margin-bottom: 8px;">
                        <div class="setting-item">
                            <span class="setting-label" data-i18n="setting-card-count">カードの枚数</span>
                            <select id="setting-flashcard-card-count" class="setting-select">
                                <option value="">(自動選択なし)</option>
                                <option value="少なめ" data-i18n="opt-fewer">少なめ</option>
                                <option value="標準" data-i18n="opt-standard">標準（デフォルト）</option>
                                <option value="多め" data-i18n="opt-more">多め</option>
                            </select>
                        </div>
                        <div class="setting-item" style="margin-top: 4px;">
                            <span class="setting-label" data-i18n="setting-difficulty">難易度レベル</span>
                            <select id="setting-flashcard-difficulty" class="setting-select">
                                <option value="">(自動選択なし)</option>
                                <option value="簡単" data-i18n="opt-easy">簡単</option>
                                <option value="標準" data-i18n="opt-medium">標準（デフォルト）</option>
                                <option value="難しい" data-i18n="opt-hard">難しい</option>
                            </select>
                        </div>
                    </div>`;
            } else if (cat === 'quiz') {
                extraSettingsHtml = `
                    <div class="settings-panel" style="margin-bottom: 8px;">
                        <div class="setting-item">
                            <span class="setting-label" data-i18n="setting-question-count">質問の数</span>
                            <select id="setting-quiz-question-count" class="setting-select">
                                <option value="">(自動選択なし)</option>
                                <option value="少なめ" data-i18n="opt-fewer">少なめ</option>
                                <option value="標準" data-i18n="opt-standard">標準（デフォルト）</option>
                                <option value="多め" data-i18n="opt-more">多め</option>
                            </select>
                        </div>
                        <div class="setting-item" style="margin-top: 4px;">
                            <span class="setting-label" data-i18n="setting-difficulty">難易度レベル</span>
                            <select id="setting-quiz-difficulty" class="setting-select">
                                <option value="">(自動選択なし)</option>
                                <option value="簡単" data-i18n="opt-easy">簡単</option>
                                <option value="標準" data-i18n="opt-medium">標準（デフォルト）</option>
                                <option value="難しい" data-i18n="opt-hard">難しい</option>
                            </select>
                        </div>
                    </div>`;
            }

            section.innerHTML = `
                <div class="category-header collapsed" id="header-${cat}">
                    <div class="category-header-left">
                        <span class="arrow">▼</span>
                        <span class="title" data-i18n="cat-${cat}"></span>
                    </div>
                    <button class="btn-add-category" data-category="${cat}" title="追加">＋</button>
                </div>
                <div class="category-content">
                    ${extraSettingsHtml}
                    <div class="cue-list" id="list-${cat}"></div>
                </div>
            `;
            promptListContainer.appendChild(section);

            // コンテナ参照を保持 / Hold container references
            listContainers[cat] = section.querySelector(`#list-${cat}`);

            // アコーディオン開閉イベント / Accordion open/close event
            const header = section.querySelector('.category-header');
            header.addEventListener('click', (e) => {
                if (e.target.closest('.btn-add-category')) return; // ＋ボタンのクリックはアコーディオン開閉しない / Click on the + button does not open/close the accordion
                header.classList.toggle('collapsed');
            });

            // ＋ボタンイベント / + button event
            const addBtn = section.querySelector('.btn-add-category');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const category = addBtn.dataset.category;
                resetForm();
                categoryInput.value = category;
                adminSection.scrollIntoView({ behavior: 'smooth' });
                titleInput.focus();
            });
        });

        // 動的に追加された要素ので、要素参照を再初期化する必要があるもの / Elements that were dynamically added and need their references re-initialized
        const autoDeepResearchInputNew = document.getElementById('setting-auto-deep-research');
        const audioFormatInputNew = document.getElementById('setting-audio-format');
        const flashcardCardCountInputNew = document.getElementById('setting-flashcard-card-count');
        const flashcardDifficultyInputNew = document.getElementById('setting-flashcard-difficulty');
        const quizQuestionCountInputNew = document.getElementById('setting-quiz-question-count');
        const quizDifficultyInputNew = document.getElementById('setting-quiz-difficulty');

        if (autoDeepResearchInputNew) {
            autoDeepResearchInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ autoDeepResearch: e.target.checked });
            });
        }
        if (audioFormatInputNew) {
            audioFormatInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ audioFormat: e.target.value });
            });
        }
        if (flashcardCardCountInputNew) {
            flashcardCardCountInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ flashcardCardCount: e.target.value });
            });
        }
        if (flashcardDifficultyInputNew) {
            flashcardDifficultyInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ flashcardDifficulty: e.target.value });
            });
        }
        if (quizQuestionCountInputNew) {
            quizQuestionCountInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ quizQuestionCount: e.target.value });
            });
        }
        if (quizDifficultyInputNew) {
            quizDifficultyInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ quizDifficulty: e.target.value });
            });
        }
    }

    // フィルタリング状態 / Filtering state

    // 初期プロンプトデータ / Initial prompt data
    const initialPrompts = [
        { title: '銘柄分析用', category: 'research', tags: ['調査', '分析'], text: '以下の銘柄について、直近の決算短信と中期経営計画から、今後の成長性とリスク要因を箇条書きで分析してください。', isFavorite: true },
        { title: 'Stock Analysis', category: 'research', tags: ['Research', 'Analysis'], text: 'Analyze the growth potential and risk factors of the following stock based on its latest financial results and medium-term business plan in bullet points.', isFavorite: true },
        { title: '音声解説サンプル', category: 'audio', tags: ['解説', '入門'], text: 'このソースの内容を、ラジオ番組の構成案として整理してください。主な聴取層はビジネスパーソンで、最新トレンドの紹介というトーンでお願いします。', isFavorite: true },
        { title: 'Audio Summary Sample', category: 'audio', tags: ['Summary', 'Learning'], text: 'Please organize the content of this source as a radio program script. The main audience is business professionals, and the tone should be like an introduction to latest trends.', isFavorite: true },
        { title: '動画スクリプト作成', category: 'video', tags: ['YouTube'], text: 'このトピックに基づいた5分間のYouTube動画用台本（導入、構成、結び）を、親しみやすい語り口で作成してください。', isFavorite: false }
    ];


    /**
     * 文字数カウントの更新 / Update character count
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

    // タグ入力ロジック / Tag input logic
    if (tagsInputElement) {
        // コンテナクリックで入力にフォーカス / Focus input on container click
        tagsInputContainer.addEventListener('click', () => {
            tagsInputElement.focus();
        });

        tagsInputElement.addEventListener('keydown', (e) => {
            if (e.isComposing) return; // IME変換中は無視 / Ignore during IME composition

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
            // 重複チェック（オプション） / Duplicate check (optional)
            if (!state.currentInputTags.includes(val)) {
                state.currentInputTags.push(val);
                renderInputTags();
                updateTagsCharCount();
            }
            tagsInputElement.value = '';
            clearValidationErrors(); // エラーがあれば消す / Clear validation errors if any
        }
    }

    function renderInputTags() {
        // 既存のチップを削除（input以外） / Remove existing chips (except input)
        const chips = tagsInputContainer.querySelectorAll('.tag-chip-input');
        chips.forEach(c => c.remove());

        // チップを再生成してinputの前に挿入 / Regenerate chips and insert them before input
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

        // 隠しフィールド更新 / Update hidden field
        tagsHiddenInput.value = state.currentInputTags.join(',');
    }

    /**
     * 検索入力イベント / Search input event
     */
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            loadAndRenderPrompts();
        });
    }

    /**
     * プロンプトと設定をストレージから読み込み / Load prompts and settings from storage
     */
    function loadAndRenderPrompts() {
        chrome.storage.local.get(['prompts', 'autoDeepResearch', 'audioFormat', 'flashcardCardCount', 'flashcardDifficulty', 'quizQuestionCount', 'quizDifficulty', 'language'], (result) => {
            // 言語設定の反映 / Reflect language setting
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

            // カテゴリ欠損の補完（移行用） / Complete missing categories (for migration)
            prompts.forEach(p => {
                if (!p.category) p.category = 'research';
            });

            // 設定の反映 / Reflect settings
            const autoDeepResearchInputLocal = document.getElementById('setting-auto-deep-research');
            const audioFormatInputLocal = document.getElementById('setting-audio-format');

            if (autoDeepResearchInputLocal) {
                autoDeepResearchInputLocal.checked = !!result.autoDeepResearch;
            }
            if (audioFormatInputLocal && result.audioFormat) {
                audioFormatInputLocal.value = result.audioFormat;
            }

            const flashcardCardCountInputLocal = document.getElementById('setting-flashcard-card-count');
            const flashcardDifficultyInputLocal = document.getElementById('setting-flashcard-difficulty');

            if (flashcardCardCountInputLocal && result.flashcardCardCount) {
                flashcardCardCountInputLocal.value = result.flashcardCardCount;
            }
            if (flashcardDifficultyInputLocal && result.flashcardDifficulty) {
                flashcardDifficultyInputLocal.value = result.flashcardDifficulty;
            }

            const quizQuestionCountInputLocal = document.getElementById('setting-quiz-question-count');
            const quizDifficultyInputLocal = document.getElementById('setting-quiz-difficulty');

            if (quizQuestionCountInputLocal && result.quizQuestionCount) {
                quizQuestionCountInputLocal.value = result.quizQuestionCount;
            }
            if (quizDifficultyInputLocal && result.quizDifficulty) {
                quizDifficultyInputLocal.value = result.quizDifficulty;
            }

            updateTagCloud(prompts);
            renderCategorizedList(prompts);
        });
    }


    /**
     * タグクラウドの更新 / Update tag cloud
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
     * カテゴリ別にリストを描画 / Render list by category
     */
    function renderCategorizedList(prompts) {
        // 各コンテナをクリア / Clear each container
        Object.values(listContainers).forEach(c => {
            if (c) while (c.firstChild) c.removeChild(c.firstChild);
        });

        // フィルタリング / Filtering
        let filtered = prompts.filter(p => {
            // AND検索: 選択されたすべてのタグを持っているか / AND search: Check if it has all selected tags
            const matchesTag = state.selectedTags.size === 0 ||
                (p.tags && Array.from(state.selectedTags).every(t => p.tags.includes(t)));
            const matchesSearch = !state.searchQuery ||
                p.title.toLowerCase().includes(state.searchQuery) ||
                p.text.toLowerCase().includes(state.searchQuery) ||
                (p.tags && p.tags.some(t => t.toLowerCase().includes(state.searchQuery)));
            return matchesTag && matchesSearch;
        });

        // カテゴリごとに描画 / Render per category
        const categories = ['research', 'audio', 'video', 'report', 'flashcard', 'quiz', 'infographic', 'slide', 'datatable'];
        categories.forEach(cat => {
            if (!listContainers[cat]) return;

            const catPrompts = filtered.filter(p => {
                // 'research' カテゴリの場合、カテゴリ未設定のものも救済する / If 'research' category, also include prompts with no category
                if (cat === 'research') {
                    return p.category === cat || !p.category;
                }
                return p.category === cat;
            });

            // お気に入り優先ソート / Sort favorites first
            catPrompts.sort((a, b) => {
                if (a.isFavorite === b.isFavorite) return 0;
                return a.isFavorite ? -1 : 1;
            });

            catPrompts.forEach(prompt => {
                const originalIndex = prompts.findIndex(p => p === prompt);
                const item = createPromptElement(prompt, originalIndex);
                listContainers[cat].appendChild(item);
            });

            // プロンプトがない場合は「なし」を表示 / Display "None" if there are no prompts
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
     * プロンプト要素の作成 / Create prompt element
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

        // 操作ボタン（常時表示） / Action buttons (always visible)
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

        // タグ表示 / Tag display
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
     * 編集モード / Edit mode
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
     * 保存/更新 / Save or Update
     */
    if (saveBtn) {
        saveBtn.onclick = () => {
            const isUpdate = parseInt(editIndexInput.value) >= 0;
            const message = TRANSLATIONS[state.language][isUpdate ? 'confirm-update' : 'confirm-save'];

            // バリデーションチェック（簡易） / Simple validation check
            if (!titleInput.value.trim() || !textInput.value.trim()) {
                // エラー表示のため、バリデーションロジックだけ実行させる / Execute only validation logic for error display
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

            // カテゴリ別の件数上限チェック（新規追加時のみ） / Per-category limit check (only for new additions)
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
     * バリデーションエラーの表示 / Display validation error
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

    // モーダルの外側をクリックして閉じる / Close modal when clicking outside
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
            // 入力が空なら確認せずにリセット / Reset without confirmation if input is empty
            if (!titleInput.value.trim() && !textInput.value.trim() && parseInt(editIndexInput.value) === -1) {
                resetForm();
                return;
            }
            showConfirmModal(TRANSLATIONS[state.language]['confirm-cancel'], TRANSLATIONS[state.language]['btn-confirm-yes'], TRANSLATIONS[state.language]['btn-confirm-no'], () => {
                resetForm();
            });
        };
    }

    // 初期起動 / Initial startup
    initCategorySections();
    loadAndRenderPrompts();
});
