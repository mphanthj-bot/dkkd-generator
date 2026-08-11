# TÀI LIỆU ĐẶC TẢ KỸ THUẬT: HỆ THỐNG TỰ ĐỘNG TẠO DẤU ĐIỆN TỬ VÀ AUTO-FILL GIẤY CHỨNG NHẬN ĐKKD HỘ KINH DOANH

## 1. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)
Hệ thống có nhiệm vụ tự động hóa quy trình quản lý hành chính, bao gồm:
* **Phân hệ 1 (Data Processing):** Nhận diện địa giới hành chính, tự động tra cứu (Mapping) thông tin cán bộ ký, mẫu chữ ký và con dấu đỏ.
* **Phân hệ 2 (Template Engine):** Tự động điền dữ liệu (Auto-fill) vào phôi Giấy chứng nhận Đăng ký hộ kinh doanh chuẩn năm 2026.
* **Phân hệ 3 (Graphic & Stamping Engine):** Tự động khởi tạo hình ảnh con dấu doanh nghiệp/hành chính kỹ thuật số (màu đỏ, nền trong suốt, hiệu ứng dấu mộc thật) và đóng tự động vào file văn bản (`.docx`, `.pdf`) tại vị trí quy chuẩn.

---

## 2. KIẾN TRÚC CÔNG NGHỆ ĐỀ XUẤT (TECHNOLOGY STACK)
* **Ngôn ngữ lập trình chính:** Python 3.10+ hoặc Node.js (Ưu tiên Python cho xử lý tài liệu và đồ họa).
* **Cơ sở dữ liệu (Database):** PostgreSQL hoặc MySQL (Hỗ trợ cấu trúc lưu trữ địa giới hành chính).
* **Thư viện xử lý đồ họa (Stamp Engine):** `Pillow (PIL)` kết hợp `Numpy` (Xử lý hiệu ứng và chữ cong).
* **Thư viện xử lý tài liệu văn bản:** `python-docx` (Xử lý file Word) và `PyMuPDF (fitz)` (Xử lý file PDF).

---

## 3. ĐẶC TẢ CHI TIẾT CÁC PHÂN HỆ CHỨC NĂNG

### PHÂN HỆ 1: QUẢN LÝ ĐỊA GIỚI VÀ TỰ ĐỘNG MAPPING NGƯỜI KÝ (SIGNATORY MAPPING API)

#### 3.1. Tích hợp dữ liệu địa giới hành chính
* Sử dụng API chuẩn hóa danh mục Hành chính Việt Nam (Mã Tỉnh ➔ Quận ➔ Xã) để khống chế dữ liệu đầu vào thông qua Dropdown. Triệt tiêu lỗi nhập sai chính tả.
* Mỗi Xã/Phường/Thị trấn được định danh bằng một `Mã định danh địa giới` duy nhất (Ví dụ mã ID của Phường Tân Thuận).

#### 3.2. Cấu trúc Cơ sở dữ liệu danh mục nội bộ (Master Data Schema)
Thiết lập bảng dữ liệu hệ thống `system_signatories` để tự động ánh xạ thông tin khi nhận đầu vào từ mã địa giới:

| Tên trường (Field) | Kiểu dữ liệu | Mô tả | Ví dụ mẫu dữ liệu năm 2026 |
| :--- | :--- | :--- | :--- |
| `location_id` | VARCHAR (Key) | Mã định danh địa giới hành chính | `VN_79_718_2628` |
| `authority_l1` | VARCHAR | Tên Cơ quan ban hành cấp 1 | `UBND PHƯỜNG TÂN THUẬN` |
| `authority_l2` | VARCHAR | Tên Cơ quan ban hành cấp 2 | `PHÒNG KINH TẾ, HẠ TẦNG VÀ ĐÔ THỊ` |
| `signatory_title`| VARCHAR | Chức danh cán bộ ký duyệt | `TRƯỞNG PHÒNG` |
| `signatory_name` | VARCHAR | Họ và tên cán bộ | `NGUYỄN VĂN A` |
| `signature_url` | VARCHAR | Đường dẫn lưu file ảnh chữ ký tươi | `/storage/signatures/sig_nva_2026.png` |
| `stamp_url` | VARCHAR | Đường dẫn lưu file ảnh dấu đỏ gốc | `/storage/stamps/stamp_tan_thuan.png` |

---

### PHÂN HỆ 2: PHÔI TÀI LIỆU VÀ AUTO-FILL DỮ LIỆU ĐKKD CHUẨN 2026

#### 4.1. Cấu trúc dữ liệu đầu vào chuẩn hóa (JSON Input)
Dữ liệu được chuẩn hóa theo quy định mới của **Nghị định 168/2025/NĐ-CP** (hiệu lực từ 01/07/2025, áp dụng thực tế năm 2026), phân cấp thẩm quyền về cho cấp Xã/Phường:

