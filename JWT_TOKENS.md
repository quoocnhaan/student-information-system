# Danh sách JWT Token cố định (Fixed JWT Tokens)

Tài liệu này lưu trữ các chuỗi JWT Token cố định dùng cho việc phát triển, kiểm thử (Postman, cURL, PowerShell) và trải nghiệm trên giao diện **Swagger UI** của **Academic Service** và **Activity Service**.

---

## 1. Thông tin cấu hình Secret Key chung
- **Thuật toán ký:** `HS512` (HMAC-SHA512)
- **Secret Key:** `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970`
- **Thời hạn hiệu lực:** 10 năm (đến năm 2036+)

---

## 2. Danh sách Token theo Role

### 2.1 Role ADMIN (Quản trị viên)
- **Username / Subject:** `admin`
- **Role:** `ROLE_ADMIN`
- **Quyền hạn:** Toàn quyền quản lý hệ thống, các danh mục khoa, ngành, môn học, lớp học, học kỳ, lịch thi, cấu hình điểm.
- **JWT Token:**
```text
eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwicm9sZXMiOlsiUk9MRV9BRE1JTiJdLCJpYXQiOjE3OTA2NzQ1NTIsImV4cCI6MjEwNjAzNDU1Mn0.4d95Rhj9mIzenP1ME7T9uMABuv1uoLLDH7MOc4nuNq-gkMF7DOf9My7Hq57Kp9N3gUx9zoxBMtbPckv456UisA
```

---

### 2.2 Role LECTURER (Giảng viên)
- **Username / Subject:** `lecturer_01`
- **Role:** `ROLE_LECTURER`
- **Quyền hạn:** Nhập/sửa điểm (`student-scores`), tạo chương mục học (`sections`), hoạt động (`activities`), tài liệu (`files`), bài tập (`assignments`), chấm bài tập (`assignment-student-approves`), tạo bài trắc nghiệm (`quizzes`), ngân hàng câu hỏi (`questions`, `question-options`).
- **JWT Token:**
```text
eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJsZWN0dXJlcl8wMSIsInJvbGUiOiJST0xFX0xFQ1RVUkVSIiwicm9sZXMiOlsiUk9MRV9MRUNUVVJFUiJdLCJpYXQiOjE3OTA2NzQ1NTMsImV4cCI6MjEwNjAzNDU1M30.dMm39TRGrE9RuZu5O3tMc7r2ukXrTKChe4lZmVUqdCthFe0i2HeeN5OYc0piZnFQISIK_2pq844BZxrh2O5C9Q
```

---

### 2.3 Role STUDENT (Sinh viên)
- **Username / Subject:** `student_01`
- **Role:** `ROLE_STUDENT`
- **Quyền hạn:** Tra cứu thông tin học phần, điểm số, lịch thi, bài giảng; thực hiện đăng ký học phần (`student-enrollments`); nộp bài tập (`assignment-student-approves`); bắt đầu làm bài trắc nghiệm (`attempts`) và gửi câu trả lời (`student-answers`).
- **JWT Token:**
```text
eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzdHVkZW50XzAxIiwicm9sZSI6IlJPTEVfU1RVREVOVCIsInJvbGVzIjpbIlJPTEVfU1RVREVOVCJdLCJpYXQiOjE3OTA2NzQ1NTMsImV4cCI6MjEwNjAzNDU1M30.QmmEA9Fr6-sLzeUBFoKeroVA19SrkYwFjTXYfw8MRFAaHXTewZbhKOnwCOdOOmiVWsvlunIE972M8mylvgriRg
```

---

## 3. Cách sử dụng

### 3.1 Trên Swagger UI
1. Truy cập Swagger UI của service:
   - Academic Service: `http://localhost:8080/swagger-ui/index.html` (hoặc port đang chạy)
   - Activity Service: `http://localhost:8081/swagger-ui/index.html` (hoặc port đang chạy)
2. Nhấn vào nút xanh **Authorize** (ở góc phải trên cùng).
3. Dán chuỗi Token tương ứng với Role bạn muốn test vào ô **Value** (không cần nhập tiền tố `Bearer `, Swagger sẽ tự thêm).
4. Nhấn **Authorize** rồi nhấn **Close**. Mọi request test từ giao diện Swagger sẽ tự động được đính kèm token.

### 3.2 Lấy Token nhanh qua API (Dev Helper Endpoint)
Cả 2 service đều cung cấp sẵn endpoint công khai để lấy nhanh các token này:
```http
GET /api/auth/tokens
```

### 3.3 Gửi Request qua cURL hoặc Postman
Thêm header HTTP:
```http
Authorization: Bearer <TOKEN>
```
Ví dụ với curl:
```bash
curl -X GET "http://localhost:8080/api/classes" \
  -H "Authorization: Bearer eyJhbGciOiJIUzUxMiJ9..."
```
