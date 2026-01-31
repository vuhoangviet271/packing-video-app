# Packing Video Recording App - Tài liệu triển khai

## Thông tin cấu hình

| Mục | Giá trị |
|-----|---------|
| **Backend URL** | `https://api.spotless.vn` |
| **Backend Port** | 3001 |
| **Webhook URL** | `https://api.spotless.vn/api/webhook/kiotviet` |
| **Webhook Secret** | `dnVob2FuZ3ZpZXQ=` |
| **KiotViet Webhook ID** | 500226745 |
| **KiotViet Retailer ID** | 500634734 |
| **Database** | SQLite (file:./dev.db) |
| **Default login** | admin / admin123 |

## Kiến trúc

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Electron App (Windows)  │  HTTP   │  Backend (Fastify)           │
│  (mỗi trạm đóng hàng)   │◄───────►│  https://api.spotless.vn     │
│                          │         │  Windows Server 2012         │
│  - Cam1: quay video      │         │  Node 18.18+                 │
│  - Cam2: đọc QR          │         │  - SQLite + Prisma           │
│  - Cam3: đọc barcode     │         │  - KiotViet webhook          │
│  - Video lưu local       │         │  - JWT auth                  │
└──────────────────────────┘         └──────────────────────────────┘
```

## Cấu trúc project

```
packing-video-app/
├── packages/
│   ├── shared/              # Types, Zod schemas, constants
│   ├── backend/             # Fastify server + Prisma
│   │   ├── prisma/schema.prisma
│   │   ├── src/routes/      # auth, orders, videos, products, inventory, dashboard, webhook
│   │   └── src/services/    # Business logic
│   └── electron/            # Desktop app
│       ├── src/main/        # Main process (IPC, file save, preload)
│       └── src/renderer/    # React app
│           ├── components/  # camera/, packing/, returns/, inventory/, dashboard/, layout/
│           ├── hooks/       # useMediaRecorder, useQrScanner, useBarcodeScanner, useRecordingSession
│           ├── stores/      # Zustand stores
│           └── services/    # API client (axios) → https://api.spotless.vn
```

## Files cấu hình quan trọng

| File | Mục đích | Giá trị cần chú ý |
|------|----------|-------------------|
| `packages/backend/.env` | Config backend | DATABASE_URL, JWT_SECRET, KIOTVIET_WEBHOOK_SECRET |
| `packages/electron/src/renderer/services/api.ts` | URL backend cho Electron app | `https://api.spotless.vn` |
| `packages/backend/prisma/schema.prisma` | Database schema | SQLite |
| `packages/electron/electron-builder.yml` | Build config cho Windows/Mac | output: release |
| `packages/electron/package.json` | Script dev cần `unset ELECTRON_RUN_AS_NODE` | Chỉ cần trên macOS |

## Backend .env (trên server)

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this-secret-in-production"
PORT=3001
KIOTVIET_WEBHOOK_SECRET="dnVob2FuZ3ZpZXQ="
```

## API Endpoints

| Method | Path | Mô tả | Auth |
|--------|------|--------|------|
| POST | /api/auth/login | Đăng nhập | Không |
| GET | /api/auth/me | Thông tin user hiện tại | JWT |
| GET | /api/orders/:shippingCode | Lấy đơn hàng (expand combo) | JWT |
| POST | /api/orders | Tạo đơn hàng thủ công | JWT |
| POST | /api/videos | Tạo video record | JWT |
| GET | /api/videos?type=&status=&page=&limit= | Danh sách video | JWT |
| GET | /api/videos/search?q= | Tìm kiếm video | JWT |
| GET | /api/videos/export | Xuất CSV | JWT |
| GET | /api/products | Danh sách sản phẩm | JWT |
| POST | /api/products | Tạo sản phẩm | JWT |
| POST | /api/products/combo | Tạo combo | JWT |
| GET | /api/products/by-barcode/:barcode | Tra cứu barcode | JWT |
| PUT | /api/products/:id | Sửa sản phẩm | JWT |
| DELETE | /api/products/:id | Xóa sản phẩm | JWT |
| POST | /api/inventory/packing-complete | Trừ kho sau đóng hàng | JWT |
| POST | /api/inventory/return-complete | Cộng kho sau hoàn hàng | JWT |
| POST | /api/inventory/manual-adjust | Điều chỉnh kho thủ công | JWT |
| GET | /api/inventory/transactions | Lịch sử xuất/nhập kho | JWT |
| GET | /api/dashboard/today | Thống kê hôm nay | JWT |
| POST | /api/webhook/kiotviet | Webhook nhận đơn từ KiotViet | HMAC |

## KiotViet Webhook

- **Đã đăng ký**: ID 500226745, type `order.update`
- **URL**: `https://api.spotless.vn/api/webhook/kiotviet`
- **Bảo mật**: HMAC SHA-256 qua header `X-Hub-Signature`
- **Secret gửi KiotViet (Base64)**: `dnVob2FuZ3ZpZXQ=`
- **Secret trong .env**: `dnVob2FuZ3ZpZXQ=` (cùng giá trị)
- **Luồng**: KiotViet có đơn mới → POST tới URL → Server verify signature → Lưu DB
- **SKU phải khớp** giữa KiotViet và database app

