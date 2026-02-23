/**
 * Prompt Manager for NotebookLM: Side Panel Management Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    // Application State Management
    const state = {
        language: 'ja',
        currentInputTags: [],
        searchQuery: '',
        selectedTags: new Set(),
        onConfirmAction: null,
        videoTab: 'focus',
        chatTab: 'chat'
    };

    /**
     * Apply translations to static elements
     */
    function updateStaticTranslations() {
        const langData = TRANSLATIONS[state.language];

        // Replace text
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (langData[key]) {
                el.innerText = langData[key];
            }
        });

        // Replace placeholders
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

    // Validation constants and category definitions (Centralized management)
    const VALID_CATEGORIES = ['research', 'chat', 'audio', 'video', 'report', 'flashcard', 'quiz', 'infographic', 'slide', 'datatable'];
    const MAX_TITLE_LENGTH = 20;
    const MAX_TAG_LENGTH = 20;
    const MAX_TAG_COUNT = 10;
    const MAX_TEXT_LENGTH = 10000;
    const MAX_PROMPTS_PER_CATEGORY = 20;

    // Containers
    const adminSection = document.getElementById('admin-section');
    const promptListContainer = document.getElementById('prompt-list-container');
    const listContainers = {}; // Dynamically linked

    // Buttons
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const btnExport = document.getElementById('btn-export');
    const btnImportTrigger = document.getElementById('btn-import-trigger');

    // Form inputs
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
    const importFileInput = document.getElementById('import-file-input');

    // Video subcategory elements
    const videoSubcategoryGroup = document.getElementById('video-subcategory-group');
    const videoSubcategoryHidden = document.getElementById('prompt-video-subcategory');
    const videoSubFocusRadio = document.getElementById('video-sub-focus');
    const videoSubStyleRadio = document.getElementById('video-sub-style');

    // Chat subcategory elements
    const chatSubcategoryGroup = document.getElementById('chat-subcategory-group');
    const chatSubcategoryHidden = document.getElementById('prompt-chat-subcategory');
    const chatSubMainRadio = document.getElementById('chat-sub-main');
    const chatSubStyleRadio = document.getElementById('chat-sub-style');

    // Filter elements
    const searchInput = document.getElementById('search-input');
    const tagCloud = document.getElementById('tag-cloud');

    // Settings elements (No need to retrieve here as they are dynamically generated)

    // Custom modal elements
    const confirmModal = document.getElementById('custom-confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    const confirmNoBtn = document.getElementById('confirm-no-btn');

    // Language switch event
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            state.language = e.target.value;
            chrome.storage.local.set({ language: state.language }, () => {
                applyLanguageChange();
            });
        });
    }

    // Show/hide subcategory based on category selection
    if (categoryInput) {
        categoryInput.addEventListener('change', (e) => {
            videoSubcategoryGroup.style.display = e.target.value === 'video' ? 'block' : 'none';
            chatSubcategoryGroup.style.display = e.target.value === 'chat' ? 'block' : 'none';
        });
    }

    // Sync subcategory radio buttons
    const handleSubCategoryChange = (e) => {
        videoSubcategoryHidden.value = e.target.value;
    };
    if (videoSubFocusRadio) videoSubFocusRadio.addEventListener('change', handleSubCategoryChange);
    if (videoSubStyleRadio) videoSubStyleRadio.addEventListener('change', handleSubCategoryChange);

    const handleChatSubCategoryChange = (e) => {
        chatSubcategoryHidden.value = e.target.value;
    };
    if (chatSubMainRadio) chatSubMainRadio.addEventListener('change', handleChatSubCategoryChange);
    if (chatSubStyleRadio) chatSubStyleRadio.addEventListener('change', handleChatSubCategoryChange);

    // Elements that were dynamically added and need their references re-initialized
    const initializeDynamicListeners = () => {
        const autoDeepResearchInputNew = document.getElementById('setting-auto-deep-research');
        const chatGoalInputNew = document.getElementById('setting-chat-goal');
        const chatLengthInputNew = document.getElementById('setting-chat-length');
        const audioFormatInputNew = document.getElementById('setting-audio-format');
        const audioLengthInputNew = document.getElementById('setting-audio-length');
        const reportFormatInputNew = document.getElementById('setting-report-format');
        const videoFormatInputNew = document.getElementById('setting-video-format');
        const videoStyleInputNew = document.getElementById('setting-video-style');
        const flashcardCardCountInputNew = document.getElementById('setting-flashcard-card-count');
        const flashcardDifficultyInputNew = document.getElementById('setting-flashcard-difficulty');
        const quizQuestionCountInputNew = document.getElementById('setting-quiz-question-count');
        const quizDifficultyInputNew = document.getElementById('setting-quiz-difficulty');
        const infographicLayoutInputNew = document.getElementById('setting-infographic-layout');
        const infographicDetailLevelInputNew = document.getElementById('setting-infographic-detail-level');
        const slideFormatInputNew = document.getElementById('setting-slide-format');
        const slideLengthInputNew = document.getElementById('setting-slide-length');

        if (autoDeepResearchInputNew) {
            autoDeepResearchInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ autoDeepResearch: e.target.checked });
            });
        }
        if (chatGoalInputNew) {
            chatGoalInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ chatGoal: e.target.value });
            });
        }
        if (chatLengthInputNew) {
            chatLengthInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ chatLength: e.target.value });
            });
        }
        if (audioFormatInputNew) {
            audioFormatInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ audioFormat: e.target.value });
            });
        }
        if (audioLengthInputNew) {
            audioLengthInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ audioLength: e.target.value });
            });
        }
        if (reportFormatInputNew) {
            reportFormatInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ reportFormat: e.target.value });
            });
        }
        if (videoFormatInputNew) {
            videoFormatInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ videoFormat: e.target.value });
            });
        }
        if (videoStyleInputNew) {
            videoStyleInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ videoStyle: e.target.value });
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
        if (infographicLayoutInputNew) {
            infographicLayoutInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ infographicLayout: e.target.value });
            });
        }
        if (infographicDetailLevelInputNew) {
            infographicDetailLevelInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ infographicDetailLevel: e.target.value });
            });
        }
        if (slideFormatInputNew) {
            slideFormatInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ slideFormat: e.target.value });
            });
        }
        if (slideLengthInputNew) {
            slideLengthInputNew.addEventListener('change', (e) => {
                chrome.storage.local.set({ slideLength: e.target.value });
            });
        }
    };

    /**
     * Dynamic generation of category sections
     */
    function initCategorySections() {
        if (!promptListContainer) return;
        promptListContainer.innerHTML = ''; // Clear

        VALID_CATEGORIES.forEach(cat => {
            const section = document.createElement('section');
            section.className = 'category-section';
            section.dataset.category = cat;

            // Category-specific settings (Deep Research, Audio Format, etc.)
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
            } else if (cat === 'chat') {
                extraSettingsHtml = `
                    <div class="settings-panel" style="margin-bottom: 8px;">
                        <div class="setting-item">
                            <span class="setting-label" data-i18n="setting-chat-goal">会話の目的、スタイル、役割</span>
                            <select id="setting-chat-goal" class="setting-select">
                                <option value="Default" data-i18n="opt-chat-goal-default">デフォルト</option>
                                <option value="Learning Guide" data-i18n="opt-chat-goal-learning">学習ガイド</option>
                                <option value="Custom" data-i18n="opt-chat-goal-custom">カスタム</option>
                            </select>
                        </div>
                        <div class="setting-item" style="margin-top: 4px;">
                            <span class="setting-label" data-i18n="setting-chat-length">回答の長さ</span>
                            <select id="setting-chat-length" class="setting-select">
                                <option value="Default" data-i18n="opt-chat-length-default">デフォルト</option>
                                <option value="Longer" data-i18n="opt-chat-length-longer">長め</option>
                                <option value="Shorter" data-i18n="opt-chat-length-shorter">短め</option>
                            </select>
                        </div>
                    </div>
                    <div class="chat-tabs" style="display: flex; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                        <button class="tab-btn ${state.chatTab === 'chat' ? 'active' : ''}" data-chat-tab="chat" 
                            style="background: none; border: none; padding: 4px 8px; font-size: 11px; cursor: pointer; color: ${state.chatTab === 'chat' ? '#2563eb' : '#64748b'}; border-bottom: 2px solid ${state.chatTab === 'chat' ? '#2563eb' : 'transparent'};"
                            data-i18n="opt-chat-main">チャット</button>
                        <button class="tab-btn ${state.chatTab === 'style' ? 'active' : ''}" data-chat-tab="style"
                            style="background: none; border: none; padding: 4px 8px; font-size: 11px; cursor: pointer; color: ${state.chatTab === 'style' ? '#2563eb' : '#64748b'}; border-bottom: 2px solid ${state.chatTab === 'style' ? '#2563eb' : 'transparent'};"
                            data-i18n="opt-chat-style">会話のスタイル</button>
                    </div>`;
            } else if (cat === 'audio') {
                extraSettingsHtml = `
                    <div class="settings-panel" style="margin-bottom: 8px;">
                        <div class="setting-item">
                            <span class="setting-label" data-i18n="setting-audio-format">デフォルト形式</span>
                            <select id="setting-audio-format" class="setting-select">
                                <option value="詳細" data-i18n="opt-detail">詳細</option>
                                <option value="概要" data-i18n="opt-summary">概要</option>
                                <option value="評論" data-i18n="opt-critique">評論</option>
                                <option value="議論" data-i18n="opt-debate">議論</option>
                            </select>
                        </div>
                        <div class="setting-item" style="margin-top: 4px;">
                            <span class="setting-label" data-i18n="setting-audio-length">長さ</span>
                            <select id="setting-audio-length" class="setting-select">
                                <option value="短め" data-i18n="opt-audio-length-short">短め</option>
                                <option value="標準" data-i18n="opt-audio-length-default">標準</option>
                            </select>
                        </div>
                    </div>`;
            } else if (cat === 'video') {
                extraSettingsHtml = `
                    <div class="settings-panel" style="margin-bottom: 8px;">
                        <div class="setting-item">
                            <span class="setting-label" data-i18n="setting-video-format">形式</span>
                            <select id="setting-video-format" class="setting-select">
                                <option value="Explainer" data-i18n="opt-video-format-explainer">説明動画</option>
                                <option value="Brief" data-i18n="opt-video-format-brief">概要</option>
                            </select>
                        </div>
                        <div class="setting-item" style="margin-top: 4px;">
                            <span class="setting-label" data-i18n="setting-video-style">ビジュアルスタイル</span>
                            <select id="setting-video-style" class="setting-select">
                                <option value="Auto-select" data-i18n="opt-video-style-auto">自動選択</option>
                                <option value="Custom" data-i18n="opt-video-style-custom">カスタム</option>
                                <option value="Classic" data-i18n="opt-video-style-classic">クラシック</option>
                                <option value="Whiteboard" data-i18n="opt-video-style-whiteboard">ホワイトボード</option>
                                <option value="Kawaii" data-i18n="opt-video-style-kawaii">カワイイ</option>
                                <option value="Anime" data-i18n="opt-video-style-anime">アニメ</option>
                                <option value="Watercolor" data-i18n="opt-video-style-watercolor">水彩画</option>
                                <option value="Retro print" data-i18n="opt-video-style-retro">レトロスタイル</option>
                                <option value="Heritage" data-i18n="opt-video-style-heritage">遺産</option>
                                <option value="Paper-craft" data-i18n="opt-video-style-papercraft">ペーパークラフト</option>
                            </select>
                        </div>
                    </div>
                    <div class="video-tabs" style="display: flex; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                        <button class="tab-btn ${state.videoTab === 'focus' ? 'active' : ''}" data-video-tab="focus" 
                            style="background: none; border: none; padding: 4px 8px; font-size: 11px; cursor: pointer; color: ${state.videoTab === 'focus' ? '#2563eb' : '#64748b'}; border-bottom: 2px solid ${state.videoTab === 'focus' ? '#2563eb' : 'transparent'};"
                            data-i18n="opt-video-focus">AIホストの焦点</button>
                        <button class="tab-btn ${state.videoTab === 'style' ? 'active' : ''}" data-video-tab="style"
                            style="background: none; border: none; padding: 4px 8px; font-size: 11px; cursor: pointer; color: ${state.videoTab === 'style' ? '#2563eb' : '#64748b'}; border-bottom: 2px solid ${state.videoTab === 'style' ? '#2563eb' : 'transparent'};"
                            data-i18n="opt-video-custom-style">カスタムビジュアルスタイル</button>
                    </div>`;
            } else if (cat === 'flashcard') {
                extraSettingsHtml = `
                    <div class="settings-panel" style="margin-bottom: 8px;">
                        <div class="setting-item">
                            <span class="setting-label" data-i18n="setting-card-count">カードの枚数</span>
                            <select id="setting-flashcard-card-count" class="setting-select">
                                <option value="少なめ" data-i18n="opt-fewer">少なめ</option>
                                <option value="標準" data-i18n="opt-standard">標準</option>
                                <option value="多め" data-i18n="opt-more">多め</option>
                            </select>
                        </div>
                        <div class="setting-item" style="margin-top: 4px;">
                            <span class="setting-label" data-i18n="setting-difficulty">難易度レベル</span>
                            <select id="setting-flashcard-difficulty" class="setting-select">
                                <option value="簡単" data-i18n="opt-easy">簡単</option>
                                <option value="標準" data-i18n="opt-medium">標準</option>
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
                                <option value="少なめ" data-i18n="opt-fewer">少なめ</option>
                                <option value="標準" data-i18n="opt-standard">標準</option>
                                <option value="多め" data-i18n="opt-more">多め</option>
                            </select>
                        </div>
                        <div class="setting-item" style="margin-top: 4px;">
                            <span class="setting-label" data-i18n="setting-difficulty">難易度レベル</span>
                            <select id="setting-quiz-difficulty" class="setting-select">
                                <option value="簡単" data-i18n="opt-easy">簡単</option>
                                <option value="標準" data-i18n="opt-medium">標準</option>
                                <option value="難しい" data-i18n="opt-hard">難しい</option>
                            </select>
                        </div>
                    </div>`;
            } else if (cat === 'infographic') {
                extraSettingsHtml = `
                    <div class="settings-panel" style="margin-bottom: 8px;">
                        <div class="setting-item">
                            <span class="setting-label" data-i18n="setting-layout">レイアウト</span>
                            <select id="setting-infographic-layout" class="setting-select">
                                <option value="横向き" data-i18n="opt-landscape">横向き</option>
                                <option value="縦向き" data-i18n="opt-portrait">縦向き</option>
                                <option value="正方形" data-i18n="opt-square">正方形</option>
                            </select>
                        </div>
                        <div class="setting-item" style="margin-top: 4px;">
                            <span class="setting-label" data-i18n="setting-detail-level">詳細レベル</span>
                            <select id="setting-infographic-detail-level" class="setting-select">
                                <option value="簡潔" data-i18n="opt-concise">簡潔</option>
                                <option value="標準" data-i18n="opt-standard">標準</option>
                                <option value="詳細" data-i18n="opt-detailed">詳細</option>
                            </select>
                        </div>
                    </div>`;
            } else if (cat === 'slide') {
                extraSettingsHtml = `
                    <div class="settings-panel" style="margin-bottom: 8px;">
                        <div class="setting-item">
                            <span class="setting-label" data-i18n="setting-slide-format">形式</span>
                            <select id="setting-slide-format" class="setting-select">
                                <option value="詳細" data-i18n="opt-slide-format-detailed">詳細</option>
                                <option value="プレゼンター用" data-i18n="opt-slide-format-presenter">プレゼンター用</option>
                            </select>
                        </div>
                        <div class="setting-item" style="margin-top: 4px;">
                            <span class="setting-label" data-i18n="setting-slide-length">長さ</span>
                            <select id="setting-slide-length" class="setting-select">
                                <option value="短め" data-i18n="opt-slide-length-short">短め</option>
                                <option value="デフォルト" data-i18n="opt-slide-length-default">標準</option>
                            </select>
                        </div>
                    </div>`;
            }

            section.innerHTML = `
                <div class="category-header" id="header-${cat}">
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

            // Hold container references
            listContainers[cat] = section.querySelector(`#list-${cat}`);

            // Accordion open/close event
            const header = section.querySelector('.category-header');
            header.addEventListener('click', (e) => {
                if (e.target.closest('.btn-add-category')) return; // Click on the + button does not open/close the accordion
                header.classList.toggle('collapsed');
            });

            // + button event
            const addBtn = section.querySelector('.btn-add-category');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const category = addBtn.dataset.category;
                    resetForm();
                    categoryInput.value = category;
                    // Update subcategory visibility
                    videoSubcategoryGroup.style.display = category === 'video' ? 'block' : 'none';
                    chatSubcategoryGroup.style.display = category === 'chat' ? 'block' : 'none';
                    adminSection.scrollIntoView({ behavior: 'smooth' });
                    titleInput.focus();
                });
            }

            // Tab switch event (video category only)
            if (cat === 'video') {
                const tabButtons = section.querySelectorAll('.video-tabs .tab-btn');
                tabButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        state.videoTab = btn.dataset.videoTab;
                        tabButtons.forEach(b => {
                            const isActive = b.dataset.videoTab === state.videoTab;
                            b.classList.toggle('active', isActive);
                            b.style.color = isActive ? '#2563eb' : '#64748b';
                            b.style.borderBottom = `2px solid ${isActive ? '#2563eb' : 'transparent'}`;
                        });
                        loadAndRenderPrompts();
                    });
                });
            }

            // Tab switch event (chat category)
            if (cat === 'chat') {
                const tabButtons = section.querySelectorAll('.chat-tabs .tab-btn');
                tabButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        state.chatTab = btn.dataset.chatTab;
                        tabButtons.forEach(b => {
                            const isActive = b.dataset.chatTab === state.chatTab;
                            b.classList.toggle('active', isActive);
                            b.style.color = isActive ? '#2563eb' : '#64748b';
                            b.style.borderBottom = `2px solid ${isActive ? '#2563eb' : 'transparent'}`;
                        });
                        loadAndRenderPrompts();
                    });
                });
            }
        });
        initializeDynamicListeners();
    }



    // Filtering state

    // Initial prompt data
    const initialPrompts = [
        { title: 'Stock Analysis', category: 'research', tags: ['Research', 'Analysis'], text: 'Analyze the growth potential and risk factors of the following stock based on its latest financial results and medium-term business plan in bullet points.', isFavorite: true }
    ];


    /**
     * Update character count
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

    // Tag input logic
    if (tagsInputElement) {
        // Focus input on container click
        tagsInputContainer.addEventListener('click', () => {
            tagsInputElement.focus();
        });

        tagsInputElement.addEventListener('keydown', (e) => {
            if (e.isComposing) return; // Ignore during IME composition

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
            // Duplicate check (optional)
            if (!state.currentInputTags.includes(val)) {
                state.currentInputTags.push(val);
                renderInputTags();
                updateTagsCharCount();
            }
            tagsInputElement.value = '';
            clearValidationErrors(); // Clear validation errors if any
        }
    }

    function renderInputTags() {
        // Remove existing chips (except input)
        const chips = tagsInputContainer.querySelectorAll('.tag-chip-input');
        chips.forEach(c => c.remove());

        // Regenerate chips and insert them before input
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

        // Update hidden field
        tagsHiddenInput.value = state.currentInputTags.join(',');
    }

    /**
     * Search input event
     */
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            loadAndRenderPrompts();
        });
    }

    /**
     * Load prompts and settings from storage
     */
    function loadAndRenderPrompts() {
        chrome.storage.local.get(['prompts', 'autoDeepResearch', 'chatGoal', 'chatLength', 'audioFormat', 'audioLength', 'reportFormat', 'videoFormat', 'videoStyle', 'flashcardCardCount', 'flashcardDifficulty', 'quizQuestionCount', 'quizDifficulty', 'infographicLayout', 'infographicDetailLevel', 'slideFormat', 'slideLength', 'language'], (result) => {
            // Reflect language setting
            if (result.language) {
                state.language = result.language;
                if (languageSelect) languageSelect.value = state.language;
            }
            updateStaticTranslations();
            updateTagsCharCount();
            updateCharCount();
            updateTitleCharCount();

            let prompts = result.prompts;
            if (prompts === undefined) {
                // Initial install
                prompts = initialPrompts;
                chrome.storage.local.set({ prompts: prompts });
            } else if (!Array.isArray(prompts)) {
                // Fallback for data corruption
                prompts = [];
            }

            // Complete missing categories (for migration)
            prompts.forEach(p => {
                if (!p.category) p.category = 'research';
            });

            // Reflect settings
            const autoDeepResearchInputLocal = document.getElementById('setting-auto-deep-research');
            const audioFormatInputLocal = document.getElementById('setting-audio-format');
            const audioLengthInputLocal = document.getElementById('setting-audio-length');
            const reportFormatInputLocal = document.getElementById('setting-report-format');
            const videoFormatInputLocal = document.getElementById('setting-video-format');
            const videoStyleInputLocal = document.getElementById('setting-video-style');

            if (autoDeepResearchInputLocal) {
                autoDeepResearchInputLocal.checked = !!result.autoDeepResearch;
            }

            const chatGoalInputLocal = document.getElementById('setting-chat-goal');
            const chatLengthInputLocal = document.getElementById('setting-chat-length');

            if (chatGoalInputLocal) {
                chatGoalInputLocal.value = result.chatGoal || 'Default';
            }
            if (chatLengthInputLocal) {
                chatLengthInputLocal.value = result.chatLength || 'Default';
            }
            if (audioFormatInputLocal) {
                audioFormatInputLocal.value = result.audioFormat || '詳細';
            }
            if (audioLengthInputLocal) {
                audioLengthInputLocal.value = result.audioLength || '標準';
            }
            if (reportFormatInputLocal) {
                reportFormatInputLocal.value = result.reportFormat || '独自に作成';
            }
            if (videoFormatInputLocal) {
                videoFormatInputLocal.value = result.videoFormat || 'Explainer';
            }
            if (videoStyleInputLocal) {
                videoStyleInputLocal.value = result.videoStyle || 'Auto-select';
            }

            const flashcardCardCountInputLocal = document.getElementById('setting-flashcard-card-count');
            const flashcardDifficultyInputLocal = document.getElementById('setting-flashcard-difficulty');

            if (flashcardCardCountInputLocal) {
                flashcardCardCountInputLocal.value = result.flashcardCardCount || '標準';
            }
            if (flashcardDifficultyInputLocal) {
                flashcardDifficultyInputLocal.value = result.flashcardDifficulty || '標準';
            }

            const quizQuestionCountInputLocal = document.getElementById('setting-quiz-question-count');
            const quizDifficultyInputLocal = document.getElementById('setting-quiz-difficulty');

            if (quizQuestionCountInputLocal) {
                quizQuestionCountInputLocal.value = result.quizQuestionCount || '標準';
            }
            if (quizDifficultyInputLocal) {
                quizDifficultyInputLocal.value = result.quizDifficulty || '標準';
            }

            const infographicLayoutInputLocal = document.getElementById('setting-infographic-layout');
            const infographicDetailLevelInputLocal = document.getElementById('setting-infographic-detail-level');

            if (infographicLayoutInputLocal) {
                infographicLayoutInputLocal.value = result.infographicLayout || '横向き';
            }
            if (infographicDetailLevelInputLocal) {
                infographicDetailLevelInputLocal.value = result.infographicDetailLevel || '標準';
            }

            const slideFormatInputLocal = document.getElementById('setting-slide-format');
            const slideLengthInputLocal = document.getElementById('setting-slide-length');

            if (slideFormatInputLocal) {
                slideFormatInputLocal.value = result.slideFormat || '詳細';
            }
            if (slideLengthInputLocal) {
                slideLengthInputLocal.value = result.slideLength || 'デフォルト';
            }

            updateTagCloud(prompts);
            renderCategorizedList(prompts);
        });
    }


    /**
     * Update tag cloud
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
     * Render list by category
     */
    function renderCategorizedList(prompts) {
        // Clear each container
        Object.values(listContainers).forEach(c => {
            if (c) while (c.firstChild) c.removeChild(c.firstChild);
        });

        // Filtering
        let filtered = prompts.filter(p => {
            // AND search: Check if it has all selected tags
            const matchesTag = state.selectedTags.size === 0 ||
                (p.tags && Array.from(state.selectedTags).every(t => p.tags.includes(t)));
            const matchesSearch = !state.searchQuery ||
                p.title.toLowerCase().includes(state.searchQuery) ||
                p.text.toLowerCase().includes(state.searchQuery) ||
                (p.tags && p.tags.some(t => t.toLowerCase().includes(state.searchQuery)));
            return matchesTag && matchesSearch;
        });

        // Render per category
        const categories = VALID_CATEGORIES;
        categories.forEach(cat => {
            if (!listContainers[cat]) return;

            const catPrompts = filtered.filter(p => {
                // If 'research' category, also include prompts with no category
                if (cat === 'research') {
                    return p.category === cat || !p.category;
                }
                if (cat === 'video') {
                    if (p.category !== 'video') return false;
                    const sub = p.subCategory || 'focus';
                    return sub === state.videoTab;
                }
                if (cat === 'chat') {
                    if (p.category !== 'chat') return false;
                    const sub = p.subCategory || 'chat';
                    return sub === state.chatTab;
                }
                return p.category === cat;
            });

            // Sort favorites first
            catPrompts.sort((a, b) => {
                if (a.isFavorite === b.isFavorite) return 0;
                return a.isFavorite ? -1 : 1;
            });

            catPrompts.forEach(prompt => {
                const originalIndex = prompts.findIndex(p => p === prompt);
                const item = createPromptElement(prompt, originalIndex);
                listContainers[cat].appendChild(item);
            });

            // Expand if there are prompts, collapse if not
            // [Fix] Logic removed to keep all expanded by default
            const header = document.getElementById(`header-${cat}`);

            // Display "None" if there are no prompts
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
     * Create prompt element
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

        // Action buttons (always visible)
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

        // Tag display
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
     * Edit mode
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

        // Restore subcategory
        if (prompt.category === 'video') {
            videoSubcategoryGroup.style.display = 'block';
            chatSubcategoryGroup.style.display = 'none';
            const sub = prompt.subCategory || 'focus';
            videoSubcategoryHidden.value = sub;
            videoSubFocusRadio.checked = (sub === 'focus');
            videoSubStyleRadio.checked = (sub === 'style');
        } else if (prompt.category === 'chat') {
            chatSubcategoryGroup.style.display = 'block';
            videoSubcategoryGroup.style.display = 'none';
            const sub = prompt.subCategory || 'chat';
            chatSubcategoryHidden.value = sub;
            chatSubMainRadio.checked = (sub === 'chat');
            chatSubStyleRadio.checked = (sub === 'style');
        } else {
            videoSubcategoryGroup.style.display = 'none';
            chatSubcategoryGroup.style.display = 'none';
        }

        updateCharCount();
        updateTitleCharCount();
        updateTagsCharCount();
        adminSection.scrollIntoView({ behavior: 'smooth' });
        titleInput.focus();
    }

    /**
     * Save or Update
     */
    if (saveBtn) {
        saveBtn.onclick = () => {
            const isUpdate = parseInt(editIndexInput.value) >= 0;
            const message = TRANSLATIONS[state.language][isUpdate ? 'confirm-update' : 'confirm-save'];

            // Simple validation check
            if (!titleInput.value.trim() || !textInput.value.trim()) {
                // Execute only validation logic for error display
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
            let subCategory = undefined;
            if (category === 'video') {
                subCategory = videoSubcategoryHidden.value || 'focus';
            } else if (category === 'chat') {
                subCategory = chatSubcategoryHidden.value || 'chat';
            }
            const newPrompt = { title, category, subCategory, tags, text, isFavorite };

            // Per-category limit check (only for new additions)
            if (editIndex < 0) {
                const catCount = prompts.filter(p => {
                    if ((p.category || 'research') !== category) return false;
                    if (category === 'video') {
                        return (p.subCategory || 'focus') === subCategory;
                    } else if (category === 'chat') {
                        return (p.subCategory || 'chat') === subCategory;
                    }
                    return true;
                }).length;

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

        // Subcategory reset
        videoSubcategoryGroup.style.display = 'none';
        videoSubcategoryHidden.value = 'focus';
        videoSubFocusRadio.checked = true;

        chatSubcategoryGroup.style.display = 'none';
        chatSubcategoryHidden.value = 'chat';
        chatSubMainRadio.checked = true;

        updateCharCount();
        updateTitleCharCount();
        updateTagsCharCount();
    }

    /**
     * Display validation error
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

    // Close modal when clicking outside
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
            // Reset without confirmation if input is empty
            if (!titleInput.value.trim() && !textInput.value.trim() && parseInt(editIndexInput.value) === -1) {
                resetForm();
                return;
            }
            showConfirmModal(TRANSLATIONS[state.language]['confirm-cancel'], TRANSLATIONS[state.language]['btn-confirm-yes'], TRANSLATIONS[state.language]['btn-confirm-no'], () => {
                resetForm();
            });
        };
    }

    /* --- Data Management (Export & Import) --- */

    if (btnExport) {
        btnExport.addEventListener('click', () => {
            chrome.storage.local.get(['prompts'], (result) => {
                const prompts = result.prompts || [];
                // Strip environment-specific data, keep only raw structure
                const exportData = prompts.map(p => ({
                    title: p.title,
                    text: p.text,
                    tags: p.tags || []
                }));

                const dataStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                // Generate filename like prompt-manager-backup-20231025.json
                const dateString = new Date().toISOString().split('T')[0].replace(/-/g, '');
                a.download = `prompt-manager-backup-${dateString}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });
    }

    if (btnImportTrigger && importFileInput) {
        btnImportTrigger.addEventListener('click', () => {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsedData = JSON.parse(event.target.result);

                    if (!Array.isArray(parsedData)) {
                        throw new Error("Invalid structure: Not an array");
                    }

                    // Map elements strictly, enforcing 'research' category for all imported prompts
                    const importedPrompts = parsedData.map(p => ({
                        title: p.title || 'Untitled',
                        text: p.text || '',
                        tags: Array.isArray(p.tags) ? p.tags : [],
                        category: 'research',
                        subCategory: undefined,
                        isFavorite: false
                    }));

                    chrome.storage.local.get(['prompts'], (result) => {
                        const existingPrompts = result.prompts || [];
                        const mergedPrompts = existingPrompts.concat(importedPrompts);

                        chrome.storage.local.set({ prompts: mergedPrompts }, () => {
                            // Using a generic confirm modal for success/error messages
                            showConfirmModal(
                                TRANSLATIONS[state.language]['import-success'],
                                TRANSLATIONS[state.language]['btn-confirm-ok'],
                                null, // No "No" button
                                () => { } // Empty callback for "OK"
                            );
                            loadAndRenderPrompts();
                            importFileInput.value = ''; // Reset input
                        });
                    });

                } catch (error) {
                    console.error("Import Error:", error);
                    showConfirmModal(
                        TRANSLATIONS[state.language]['err-import-invalid'],
                        TRANSLATIONS[state.language]['btn-confirm-ok'],
                        null, // No "No" button
                        () => { } // Empty callback for "OK"
                    );
                    importFileInput.value = ''; // Reset input
                }
            };
            reader.readAsText(file);
        });
    }

    // Initial startup
    initCategorySections();
    loadAndRenderPrompts();

    // Display version
    const versionDisplay = document.getElementById('version-display');
    if (versionDisplay) {
        const version = chrome.runtime.getManifest().version;
        versionDisplay.innerText = `v${version}`;
    }
});
