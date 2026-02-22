- [x] プロジェクトのセットアップと基本UI (Step 1)
- [x] 基本的なプロンプト挿入ロジックの実装 (Step 2)
- [x] UIのポップアップ移行とプロンプト管理 (Step 3)
- [x] フィルタリングと検索機能 (Step 6)
- [x] お気に入り（スター）機能 (Step 7)
- [x] NotebookLM専用設定機能 (Step 8)
- [x] Git リポジトリの初期化と管理 (Step 9)
- [x] お気に入りプロンプトのUI埋め込み (Step 10)
- [x] NotebookLM特化型UIへの刷新 (Step 11)
- [x] UIレイアウトとナビゲーションの改善 (Step 12)
- [x] カテゴリ別ボタンのコンテキスト埋め込み (Step 13)
- [x] 開発のクリーンアップと最終検証 (Step 14：Day 1 完了)

## 次回のアクションプラン (Day 2 予定)

- [x] セキュリティ対策 (Step 14.5)
- [x] UI改善: 管理モード廃止と常時管理UI化
- [x] UI改善: アイコン（鉛筆・ゴミ箱）導入と垂直配置の微調整
- [x] 全カテゴリへのコンテキストボタン埋め込み (Step 15)
- [x] アウトプット設定のデフォルト変更 (Step 16)
- [x] PRIVACY.md の作成

## Day 3 (Upcoming Tasks)

- [ ] インポート・エクスポート機能の実装 (Step 17: JSON形式でのバックアップ・共有機能)

## Sustainability & Robustness (Refactoring Tasks)

- [x] **セレクタの集約管理**: `.research-option-deep-research` 等の DOM セレクタを `selectors.js` にまとめ、UI 変更への耐性を高める。
- [x] **注入失敗の検知と通知**: セレクタが見つからず UI 注入に失敗した場合、サイドパネル等に「UI 更新による影響」を警告表示する。
- [~] **content.js のモジュール分割**: Observer (監視)、Injection (注入)、Logic (挿入) 等にファイルを分割し、保守性を向上。※デグレリスクが高いため当面見送り。
- [x] **MutationObserver の最適化**: 監視対象を document 全体から主要コンテナに限定し、スロットリングを導入して負荷を軽減。

## 運用・公開 (Operations & Publishing)

- [x] GitHub リポジトリへのプッシュ
- [x] PRIVACY.md の作成: 「データはローカル保存・外部送信なし」を明文化し、ユーザーの信頼性を向上。

## 将来の発展アイデア (Future Evolution Ideas)

- [ ] **インポート・エクスポート**: プロンプト集のバックアップや共有を簡単にするための JSON 入出力。 (Planned for Day 3)
- [ ] **Chrome Sync 同期**: Google アカウントを通じて、異なるデバイス間（自宅と会社など）でプロンプトを自動同期。
- [ ] **ダークモード UI テーマ**: NotebookLM の外観に合わせ、サイドパネルの色調をダークモードに自動切り替え。
- [ ] **コンテキスト変数の自動挿入**: プロンプト内に `{{source_name}}` 等を含めると、実行時に現在のソース名に置換される機能。
