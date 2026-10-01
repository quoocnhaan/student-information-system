# Danh sách JWT Token cấu hình & Kiểm thử (JWT Tokens Configuration)

Tài liệu này lưu trữ thông tin cấu hình JWT, biến môi trường và các chuỗi JWT Token mẫu dùng cho việc phát triển, kiểm thử (Postman, cURL, PowerShell) và trải nghiệm trên giao diện **Swagger UI** của **Academic Service** và **Activity Service**.

---

## 1. Thông tin cấu hình Secret Key chung
- **Thuật toán ký:** `HS512` (HMAC-SHA512)
- **Biến môi trường:** `JWT_SECRET` (khai báo trong `.env` / `docker-compose.yml`)
- **Secret Key phát triển (dev):** `c8f1e2d3b4a5968778695a4b3c2d1e0fa1b2c3d4e5f60718293a4b5c6d7e8f90` (tối thiểu 512 bits / 64 ký tự)
- **Thời hạn hiệu lực mặc định:** 4 giờ (`14400000` ms) qua biến môi trường `JWT_EXPIRATION` (thay vì 10 năm trước đây).
- **Lưu ý bảo mật:** Khi triển khai môi trường production, **bắt buộc** cung cấp `JWT_SECRET` ngẫu nhiên mạnh và không commit secret lên repository.

---

## 2. Dev Helper Endpoint (`/api/auth/tokens`)
- **Điều kiện kích hoạt:** Chỉ được kích hoạt khi profile `dev` hoạt động (`@Profile("dev")`).
- **Môi trường Production (`prod`):** Endpoint này sẽ tự động bị vô hiệu hóa (Spring không khởi tạo `AuthTokenHelperController`), ngăn chặn nguy cơ lộ token quản trị.
- **Cách lấy token nhanh trong môi trường dev:**
```http
GET /api/auth/tokens
```
Response JSON:
```json
{
  "adminToken": "...",
  "lecturerToken": "...",
  "studentToken": "..."
}
```

---

## 3. Danh sách Token mẫu (Môi trường Dev - Secret mặc định)

### 3.1 Role ADMIN (Quản trị viên)
- **Username / Subject:** `admin`
- **Role:** `ROLE_ADMIN`
- **Quyền hạn:** Toàn quyền quản lý hệ thống, các danh mục khoa, ngành, môn học, lớp học, học kỳ, lịch thi, cấu hình điểm.
- **JWT Token mẫu:**
```text
eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwicm9sZXMiOlsiUk9MRV9BRE1JTiJdLCJpYXQiOjE3OTA4MjA4NzMsImV4cCI6MTc5MDgzNTI3M30.8CZYueaEZc7I3Ov9CNJyZjhsP70csSQ1Czn4zXkn1A2ay7awN-p4lz8IxqNm3W08asR6GR7VMbHFGCRwlNt5AA
```

---

### 3.2 Role LECTURER (Giảng viên)
- **Username / Subject:** `lecturer_01`
- **Role:** `ROLE_LECTURER`
- **Quyền hạn:** Nhập/sửa điểm (`student-scores`), tạo chương mục học (`sections`), hoạt động (`activities`), tài liệu (`files`), bài tập (`assignments`), chấm bài tập (`assignment-student-approves`), tạo bài trắc nghiệm (`quizzes`), ngân hàng câu hỏi (`questions`, `question-options`).
- **JWT Token mẫu:**
```text
eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJsZWN0dXJlcl8wMSIsInJvbGUiOiJST0xFX0xFQ1RVUkVSIiwicm9sZXMiOlsiUk9MRV9MRUNUVVJFUiJdLCJpYXQiOjE3OTA4MjA4NzMsImV4cCI6MTc5MDgzNTI3M30.DCSj6nkrO6bRqbGFWfCtfnAXFkwPM__CT2Xsp0_7PrUgpRe1YSjlNckw9idPdfKhWmoCY-2hB89cGHC3Q9lNow
```

---

### 3.3 Role STUDENT (Sinh viên)
- **Username / Subject:** `student_01`
- **Role:** `ROLE_STUDENT`
- **Quyền hạn:** Tra cứu thông tin học phần, điểm số, lịch thi, bài giảng; thực hiện đăng ký học phần (`student-enrollments`); nộp bài tập (`assignment-student-approves`); bắt đầu làm bài trắc nghiệm (`attempts`) và gửi câu trả lời (`student-answers`).
- **JWT Token mẫu:**
```text
eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzdHVkZW50XzAxIiwicm9sZSI6IlJPTEVfU1RVREVOVCIsInJvbGVzIjpbIlJPTEVfU1RVREVOVCJdLCJpYXQiOjE3OTA4MjA4NzMsImV4cCI6MTc5MDgzNTI3M30.dF1BwE8QaAuNoEJFygSexDPsIJtZLFjdi0r827Fj9ROa8IRYHTunj3xBrM1PMdfHjivmhLNEGfXBOILvAuG-rQ
```

---

## 4. Cách sử dụng

### 4.1 Trên Swagger UI
1. Truy cập Swagger UI của service:
   - Academic Service: `http://localhost:8080/swagger-ui/index.html` (hoặc port đang chạy)
   - Activity Service: `http://localhost:8081/swagger-ui/index.html` (hoặc port đang chạy)
2. Nhấn vào nút xanh **Authorize** (ở góc phải trên cùng).
3. Dán chuỗi Token tương ứng với Role bạn muốn test vào ô **Value** (không cần nhập tiền tố `Bearer `, Swagger sẽ tự thêm).
4. Nhấn **Authorize** rồi nhấn **Close**. Mọi request test từ giao diện Swagger sẽ tự động được đính kèm token.

### 4.2 Gửi Request qua cURL hoặc Postman
Thêm header HTTP:
```http
Authorization: Bearer <TOKEN>
```
Ví dụ với curl:
```bash
curl -X GET "http://localhost:8080/api/classes" \
  -H "Authorization: Bearer eyJhbGciOiJIUzUxMiJ9..."
```
