# CONTRIBUTING.md

## Quy trình Contribute

Cảm ơn bạn đã quan tâm đến dự án này! Đây là hướng dẫn chi tiết để contribute.

### 1. Fork & Clone

```bash
# Fork repository từ GitHub

# Clone repo của bạn
git clone https://github.com/YOUR_USERNAME/dkkd-generator.git
cd dkkd-generator

# Thêm upstream remote
git remote add upstream https://github.com/mphanthj-bot/dkkd-generator.git
```

### 2. Tạo Branch

```bash
# Update từ upstream
git fetch upstream
git checkout upstream/master

# Tạo branch mới
git checkout -b feature/description-ngắn-gọn
```

**Naming Convention:**
- `feature/` - Tính năng mới
- `fix/` - Sửa lỗi
- `docs/` - Cập nhật tài liệu
- `refactor/` - Tái cấu trúc code
- `test/` - Thêm test

### 3. Commit Messages

Tuân theo [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` - Tính năng mới
- `fix:` - Sửa lỗi
- `docs:` - Tài liệu
- `style:` - Format code
- `refactor:` - Tái cấu trúc
- `test:` - Thêm/sửa test
- `chore:` - Config, build

**Ví dụ:**
```
feat(pdf-parser): Add support for multi-page PDF parsing

- Implement page iterator
- Add text extraction logic
- Update tests

Closes #123
```

### 4. Push & Pull Request

```bash
# Push branch
git push origin feature/description-ngắn-gọn

# Mở PR trên GitHub
```

**PR Template:**
```markdown
## Description
Mô tả ngắn gọn về thay đổi

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
Cách để test changes này

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated
```

### 5. Code Style

Tuân theo [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

```bash
# Format code
npm run lint:fix

# Check linting
npm run lint
```

### 6. Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

---

**Cảm ơn đã contribute! 🎉**
