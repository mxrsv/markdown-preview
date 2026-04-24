# Changelog

All notable changes to "Markdown Preview Lexical (Kyan)" will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-04-15

### Fixed

- Completed task subtree now visually dims uniformly — nested sub-bullets (rendered by Lexical inside a sibling wrapper `<li>`) were previously unaffected by CSS cascade; JS post-render pass now tags those wrappers with `.task-done-subtree`
- Click on sub-bullet content no longer accidentally toggles parent checkbox (hit-area now guards against clicks landing in nested children)

### Changed

- Inline code badge background adapts to ambient (translucent overlay) instead of fixed `--vscode-textBlockQuote-background`
- Inline code padding tightened from `0.2em 0.4em` to `0` for compact inline appearance

## [1.3.0] - 2026-04-14

### Added

- **In-preview search** (`Cmd/Ctrl+F`) with match highlighting via CSS Custom Highlight API, prev/next navigation, case-sensitive toggle, match counter
- **Custom font size setting** (`markdownLexicalPreview.fontSize`, 8-48px) with live update — headings scale relative to base size
- **Native pretty checkboxes** for task lists (`- [ ]` / `- [x]`) using Lexical's CHECK_LIST transformer with custom CSS styling
- **Clickable checkbox toggle** — click checkbox to flip `[ ]` ↔ `[x]` in source, auto-saves the file
- **Double-click to copy block** — copies entire paragraph, heading, list item, table cell, or code block (preserves indentation for `<pre>`); visual flash feedback
- **Bidirectional `Cmd/Ctrl+Shift+L`** to toggle between preview and text editor

### Changed

- Checkbox rendering switched from Unicode placeholders to native Lexical task lists for better styling and accessibility (`role="checkbox"`, `aria-checked`)
- Scroll position preserved across content updates (no more jump-to-top after editing)
- Search highlights survive content re-renders without DOM mutation (immune to Lexical reconciler)
- `togglePreview` keybinding now fires from sidebar selection too (uses `editorLangId` instead of `editorTextFocus`)

### Fixed

- Auto-save reliability after checkbox toggle (always calls `document.save()`, no longer gated on `isDirty`)
- Source-line mapping for checkboxes now matches Lexical's CHECK_LIST regex (handles `[ ]`, `[x]`, `[]`, with or without leading dash)
- Keyboard shortcuts (`Cmd+Backspace`, `Cmd+Shift+L`) no longer hijack input fields like the search bar
- Code-block double-click copy preserves indentation (no `.trim()` for `<pre>`)
- Error messages surfaced to user on checkbox toggle failure (read-only file, line out of range)

## [1.2.0] - 2026-03-15

### Added

- Custom prompts settings for Execute / Review buttons via VS Code configuration

## [1.1.0] - 2026-02-28

### Added

- Toolbar with Copy Prompt / Execute Plan / Review buttons
- Double-click to switch to text editor (replaced in 1.3.0 by double-click-to-copy)

## [1.0.3] - 2024-12-10

### Fixed

- Fixed markdown files not opening in preview when clicking filepath links from other editor tabs

## [1.0.2] - 2024-12-10

### Fixed

- Fixed extension icon not displaying on Marketplace by adding `icon` field to package.json

## [1.0.1] - 2024-12-09

### Fixed

- Fixed missing `styles.css` in build output by adding copy step to build scripts

### Added

- Extension icon for VS Code marketplace visibility

## [1.0.0] - 2024-12-09

### Added

- Initial release
- Markdown preview using Lexical editor in readonly mode
- Support for headings, bold, italic, links, code blocks, tables, lists, blockquotes
- Syntax highlighting for code blocks
- Custom editor provider for `.md` files
- Keyboard shortcut: `Ctrl+Shift+L` / `Cmd+Shift+L`
- Auto-preview setting
- Editor title bar preview button
