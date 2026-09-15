# Backlog bắt buộc theo sprint

Tài liệu này là baseline bắt buộc để hoàn thành Student Information System theo
kiến trúc hiện tại. Các task phát sinh được quản lý riêng trong board; không
được xoá hoặc thay thế các task trong tài liệu này.

## Nguyên tắc thực hiện

- Mỗi task được thực hiện trên nhánh `feature/<service>` và tạo PR vào `dev`.
- Mỗi endpoint mới hoặc được thay đổi phải có structured request log theo
  [API Logging Standard](../architecture/logging.md).
- Mỗi service phải có kiểm thử phù hợp, tài liệu API được cập nhật, và không
  đưa secret vào repository.
- Chỉ đóng task khi thỏa điều kiện nghiệm thu của sprint tương ứng.

## Sprint 1 — Thiết kế nền tảng

Mục tiêu: chốt trải nghiệm người dùng, mô hình dữ liệu và hợp đồng giữa các
service trước khi viết chức năng chính.

- [ ] **SCRUM-7** — Thiết kế UI trang Hệ thống sinh viên (`student-web`): luồng
  đăng nhập, hồ sơ, môn học, kết quả, đăng ký học phần và trạng thái trống/lỗi.
- [ ] **SCRUM-8** — Thiết kế UI trang Mlearning (`mlearning-web`): danh sách
  nội dung, chi tiết bài học, tiến độ học và trạng thái trống/lỗi.
- [ ] **SCRUM-9** — Thiết kế database cho `enrollment-service`: ERD, khoá,
  ràng buộc sức chứa, trạng thái đăng ký và quy tắc chống đăng ký trùng.
- [ ] **SCRUM-10** — Thiết kế database cho `academic-service`: ERD cho môn
  học, lớp học phần, kỳ học, chương trình học, điểm và điều kiện tiên quyết.
- [ ] **SCRUM-12** — Thiết kế database cho `auth-service`: tài khoản, thông
  tin xác thực, refresh token/session, vai trò và lịch sử đăng nhập an toàn.
- [ ] **SCRUM-13** — Thiết kế database cho `user-service`: hồ sơ sinh viên,
  giảng viên, quản trị viên và liên kết với tài khoản xác thực.
- [ ] Xác định role/permission matrix cho Student, Lecturer và Admin.
- [ ] Chốt các shared contracts: định dạng lỗi, phân trang, request/response
  envelope, event names và quy ước version API trong `packages/contracts`.
- [ ] Lưu ERD và quyết định kiến trúc vào `docs/database` và `docs/architecture`.

Điều kiện nghiệm thu: UI design được phê duyệt; ERD và contracts được review;
không còn quan hệ dữ liệu hoặc quyền truy cập chưa được quyết định.

## Sprint 2 — Identity, user và nền tảng API

Mục tiêu: người dùng có thể xác thực và các service có nền tảng triển khai,
kiểm thử và giao tiếp nhất quán.

- [ ] Khởi tạo `auth-service`, migration database, seed role và API đăng nhập,
  refresh token, đăng xuất, đổi/reset mật khẩu.
- [ ] Khởi tạo `user-service`, migration database và API quản lý hồ sơ người
  dùng theo quyền truy cập.
- [ ] Khởi tạo `api-gateway`: route, xác thực token, uỷ quyền cơ bản, rate
  limit và chuyển tiếp `requestId` đến downstream services.
- [ ] Triển khai shared contracts cho auth, user và lỗi chuẩn.
- [ ] Thêm validation, xử lý lỗi chuẩn, health check và structured logging cho
  mọi endpoint của `auth-service`, `user-service` và gateway.
- [ ] Viết unit/integration tests cho đăng nhập, phân quyền và truy cập hồ sơ.
- [ ] Cập nhật tài liệu API cho các endpoint hoàn thành.

Điều kiện nghiệm thu: người dùng đăng nhập được; gateway chặn request không hợp
lệ; mỗi role chỉ truy cập dữ liệu được cấp quyền; các test bắt buộc đều pass.

## Sprint 3 — Academic và enrollment

Mục tiêu: hoàn thành luồng quản lý học vụ và đăng ký học phần cốt lõi.

- [ ] Khởi tạo `academic-service`, migration và API cho kỳ học, môn học, lớp
  học phần, lịch học, điều kiện tiên quyết và điểm.
- [ ] Khởi tạo `enrollment-service`, migration và API mở/đóng đăng ký, đăng
  ký, huỷ đăng ký, danh sách đăng ký và kiểm tra sức chứa.
