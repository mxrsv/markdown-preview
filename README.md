# Markdown Preview Lexical (Kyan)

Preview Markdown files using the Lexical editor framework in readonly mode.

## Features

- **Lexical-powered rendering** - Uses Facebook's Lexical editor for high-quality markdown display
- **Readonly mode** - Clean, distraction-free preview without editing capabilities
- **Syntax highlighting** - Code blocks with proper syntax highlighting
- **Full markdown support** - Headings, lists, tables, links, images, blockquotes, and more
- **Custom editor integration** - Opens as a custom editor tab in VS Code

## Usage

### Open Preview

1. Open any `.md` file
2. Use one of these methods:
   - Press `Ctrl+Shift+L` (Windows/Linux) or `Cmd+Shift+L` (Mac)
   - Click the preview icon in the editor title bar
   - Run command: `Open Markdown Preview Lexical (Kyan)`

### Set as Default Editor for Markdown Files

To always open `.md` files with this extension:

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Search for `View: Reopen Editor With...`
3. Select `Configure default editor for '*.md'`
4. Choose `Markdown Preview Lexical (Kyan)`

Now all `.md` files will open with this preview by default.

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `markdownLexicalPreview.autoPreview` | `true` | Automatically open preview when opening a Markdown file |

## Requirements

- VS Code 1.85.0 or higher

## Extension Commands

| Command | Description |
|---------|-------------|
| `markdown-lexical-preview.openPreview` | Open Markdown Preview Lexical (Kyan) |

## Keyboard Shortcuts

| Shortcut | Platform | Description |
|----------|----------|-------------|
| `Ctrl+Shift+L` | Windows/Linux | Open preview |
| `Cmd+Shift+L` | macOS | Open preview |

## Known Issues

None at this time.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## License

[MIT](LICENSE)
