# ShopeeFood Restaurant CRUD WebApp (`d:\moodle_hack\shopeefood-web`)

Ứng dụng web đặt đồ ăn lấy cảm hứng từ **ShopeeFood**, kết hợp đầy đủ giao diện đặt món hiện đại cho khách hàng và hệ thống quản trị **SSR CRUD** chuẩn bài tập **Day 03 - Block #5** (`Dish`, `Chef`, `Ingredient`).

## Tính năng nổi bật

1. **Giao diện Khách hàng (ShopeeFood Storefront - `/dishes`)**:
   - Tìm kiếm món ăn theo từ khóa (`GET /dishes?q=...`) và lọc theo danh mục (`?category=...`).
   - Xem chi tiết từng món ăn (`GET /dishes/:id`), tự động trả về `404` khi `id` không hợp lệ hoặc không tồn tại.
   - Giỏ hàng ShopeeFood tương tác: thêm món, tăng/giảm số lượng, áp mã voucher (`SHOPEE20`, `FREESHIP`, `KTPM3`) và đặt hàng qua HTML Form (`POST /orders` $\rightarrow$ `303 Redirect` sang trang theo dõi đơn hàng `/orders/:id`).
2. **Hệ thống Quản trị Nhà hàng (`/admin`)**:
   - Đầy đủ CRUD cho **Món ăn (`/admin/dishes`)**, **Đầu bếp (`/admin/chefs`)**, và **Nguyên liệu (`/admin/ingredients`)**.
   - Tuân thủ nghiêm ngặt chuẩn SSR: thêm bằng `POST`, sửa bằng `PATCH` (`?_method=PATCH`), xóa bằng `DELETE` (`?_method=DELETE`) sau trang xác nhận xóa, trả về `303 See Other` sau khi ghi, và trả về `400 Bad Request` (giữ nguyên dữ liệu đã nhập) khi dữ liệu không hợp lệ.
3. **Database linh hoạt (Dual-Driver)**:
   - Mặc định chạy ngay lập tức với **SQLite cục bộ** (`node:sqlite` tích hợp sẵn trong Node.js) và tự động seed dữ liệu mẫu.
   - Sẵn sàng chuyển sang **Supabase PostgreSQL** chỉ bằng cách đổi `DATABASE_URL` trong `.env`. Kèm sẵn file `prisma/schema.prisma` và script SQL `db/supabase-init.sql`.

## Cách chạy ứng dụng

```bash
# 1. Cài đặt dependencies
npm install

# 2. (Tùy chọn) Chạy lại seed dữ liệu mẫu
npm run seed

# 3. Khởi động server (mặc định tại http://localhost:3000)
npm start

# 4. Chạy bộ kiểm thử tự động (Automated Tests)
npm test
```
