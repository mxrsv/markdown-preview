# Plan: Chuẩn bị Deploy Extension lên VS Code Marketplace

### Objective

Chuẩn bị đầy đủ các file và metadata cần thiết để publish extension "Markdown Preview Lexical" lên VS Code Marketplace.

---

### Current Status

**Extension info:**
- Name: `markdown-preview-lexical`
- Version: `0.0.1`
- Publisher: `kyantran`
- Category: `Other`

**Đã có:**
- [package.json](package.json) - Cấu hình cơ bản
- [webpack.config.js](webpack.config.js) - Dual build config
- [.vscodeignore](.vscodeignore) - Loại bỏ dev files
- Source code hoạt động
- Build output trong `out/`

**Thiếu:**
- README.md
- CHANGELOG.md
- LICENSE
- Icon file (icon.png)
- Metadata bổ sung trong package.json

---

### Steps

**Step 1: Tạo README.md**
- Mô tả extension
- Features list
- Hướng dẫn cài đặt
- Hướng dẫn sử dụng
- Screenshots placeholder
- Requirements

**Step 2: Tạo LICENSE**
- Chọn license phù hợp (MIT recommended)
- Tạo file LICENSE tại root

**Step 3: Tạo CHANGELOG.md**
- Format theo Keep a Changelog
- Entry cho version 1.0.0

**Step 4: Cập nhật package.json**
- Nâng version: `0.0.1` → `1.0.0`
- Thêm `repository` URL
- Thêm `keywords` array
- Thêm `bugs` URL
- Thêm `homepage` URL
- Thêm `icon` field (path to icon.png)
- Thêm `galleryBanner` (optional)
- Cập nhật `categories` phù hợp hơn

**Step 5: Tạo Icon**
- Tạo icon.png (128x128 minimum, 256x256 recommended)
- Đặt tại root folder
- Icon nên đơn giản, dễ nhận diện

**Step 6: Tạo Screenshots (optional nhưng recommended)**
- Capture extension đang hoạt động
- Đặt trong folder `images/` hoặc `screenshots/`
- Reference trong README.md

**Step 7: Test Package**
- Run `npm run vscode:prepublish`
- Run `npm run package`
- Verify VSIX file được tạo
- Test cài đặt local VSIX

**Step 8: Setup Publisher Account**
- Tạo Azure DevOps account (nếu chưa có)
- Tạo Personal Access Token (PAT)
- Đăng ký publisher ID trên marketplace

---

### Files Summary

**Cần tạo mới:**
- [README.md](README.md)
- [CHANGELOG.md](CHANGELOG.md)
- [LICENSE](LICENSE)
- [icon.png](icon.png)
- [images/](images/) (folder screenshots)

**Cần cập nhật:**
- [package.json](package.json)

---

### package.json Changes

```json
{
  "version": "1.0.0",
  "icon": "icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/kyantran/markdown-preview-lexical"
  },
  "bugs": {
    "url": "https://github.com/kyantran/markdown-preview-lexical/issues"
  },
  "homepage": "https://github.com/kyantran/markdown-preview-lexical#readme",
  "keywords": [
    "markdown",
    "preview",
    "lexical",
    "editor",
    "readonly"
  ],
  "categories": [
    "Visualization",
    "Other"
  ],
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  }
}
```

---

### Publishing Commands

```bash
# 1. Install vsce globally
npm install -g @vscode/vsce

# 2. Build production
npm run vscode:prepublish

# 3. Package VSIX locally
npm run package

# 4. Test VSIX
# Extensions -> ... -> Install from VSIX

# 5. Login với PAT
vsce login kyantran

# 6. Publish
vsce publish
# hoặc với version bump
vsce publish patch  # 1.0.0 -> 1.0.1
vsce publish minor  # 1.0.0 -> 1.1.0
vsce publish major  # 1.0.0 -> 2.0.0
```

---

### Notes

- Publisher ID `kyantran` phải match với Azure DevOps publisher
- Personal Access Token cần scope: Marketplace (Manage)
- README.md là file hiển thị trên Marketplace page
- Icon sẽ hiển thị trong search results và extension page
- Screenshots giúp users hiểu extension trước khi cài

---

### To-dos

- [ ] Tạo README.md với mô tả và hướng dẫn sử dụng
- [ ] Tạo LICENSE file (MIT)
- [ ] Tạo CHANGELOG.md
- [ ] Cập nhật package.json với metadata đầy đủ
- [ ] Tạo icon.png cho extension
- [ ] Capture screenshots để showcase
- [ ] Test package locally với VSIX
- [ ] Setup Azure DevOps PAT nếu chưa có
- [ ] Publish lên Marketplace
