# Hệ thống Quản lý Điểm danh IoT bằng Vân tay (Frontend)

Giao diện Web React hoàn chỉnh phục vụ giảng viên và quản trị viên quản lý toàn bộ hệ thống điểm danh IoT: buổi học, môn học, lớp học, thiết bị máy quét ESP32 và dữ liệu sinh trắc học vân tay.

## Chạy hệ thống

1. **Khởi động Backend (NestJS)**:
   ```bash
   cd IoT-Fingerprint-Attendance
   npm run start:dev
   ```
   Backend chạy tại `http://localhost:3000`.

2. **Khởi động Frontend (React + Vite)**:
   ```bash
   cd frontend
   npm run dev
   ```
   Mở trình duyệt tại `http://localhost:5173`.

## Các phân hệ chức năng (Khớp theo Postman Collection)

1. **Điểm danh (Attendance)**:
   - Theo dõi sĩ số, danh sách có mặt, đi muộn, vắng, chưa điểm danh.
   - Chấm điểm danh thủ công, xóa bản ghi, xuất file CSV kết quả điểm danh.
   - API: `GET /attendance/teacher`, `POST /attendance/create`, `PATCH /attendance/:id`, `DELETE /attendance/:id`.

2. **Buổi học & Ca học (Sessions)**:
   - Lên lịch ca học mới với lớp học phần, phòng học, khung giờ học và khung giờ mở/đóng nhận vân tay của máy ESP32.
   - Mở ca học ngay, đóng ca học, hủy ca hoặc xóa ca học.
   - Chuyển hướng nhanh sang trang điểm danh theo ca học.
   - API: `GET /sessions/all`, `POST /sessions/create`, `PATCH /sessions/:id`, `DELETE /sessions/:id`.

3. **Lớp học & Sinh viên (Classes & Students)**:
   - Quản lý danh sách lớp niên chế: tạo lớp, xóa lớp.
   - Xem danh sách sinh viên theo từng lớp hoặc toàn trường.
   - Nhập danh sách sinh viên hàng loạt từ file Excel (`.xlsx`).
   - Thêm sinh viên thủ công.
   - API: `GET /classes/all`, `POST /classes/create`, `DELETE /classes/:id`, `GET /users/all/student`, `POST /users/:classId/import`, `POST /users/create`.

4. **Môn & Học phần (Courses & Sections)**:
   - Quản lý danh mục môn học đào tạo.
   - Quản lý các lớp học phần giảng viên phụ trách.
   - Ghi danh nhanh toàn bộ lớp niên chế vào học phần (`enrollments/create-by-class`).
   - Quản lý danh sách sinh viên ghi danh theo từng học phần, hủy ghi danh sinh viên.
   - API: `GET /courses/all`, `POST /courses/create`, `GET /sections/all`, `POST /sections/create`, `DELETE /sections/:id`, `POST /enrollments/create-by-class`, `GET /enrollments/all`, `DELETE /enrollments/:id`.

5. **Thiết bị & Phòng học (Devices & Rooms)**:
   - Quản lý danh sách phòng học, cơ sở và tòa nhà.
   - Quản lý các máy quét vân tay ESP32: mã thiết bị, tên máy, phòng gắn máy, mật khẩu xác thực (`authSecret`), thời gian hoạt động online gần nhất (`lastSeenAt`).
   - Bật/tắt trạng thái máy (Active / Inactive), sửa thông tin máy, xóa máy.
   - API: `GET /rooms/all`, `POST /rooms/create`, `DELETE /rooms/:id`, `GET /devices/all`, `POST /devices/create`, `PATCH /devices/:id`, `DELETE /devices/:id`.

6. **Quản lý & Đăng ký Vân tay (Fingerprints & Registration)**:
   - Ra lệnh cho máy quét ESP32 lấy mẫu vân tay mới cho sinh viên theo từng vị trí ngón tay (ngón trỏ, ngón cái,...).
   - Theo dõi danh sách các lệnh chờ máy quét tiếp nhận, hủy lệnh.
   - Quản lý kho mẫu vân tay đã lưu trong cơ sở dữ liệu, xóa mẫu vân tay khi cần quét lại.
   - API: `POST /fingerprint-registrations/create`, `GET /fingerprint-registrations/all`, `DELETE /fingerprint-registrations/:id`, `GET /fingerprints/all`, `DELETE /fingerprints/:id`.

7. **Tài khoản người dùng**:
   - Đổi mật khẩu cá nhân: `PATCH /users/updatePassword`.
   - Đăng xuất an toàn: `POST /auth/signout`.
