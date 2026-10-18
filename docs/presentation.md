# Thuyết trình Block #5: ShopeeFood Restaurant CRUD WebApp

## 1. Mục tiêu & Kiến trúc tổng thể
Ứng dụng **ShopeeFood Kitchen Flagship** kết hợp:
- **Giao diện người dùng (Storefront style ShopeeFood)**: Tìm kiếm món ăn (`GET /dishes?q=...`), lọc theo danh mục (`?category=...`), xem chi tiết món ăn (`GET /dishes/:id`), giỏ hàng tương tác, áp mã giảm giá (`SHOPEE20`, `FREESHIP`, `KTPM3`) và đặt đơn hàng (`POST /orders` $\rightarrow$ `303 Redirect`).
- **Hệ thống Quản trị (Merchant Admin Portal)**: Thực hiện đầy đủ CRUD thuần **Server-Side Rendering (SSR)** cho 3 đối tượng **Món ăn (`Dish`)**, **Đầu bếp (`Chef`)**, và **Nguyên liệu (`Ingredient`)** theo đúng chuẩn HTTP (`GET`, `POST`, `PATCH`, `DELETE`) và mẫu **Post/Redirect/Get (PRG)**.

---

## 2. Thiết kế Cơ sở dữ liệu & ORM
- Hỗ trợ song song:
  1. **SQLite cục bộ (`node:sqlite`)**: Chạy tức thì khi phát triển mà không cần phụ thuộc mạng.
  2. **Supabase PostgreSQL (`pg` / `Prisma`)**: Chuyển đổi tức thì qua biến môi trường `DATABASE_URL` trong `.env`.
- **Ba Model chính**:
  - `Dish` (`dishes`): `id`, `name`, `description`, `price`, `originalPrice`, `category`, `imageUrl`, `rating`, `soldCount`, `prepTimeMin`, `available`, `createdAt`.
  - `Chef` (`chefs`): `id`, `name`, `specialty`, `experience`, `bio`, `avatarUrl`, `createdAt`.
  - `Ingredient` (`ingredients`): `id`, `name`, `unit`, `stock`, `origin`, `createdAt`.
  - Mở rộng `Order` (`orders`): Lưu đơn đặt món của khách hàng trên ShopeeFood.

---

## 3. Phân tách dữ liệu trong HTTP Request
| Vị trí | Mục đích sử dụng | Ví dụ trong ứng dụng |
| :--- | :--- | :--- |
| **`req.params`** | Định danh bản ghi (Identity) | `GET /dishes/:id`, `PATCH /admin/dishes/:id` |
| **`req.query`** | Điều kiện hiển thị, tìm kiếm, lọc | `GET /dishes?q=phở&category=Món+Nước` |
| **`req.body`** | Dữ liệu ghi (Mutation payload) | Form `POST /admin/dishes`, `POST /orders` |

---

## 4. Chuẩn hóa HTTP Method, PRG Pattern & Xử lý lỗi
1. **Không dùng `GET` để thay đổi dữ liệu**: Mọi thao tác xóa đều có trang xác nhận `GET /admin/{resource}/:id/delete`, sau đó thực thi qua `<form method="POST" action="...&_method=DELETE">`.
2. **Method Override (`method-override`)**: Chuyển đổi `POST` từ HTML form thành `PATCH` (cập nhật) và `DELETE` (xóa).
3. **Post/Redirect/Get (`303 See Other`)**: Sau khi `POST`, `PATCH`, `DELETE` thành công, server luôn trả về `res.redirect(303, ...)` để tránh lỗi tạo bản ghi trùng khi người dùng bấm Reload (F5).
4. **Validation & Mã trạng thái chuẩn**:
   - `400 Bad Request`: Khi thiếu tên hoặc giá âm, server không ghi DB và render lại form kèm thông báo lỗi + giữ nguyên giá trị người dùng vừa nhập.
   - `404 Not Found`: Khi `id` không phải số nguyên dương (`/dishes/abc`) hoặc không tồn tại (`/dishes/9999`).
   - `500 Internal Server Error`: Ghi lỗi chi tiết ở server log, trả trang thông báo thân thiện và tuyệt đối không lộ `err.message` hay `DATABASE_URL`.
