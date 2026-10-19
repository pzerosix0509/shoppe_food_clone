# ShopeeFood Full-Stack Restaurant WebApp (Block #5 SSR + Block #6 REST API & SPA)

Dự án **ShopeeFood Kitchen Flagship** hỗ trợ hoàn chỉnh cả hai kiến trúc của môn **Phát triển ứng dụng web**:
- **Block #5 (SSR + ORM + PRG 303)**: Chạy tại `http://localhost:3000` (Express + EJS + `method-override`).
- **Block #6 (REST API JSON + Standalone SPA)**:
  - **`api` (Backend REST API)**: Chạy tại `http://localhost:3000/api` (`dishes`, `chefs`, `ingredients`, `orders`), trả về đúng Response Shape `{ ok, data, error }`, phân biệt lỗi kỹ thuật (`400`/`404`/`500`) và lỗi nghiệp vụ (`200` kèm `ok: false`, `NOT_FOUND`, `VALIDATION_FAILED`), cấu hình CORS chính xác cho origin của SPA.
  - **`web` (Frontend SPA)**: Chạy độc lập tại `http://localhost:5173` (`web/server.js` + `web/public/`), sử dụng Client-Side Routing (History API + `index.html` fallback), lớp gọi API tập trung (`api-client.js`) kiểm tra 3 tầng lỗi, quản lý đủ 5 trạng thái (`loading`, `ok`, `empty`, `notFound`, `error`) và hủy request cũ bằng `AbortController`.

---

## 1. Hợp đồng REST API (Block #6 Contract)

Áp dụng cho cả 3 tài nguyên: `/api/dishes`, `/api/chefs`, `/api/ingredients`:

| Thao tác | Request | Thành công (`status 200`, `ok: true`) | Lỗi nghiệp vụ (`status 200`, `ok: false`) |
| :--- | :--- | :--- | :--- |
| **Danh sách** | `GET /api/{resource}?q=...` | `{ "ok": true, "data": [...] }` | — |
| **Chi tiết** | `GET /api/{resource}/:id` | `{ "ok": true, "data": {...} }` | `error.code = "NOT_FOUND"` |
| **Thêm** | `POST /api/{resource}` | `{ "ok": true, "data": {...} }` | `error.code = "VALIDATION_FAILED"` (kèm `fields`) |
| **Sửa** | `PATCH /api/{resource}/:id` | `{ "ok": true, "data": {...} }` | `"VALIDATION_FAILED"` hoặc `"NOT_FOUND"` |
| **Xóa** | `DELETE /api/{resource}/:id` | `{ "ok": true, "data": null }` | `error.code = "NOT_FOUND"` |

* **Lỗi kỹ thuật** (không bọc trong `{ ok }`):
  - Sai URL API (`GET /api/bok`) $\rightarrow$ `HTTP 404`
  - JSON body sai cú pháp $\rightarrow$ `HTTP 400`
  - Lỗi hệ thống / mất kết nối CSDL $\rightarrow$ `HTTP 500`

---

## 2. Cách chạy & Kiểm thử

```powershell
# 1. Cài đặt thư viện
npm install

# 2. Khởi tạo dữ liệu mẫu (10 món ăn, 3 đầu bếp, 6 nguyên liệu)
npm run seed

# 3. Chạy đồng thời cả API (:3000) và SPA (:5173)
npm start

# Hoặc chạy riêng từng phần để test lỗi khi tắt API:
npm run start:api   # Chạy API tại http://localhost:3000
npm run start:web   # Chạy SPA tại http://localhost:5173

# 4. Chạy toàn bộ Automated Tests (Block #5 + Block #6)
npm test
```
