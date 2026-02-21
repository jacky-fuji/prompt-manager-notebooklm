/**
 * Prompt Manager for NotebookLM: バックグラウンドスクリプト / Background Script
 * 拡張機能アイコンをクリックした際にサイドパネルを開くように設定します。 / Configures the side panel to open upon clicking the extension icon.
 */

chrome.runtime.onInstalled.addListener(() => {
    // アイコンクリック時にサイドパネルが開くように挙動を設定 / Set behavior to open side panel on icon click
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error('SidePanel setup error:', error));
});
