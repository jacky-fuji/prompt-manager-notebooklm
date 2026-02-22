# Session Handover: Prompt Manager for NotebookLM

## 📌 Current Status

- **Version**: v1.3.2
- **Branch**: `dev` is ahead of `main`.
- **Release**: v1.3.2 merged to `dev` (Privacy Policy added, Selectors extracted, MutationObserver optimized).

## ✅ Accomplishments (This Session)

- **Compact UI**: Reduced vertical spacing (gap/margin/padding) in sidepanel for higher density.
- **Enhanced Chat**: Added "Conversation Style" subcategory logic. Custom buttons now appear correctly in NotebookLM's "Customize Chat" dialog only when "Custom" mode is active.
- **High Limit**: Increased prompt character limit to 10,000 with formatted counters.
- **Safety**: Installed Git pre-merge-commit hook. Merging into `main` or `dev` requires creating a temporary `.allow_merge` file.
- **Repo Cleanup**:
  - Removed `.agents/` and binary `zip/` from Git tracking.
  - Moved local artifacts to `ignore/` and `ignore/zip/`.
  - Added `README.md` (with hero/screenshot), `LICENSE` (MIT), and `.gitignore` updates.

## 🚀 Next Steps (Priority Order)

1. **Import/Export (JSON)**: Implement backup/share functionality.
2. **Robustness Refactor**:
    - Split `content.js` into smaller modules (Observer, Injector, etc.).
3. **Execution History**: Track when prompts were used.

## ⚠️ Important Files

- `ignore/task.md`: The main roadmap and idea list.
- `.git/hooks/pre-merge-commit`: The bash script for the merge guard.
- `sidepanel.js`: Reached ~1,200 lines, next candidate for refactoring.
- `content.js`: Handles all DOM injection and interaction with NotebookLM.