- [ ] Tích hợp authorization qua gateway cho các nghiệp vụ học vụ và đăng ký.
- [ ] Áp dụng contracts chung cho academic và enrollment.
- [ ] Kiểm thử các quy tắc: quyền truy cập, đăng ký trùng, đầy lớp, sai kỳ học
  và không thỏa điều kiện tiên quyết.
- [ ] Thêm structured logging, metrics cơ bản và tài liệu API cho mọi endpoint.

Điều kiện nghiệm thu: Admin quản lý được dữ liệu học vụ; Student đăng ký/huỷ
đăng ký được theo quy tắc; dữ liệu không bị trùng hoặc vượt sức chứa.

## Sprint 4 — Student web và admin web

Mục tiêu: đưa các luồng nghiệp vụ cốt lõi đến người dùng qua giao diện web.

- [ ] Khởi tạo `student-web` theo UI đã phê duyệt; tích hợp login, hồ sơ, danh
  sách môn/lớp, kết quả và đăng ký học phần.
- [ ] Khởi tạo `admin-web`; tích hợp quản lý người dùng, môn học, lớp học phần,
  kỳ học và theo dõi đăng ký.
- [ ] Thêm route guard theo role, validation form, loading/empty/error states
  và xử lý phiên hết hạn.
- [ ] Viết component/integration tests cho các luồng quan trọng của hai app.
- [ ] Kiểm thử end-to-end: đăng nhập, quản trị lớp học phần và đăng ký học phần.

Điều kiện nghiệm thu: toàn bộ luồng cốt lõi chạy được qua UI, không chỉ qua API;
UI đáp ứng thiết kế Sprint 1 và hoạt động trên màn hình desktop/mobile mục tiêu.

## Sprint 5 — Mlearning và AI

Mục tiêu: phát hành luồng học vi mô và tích hợp AI có kiểm soát.

- [ ] Khởi tạo `mlearning-web` theo UI đã phê duyệt; triển khai danh sách nội
  dung, xem bài học và theo dõi tiến độ.
- [ ] Xác định và triển khai API/data model cho nội dung học và tiến độ học.
- [ ] Khởi tạo `ai-service` với interface rõ ràng cho use case đã phê duyệt
  (ví dụ: gợi ý nội dung hoặc trợ lý học tập).
- [ ] Áp dụng xác thực, phân quyền, rate limit, validation input và logging an
  toàn cho AI endpoints; không ghi prompt chứa dữ liệu nhạy cảm mặc định.
- [ ] Hiển thị lỗi, timeout và trạng thái fallback của AI rõ ràng trên UI.
- [ ] Viết tests cho use case AI, kiểm tra authorization và luồng progress.

Điều kiện nghiệm thu: Student học được nội dung, lưu được tiến độ và dùng được
use case AI đã chốt mà không lộ dữ liệu nhạy cảm.

## Sprint 6 — Tích hợp, vận hành và phát hành

Mục tiêu: hệ thống chạy được nhất quán, có thể quan sát và sẵn sàng phát hành.

- [ ] Hoàn thiện `deploy/docker-compose.yml` để chạy gateway, services, apps,
  database và dependency cần thiết ở môi trường local.
- [ ] Hoàn thiện `.env.example`, tách cấu hình theo môi trường và quản lý secret
  bằng cơ chế triển khai, không commit secret.
- [ ] Tạo GitHub Actions: lint, test, build và kiểm tra contracts trên mọi PR.
- [ ] Thiết lập thu thập JSON logs tập trung; dashboard/truy vấn theo `service`,
  `requestId`, `traceId` và `level`.
- [ ] Tạo audit-log stream riêng, chính sách retention và quyền truy cập hạn chế.
- [ ] Hoàn thiện tài liệu architecture, API, database, local setup và runbook
  xử lý sự cố cơ bản.
- [ ] Chạy end-to-end regression, security review cơ bản, backup/restore thử
  nghiệm và kiểm tra hiệu năng cho các endpoint quan trọng.
- [ ] Tạo release PR từ `dev` sang `main` chỉ khi mọi check bắt buộc pass.

Điều kiện nghiệm thu: một môi trường mới có thể chạy hệ thống từ tài liệu; CI
chặn thay đổi lỗi; logs có thể truy vết cross-service; release được thực hiện
qua PR từ `dev` sang `main`.

## Task phát sinh

Các task phát sinh (bug, thay đổi yêu cầu, cải tiến UX hoặc tối ưu hiệu năng)
được thêm vào board riêng. Chúng phải ghi rõ sprint, service bị ảnh hưởng, mức
ưu tiên và tiêu chí nghiệm thu; không thay thế task bắt buộc trong tài liệu này.
