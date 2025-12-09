# Kế hoạch: VSCode Extension Markdown Preview với Lexical

## Mục tiêu

Xây dựng extension VSCode cho phép xem trước Markdown trong panel bên cạnh editor, sử dụng Lexical để render nội dung Markdown (readonly) với hỗ trợ cú pháp cơ bản.

---

## Kiến trúc tổng quan

- **Extension entry** (`extension.ts`): Đăng ký custom preview provider
- **Webview provider** (`src/providers/PreviewProvider.ts`): Quản lý vòng đời preview panel
- **Markdown to Lexical** (`src/markdown/MarkdownParser.ts`): Parse Markdown → Lexical nodes
- **Webview content** (`src/webview/preview.html`, `src/webview/preview.ts`): Frontend với Lexical editor (readonly mode)
- **Build setup**: Webpack để bundle extension và webview

---

## Các bước thực hiện

### Phase 1: Khởi tạo project
1. Tạo `package.json` với:
   - Dependencies: `vscode`, `lexical`, `markdown-it`
   - DevDependencies: `typescript`, `webpack`, `webpack-cli`, `ts-loader`, `@types/node`, `@types/vscode`
2. Tạo `tsconfig.json` (target ES2020, module commonjs)
3. Tạo `.gitignore` (node_modules, out, dist)
4. Cấu trúc thư mục: `src/`, `src/webview/`, `src/providers/`, `src/markdown/`, `out/`

### Phase 2: Cấu hình VSCode Extension
1. Cấu hình `package.json`:
   - `activationEvents`: `["onLanguage:markdown"]` (kích hoạt khi mở file .md)
   - `contributes.commands`: Lệnh "markdown-lexical-preview.openPreview"
   - `contributes.keybindings`: Ctrl+Shift+L (hoặc Cmd+Shift+L trên Mac)
2. Tạo `extension.ts`:
   - Hàm `activate()`: Đăng ký command + preview provider
   - Hàm `deactivate()`

### Phase 3: Implement Markdown Parser
1. Tạo `src/markdown/MarkdownParser.ts`:
   - Dùng `markdown-it` để parse Markdown thành tokens
   - Convert tokens → Lexical `$createParagraphNode()`, `$createHeadingNode()`, v.v.
   - Hỗ trợ: headings, paragraphs, lists (ul/ol), code blocks, links, images, emphasis (bold, italic)

### Phase 4: Implement Preview Provider
1. Tạo `src/providers/PreviewProvider.ts`:
   - Extend `WebviewViewProvider`
   - Khi active editor thay đổi (file .md): cập nhật webview
   - Gửi Markdown content từ editor → webview
   - Handle file watcher để update real-time khi file thay đổi

### Phase 5: Frontend Webview
1. Tạo `src/webview/preview.html`:
   - Bootstrap Lexical editor (readonly mode: `editable={false}`)
   - Style cơ bản cho preview
   - Script import `preview.ts`
2. Tạo `src/webview/preview.ts`:
   - Nhận message từ extension (Markdown content)
   - Gọi MarkdownParser để convert
   - Mount Lexical editor với converted nodes
   - Gửi lại message nếu cần (ví dụ log)

### Phase 6: Build & Config
1. Tạo `webpack.config.js`:
   - Entry: `extension.ts`
   - Output: `out/extension.js`
   - Loaders: `ts-loader` cho `.ts` files
   - Target: `node` cho main extension
2. Tạo `webpack.webview.js` (nếu cần):
   - Bundle webview files riêng hoặc inline vào HTML
3. Cập nhật `package.json`:
   - Scripts: `"build": "webpack"`, `"watch": "webpack --watch"`
   - `main`: `"./out/extension.js"`

### Phase 7: Kiểm thử & packaging
1. Test trong VSCode (F5 launch extension)
2. Verify:
   - Markdown file mở → preview panel xuất hiện
   - Content cập nhật real-time
   - Các loại Markdown render đúng
3. Package extension (nếu cần): `vsce package`

---

## Tóm tắt file thay đổi

- [package.json](package.json) - Dependencies, scripts, config
- [tsconfig.json](tsconfig.json) - TypeScript config
- [webpack.config.js](webpack.config.js) - Build config
- [.gitignore](.gitignore) - Ignore rules
- [src/extension.ts](src/extension.ts) - Entry point
- [src/providers/PreviewProvider.ts](src/providers/PreviewProvider.ts) - Webview provider
- [src/markdown/MarkdownParser.ts](src/markdown/MarkdownParser.ts) - Markdown → Lexical converter
- [src/webview/preview.html](src/webview/preview.html) - Webview UI
- [src/webview/preview.ts](src/webview/preview.ts) - Webview logic

---

## Ghi chú kỹ thuật

1. **Markdown Parser**: Dùng `markdown-it` (phổ biến, dễ extend) thay vì thư viện phức tạp.
2. **Lexical readonly**: Set `editable={false}` để prevent editing, nhưng vẫn giữ full styling.
3. **Real-time update**: Hook `onDidChangeActiveTextEditor` + `onDidChangeTextDocument` để cập nhật preview.
4. **Performance**: Debounce markdown parsing nếu file quá lớn.
5. **Styling**: Dùng Tailwind CSS hoặc CSS thuần trong webview (sandbox).

---

## To-dos

- [ ] Khởi tạo package.json, tsconfig.json, webpack config
- [ ] Tạo extension.ts với activation event và command handler
- [ ] Implement MarkdownParser (markdown-it + Lexical nodes)
- [ ] Tạo PreviewProvider (WebviewViewProvider)
- [ ] Tạo webview HTML + TypeScript
- [ ] Build & test trong VSCode
- [ ] Thêm styling cho preview panel
