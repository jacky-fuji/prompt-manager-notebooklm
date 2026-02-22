/**
 * Prompt Manager for NotebookLM: Background Script
 * Configures the side panel to open upon clicking the extension icon.
 */

chrome.runtime.onInstalled.addListener(() => {
    // Set behavior to open side panel on icon click
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error('SidePanel setup error:', error));
});
