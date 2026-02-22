// Centralized Selector Management for NotebookLM UI elements
const SELECTORS = {
    // Buttons that the extension can automatically click
    DEEP_RESEARCH_BTN: '.research-option-deep-research',
    MENU_TRIGGERS: 'button[aria-haspopup="menu"]',

    // Main dialog containers used for formatting options
    DIALOGS: {
        AUDIO: 'mat-dialog-container:not([data-auto-formatted="true"]), configurable-form-dialog:not([data-auto-formatted="true"])',
        FLASHCARD: 'mat-dialog-container:not([data-auto-formatted-flash="true"]), configurable-form-dialog:not([data-auto-formatted-flash="true"])',
        QUIZ: 'mat-dialog-container:not([data-auto-formatted-quiz="true"]), configurable-form-dialog:not([data-auto-formatted-quiz="true"])',
        INFOGRAPHIC: 'mat-dialog-container:not([data-auto-formatted-infographic="true"]), configurable-form-dialog:not([data-auto-formatted-infographic="true"])',
        SLIDE: 'mat-dialog-container:not([data-auto-formatted-slide="true"]), configurable-form-dialog:not([data-auto-formatted-slide="true"])',
        VIDEO: 'mat-dialog-container:not([data-auto-formatted-video="true"]), configurable-form-dialog:not([data-auto-formatted-video="true"])',
        CHAT: 'mat-dialog-container:not([data-auto-formatted-chat="true"]), configurable-form-dialog:not([data-auto-formatted-chat="true"])'
    },

    // Internal elements within the dialogs (e.g., buttons, toggles, layout wrappers)
    DIALOG_INTERNALS: {
        TILE_LABEL: '.tile-label',
        CONTROL_WRAPPER: '.control-wrapper',
        CONTROL_LABEL: '.control-label',
        ROW_COLUMN: '.row .column',
        SECTION_TITLE: '.section-title',
        PROMPT_STYLE_SECTIONS: '.prompt-section, .style-section',
        CAROUSEL_LABEL: '.carousel-radio-button .mat-body-small',
        MAT_RADIO_BUTTON_CHECKED: '.mat-mdc-radio-checked, .mat-radio-checked',
        MAT_BUTTON_TOGGLE_CHECKED: '.mat-button-toggle-checked',
        UNSELECTED_OPTION_BUTTON: '.unselected-option-button'
    },

    // Target elements where the "Add to favorite" / UI injection occurs
    INJECTION_LABELS: '#episodeFocus-label, #videoFocus-label, #userSteeringPrompt-label, .mat-title-medium, .control-label',
    ACTIONS_OPTIONS: '.actions-options',
    OMNIBAR: 'omnibar',
    PROMPT_SECTION_TOGGLES: '.prompt-section-toggles'
};