```json
{
  "registration_details": {
    "business_household_code": "033177011448",
    "registration_type": "Đăng ký lần đầu",
    "registration_date": "2026-06-12",
    "registration_day": "12",
    "registration_month": "06",
    "registration_year": "2026"
  },
  "business_household_info": {
    "business_name_vi": "Hộ kinh doanh Nguyễn Thị Phượng HN",
    "headquarters_address": "Số 32 ngõ 120 Trần Duy Hưng, Phường Yên Hòa, TP Hà Nội",
    "contact": {"phone": "090xxxxxxx", "fax": "", "email": "", "website": ""}
  },
  "business_sectors": [
    {"stt": 1, "sector_name": "Bán buôn vải, hàng may sẵn, giày dép (Cơ sở phải đảm bảo các điều kiện theo quy định pháp luật trong hoạt động kinh doanh)", "sector_code": "4641", "is_primary": true}
  ],
  "financial_info": {
    "capital_amount_number": "50000000",
    "capital_amount_words": "Năm mươi triệu"
  },
  "owner_profile": {
    "full_name": "NGUYỄN THỊ PHƯỢNG",
    "gender": "Nữ",
    "date_of_birth": "1977-08-04",
    "ethnicity": "Kinh",
    "nationality": "Việt Nam",
    "personal_identification_number": "033177011448",
    "permanent_residence": "Thôn Đức Thành, Xã Vị Xuyên, Hà Giang",
    "current_residence": "Số 32 ngõ 120 Trần Duy Hưng, Phường Yên Hòa, TP Hà Nội"
  }
}
```

#### 4.2. Cơ chế trộn dữ liệu vào phôi văn bản (Template Engine)
* **Token định vị trong file mẫu:** Hệ thống dùng các thẻ Neo (Anchor Token) đặt sẵn trong file Word mẫu như: `{{MA_SO_HO_KINH_DOANH}}`, `{{TEN_HO_KINH_DOANH}}`, `{{CHUKY_TRUONG_PHONG}}`.
* **Logic xử lý:** Code quét cấu trúc cây XML của văn bản gốc, thay thế các Token bằng giá trị thực tế lấy từ chuỗi JSON đầu vào và kết quả Mapping của Phân hệ 1.

---

### PHÂN HỆ 3: XỬ LÝ ĐỒ HỌA TẠO DẤU VÀ ĐÓNG DẤU TỰ ĐỘNG

#### 5.1. Thuật toán sinh ảnh con dấu doanh nghiệp/hành chính thực tế
* **Thông số ảnh đầu ra:** Định dạng `.png`, hệ màu RGBA (Bắt buộc kênh Alpha nền trong suốt), kích thước chuẩn 500x500 pixels (Tương đương kích thước thực tế đường kính 36mm - 42mm ở độ phân giải 300 DPI).
* **Mã màu mực chuẩn:** Sử dụng dải màu đỏ sậm sáp thực tế: `#C8102E` hoặc `#D32F2F`.
* **Thuật toán chữ cong (Text-on-Path):** Sử dụng hệ tọa độ cực (Polar Coordinates) để tính góc xoay từng ký tự. Chữ chạy vòng nửa trên là TÊN DOANH NGHIỆP/CƠ QUAN (In hoa, font Arial Bold hoặc Roboto Bold). Chữ chạy vòng nửa dưới là MÃ SỐ THUẾ + ĐỊA BÀN HÀNH CHÍNH.
* **Bộ lọc xử lý "Dấu thật" (Real-ink Filters):**
    * *White Noise (Nhiễu hạt):* Tạo đốm khuyết mực ngẫu nhiên trên nét chữ mô phỏng lực đóng dấu tay không đều.
    * *GaussianBlur (Mờ nhòe cạnh):* Đặt bán kính mờ từ `0.5 - 0.8` pixel để mực tiệp vào thớ giấy, tránh độ sắc nét tuyệt đối của ảnh vector.

#### 5.2. Logic nhúng tự động vào văn bản
* **Đối với file Word (`.docx`):** Tìm Token `{{CHUKY_TRUONG_PHONG}}`. Xóa chuỗi văn bản. Chèn đè file ảnh chữ ký lên trước, sau đó chèn file ảnh con dấu đỏ đè lên trên. Thiết lập Layout thuộc tính XML là `In Front of Text` (Đè lên văn bản).
* **Đối với file PDF (`.pdf`):** Code tự động tìm kiếm chuỗi text `"Người đại diện theo pháp luật"` hoặc `"TRƯỞNG PHÒNG"` để lấy tọa độ `Rect(X,Y)`. Tính toán dịch chuyển sang phải `50mm` để thả con dấu đỏ đè lên **1/3 chữ ký** về phía bên trái theo đúng quy chuẩn văn thư thực tế của Việt Nam.

---

## 4. TIÊU CHUẨN AN TOÀN VÀ BẢO MẬT (SECURITY CRITERIA)
* **Xử lý bộ nhớ đệm (In-Memory Processing):** Toàn bộ file ảnh chữ ký và con dấu đỏ chỉ được xử lý dưới dạng dòng dữ liệu nhị phân (`BytesIO Stream` / RAM) trong quá trình chèn. Tuyệt đối **không ghi tạm thời hoặc lưu trữ** thành file vật lý trên ổ cứng server nhằm triệt tiêu nguy cơ lộ lọt dữ liệu dấu gốc.
* **Nhật ký kiểm toán (Audit Trail):** Hệ thống ghi nhận Log chi tiết theo cấu trúc: `[Thời gian] - [User_ID thực hiện] - [Mã hồ sơ] - [Địa giới hành chính phục vụ]` để phục vụ công tác hậu kiểm tra bảo mật.