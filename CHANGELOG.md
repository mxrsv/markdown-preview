# Changelog

All notable changes to "Markdown Preview Lexical (Kyan)" will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