## Deploy Backend lên Windows Server 2012

```bash
# 1. Cài Node.js 18.18+ (https://nodejs.org/)
# 2. Cài pnpm
npm install -g pnpm

# 3. Clone project
git clone <repo-url> packing-video-app
cd packing-video-app

# 4. Cài dependencies
pnpm install

# 5. Setup database
cd packages/backend
npx prisma migrate deploy
npx tsx prisma/seed.ts

# 6. Build backend
npx tsc

# 7. Chạy backend
node dist/server.js

# 8. Mở port 3001 trên Windows Firewall
# Windows Firewall → Advanced Settings → Inbound Rules → New Rule
# → Port → TCP 3001 → Allow
```

## Build Electron App cho Windows

```bash
# Trên macOS:
cd packages/electron
npx electron-vite build
npx electron-builder --win

# File .exe nằm trong packages/electron/release/
# Copy sang máy Windows để cài
```

## Chạy dev trên macOS

```bash
# Terminal 1 - Backend
cd packages/backend
npx pnpm dev

# Terminal 2 - Electron (PHẢI dùng Terminal.app, KHÔNG dùng VSCode terminal)
cd packages/electron
unset ELECTRON_RUN_AS_NODE && npx electron-vite dev

# Lưu ý: VSCode terminal set ELECTRON_RUN_AS_NODE=1 → Electron không khởi tạo được
```

## Database Schema

### Tables:
- **staff**: id, username, password(bcrypt), fullName, active
- **orders**: id, shippingCode(unique), source, rawPayload, createdAt
- **order_items**: orderId, productId, quantity
- **products**: id, sku(unique), barcode(unique), name, isCombo, quantity, unsellableQty
- **combo_components**: comboId, componentId, quantity
- **video_records**: id, shippingCode, orderId, staffId, type(PACKING|RETURN), status, duration, fileName, machineName
- **scanned_items**: videoRecordId, productId, scannedQty, returnQuality(GOOD|BAD)
- **inventory_transactions**: productId, action, quantity, reference

## Luồng nghiệp vụ

### Đóng hàng:
1. QR scan mã vận đơn → Tra DB lấy đơn hàng
2. Hiện danh sách sản phẩm (combo đã expand thành SP đơn lẻ)
3. Bắt đầu quay video (Cam1)
4. Quét barcode sản phẩm (Cam3) → Đối chiếu với danh sách
5. Nhấn Enter/Space dừng quay → Lưu video local → Gửi API → Trừ kho

### Nhập hàng hoàn:
1. QR scan mã vận đơn
2. Bắt đầu quay video
3. Quét barcode sản phẩm hoàn
4. Chọn chất lượng: hoàn tốt / hoàn xấu
5. Dừng quay → Lưu video → Gửi API → Cộng kho (tốt) hoặc cộng kho lỗi (xấu)

## Verification checklist

- [ ] Backend chạy trên `https://api.spotless.vn`
- [ ] Login API hoạt động: `POST /api/auth/login`
- [ ] Webhook KiotViet nhận đơn thành công
- [ ] Electron app kết nối được backend
- [ ] Thêm sản phẩm + combo hoạt động
- [ ] Camera quay video hoạt động
- [ ] QR + Barcode scan hoạt động
- [ ] Trừ/cộng kho đúng
- [ ] Dashboard hiện thống kê
- [ ] Build .exe chạy được trên Windows
