# Nhịp Tin Backend

Backend NestJS/PostgreSQL cho website tổng hợp tin tức Việt Nam và thế giới.

## Tính năng

- JWT access/refresh token, refresh token có thể thu hồi, bcrypt 12 rounds.
- RBAC `reader`, `editor`, `admin`.
- CRUD bài viết, chuyên mục, thẻ và nguồn tin.
- Draft/published/archived, tin nổi bật, tin nóng, vùng Việt Nam/thế giới.
- Tìm kiếm toàn văn cơ bản, bộ lọc, phân trang, tin xu hướng và bài liên quan.
- Lưu bài, bình luận có kiểm duyệt, đăng ký/hủy bản tin.
- Dashboard thống kê, Swagger, validation, Helmet, CORS và rate limit.
- TypeScript strict; không sử dụng explicit `any`; các hàm xử lý có `try/catch`.

## Chạy nhanh

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run seed
npm run news:sync
npm run dev
```

- API: `http://localhost:8081/api/v1`
- Swagger: `http://localhost:8081/api/docs`
- Health: `GET /api/v1/health`

## Tổng hợp tin thực tế

Backend đồng bộ RSS chính thức từ VnExpress và Báo Thanh Niên mỗi 10 phút. Hệ thống lưu tiêu đề, tóm tắt, ảnh, thời gian xuất bản, nguồn và URL gốc; bài trùng được nhận diện theo URL.

```bash
npm run news:sync
```

- `POST /api/v1/ingestion/sync`: chạy đồng bộ thủ công (Admin).
- `GET /api/v1/ingestion/status`: xem trạng thái từng feed (Admin).
- `NEWS_SYNC_ENABLED`: bật/tắt lịch tự động.
- `NEWS_SYNC_ON_START`: đồng bộ ngay khi backend khởi động.
- `NEWS_SYNC_LIMIT_PER_FEED`: số bài tối đa mỗi feed/lần.

Nội dung chỉ sử dụng tiêu đề và tóm tắt do RSS cung cấp, luôn ghi nguồn và liên kết tới bài gốc; không sao chép toàn văn bài báo.

## API chính

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET/PATCH /users/me`
- `GET /articles`, `GET /articles/slug/:slug`, `GET /articles/trending`
- `POST/PATCH/DELETE /articles` dành cho Editor/Admin
- `GET/POST/PATCH/DELETE /categories`, `/tags`, `/sources`
- `POST /bookmarks/:articleId/toggle`, `GET /bookmarks`
- `GET/POST/PATCH/DELETE /comments`
- `POST /newsletter/subscribe`, `GET /newsletter/unsubscribe/:token`
- `GET /dashboard/summary` dành cho Editor/Admin

## Quy trình nội dung

1. Editor tạo bài ở trạng thái `draft`.
2. Editor/Admin cập nhật nội dung, nguồn, thẻ và chuyên mục.
3. Gọi `POST /articles/:id/publish` để xuất bản.
4. Bài xuất hiện ở API công khai và được tính lượt xem.
5. Bình luận mới ở trạng thái `pending`; Editor/Admin kiểm duyệt thành `approved` hoặc `rejected`.

Không bật `DB_SYNCHRONIZE=true` trên production. Hãy dùng migration trước khi triển khai thực tế.

```bash
npm run migration:generate
npm run migration:run
```
