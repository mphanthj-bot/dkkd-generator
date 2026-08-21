# DKKD Generator

Công cụ tạo các phiên bản DKKD từ PDF gốc với khả năng giữ nguyên layout và nội dung ban đầu.

## 📝 Giới thiệu

**DKKD Generator** là dự án nhằm giúp tạo ra các phiên bản chuẩn của DKKD (Danh Khóa Kiến Định hoặc tài liệu tương tự) từ PDF gốc. Dự án này cũng là một quá trình học tập để:

- Nắm vững công nghệ xử lý PDF
- Tạo PDF chuẩn, đơn giản nhất
- Bảo toàn layout và nội dung gốc
- Áp dụng các best practices trong phát triển phần mềm

## 🎯 Tính năng

- ✅ Đọc PDF gốc và phân tích cấu trúc
- ✅ Giữ nguyên layout và định dạng nội dung
- ✅ Tạo PDF output chuẩn chỉnh
- ✅ Hỗ trợ nhiều kiểu DKKD khác nhau
- 🚀 (Sắp tới) Xử lý hình ảnh, bảng, và biểu đồ

## 🛠️ Công nghệ sử dụng

- **JavaScript** - Ngôn ngữ chính
- **Node.js** - Runtime environment
- **PDF Libraries** - (chờ cập nhật chi tiết)
- **Git** - Version control

## 📦 Cài đặt

### Prerequisites
- Node.js >= 14.x
- npm hoặc yarn

### Các bước

```bash
# Clone repository
git clone https://github.com/mphanthj-bot/dkkd-generator.git
cd dkkd-generator

# Cài đặt dependencies
npm install

# Chạy thử nghiệm
npm run test

# Sử dụng
npm run generate
```

## 📖 Hướng dùng

### Cách sử dụng cơ bản

```bash
npm run generate --input=<đường_dẫn_PDF_gốc> --output=<đường_dẫn_kết_quả>
```

### Ví dụ

```bash
npm run generate --input=./samples/original.pdf --output=./output/dkkd.pdf
```

## 📂 Cấu trúc dự án

```
dkkd-generator/
├── src/
│   ├── index.js           # Entry point chính
│   ├── pdfParser.js       # Xử lý và phân tích PDF
│   ├── pdfGenerator.js    # Tạo PDF output
│   └── utils/             # Hàm tiện ích
├── samples/               # PDF mẫu để test
├── output/                # Folder chứa kết quả
├── tests/                 # Unit tests
├── .gitignore            # Git ignore file
├── package.json          # Dependencies
└��─ README.md             # Tài liệu này
```

## 🚀 Roadmap

- [ ] **v0.1** - Parse PDF cơ bản
- [ ] **v0.2** - Tạo PDF output giữ layout
- [ ] **v0.3** - Hỗ trợ hình ảnh và bảng
- [ ] **v0.4** - CLI đầy đủ và options
- [ ] **v1.0** - Release stable

## 📚 Tài liệu tham khảo

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [PDFKit Documentation](http://pdfkit.org/)
- [Node.js Best Practices](https://nodejs.org/en/docs/)

## 🤝 Đóng góp

Đây là dự án cá nhân học tập. Nếu bạn có ý kiến hoặc muốn contribute:

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -m 'Add: description'`)
4. Push to branch (`git push origin feature/improvement`)
5. Mở Pull Request

## 📄 License

MIT License - tự do sử dụng cho mục đích cá nhân và thương mại.

## 📧 Liên hệ

- **Author**: mphanthj-bot
- **GitHub**: [@mphanthj-bot](https://github.com/mphanthj-bot)
- **Issues**: [GitHub Issues](https://github.com/mphanthj-bot/dkkd-generator/issues)

---

**Last Updated**: 2026-08-21 | **Status**: 🔧 In Development
