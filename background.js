/**
 * Prompt Manager for NotebookLM: バックグラウンドスクリプト
 * 拡張機能アイコンをクリックした際にサイドパネルを開くように設定します。
 */

chrome.runtime.onInstalled.addListener(() => {
    // アイコンクリック時にサイドパネルが開くように挙動を設定
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error('SidePanel setup error:', error));
});
