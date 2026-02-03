# Các câu lệnh thường dùng

## 1. Chạy Development

```bash
# Backend (port 3002)
cd packages/backend
pnpm dev

# Electron app
cd packages/electron
pnpm dev
```

## 2. Database (Prisma + SQLite)
Rebuild + restart:
pnpm build
pm2 start packing-api
```bash
# Mở Prisma Studio (GUI xem database trên trình duyệt)
cd packages/backend
npx prisma studio

# Xem database bằng CLI
cd packages/backend
npx prisma db execute --stdin <<< "SELECT * FROM Order LIMIT 10;"
npx prisma db execute --stdin <<< "SELECT * FROM Product LIMIT 10;"
npx prisma db execute --stdin <<< "SELECT * FROM VideoRecord ORDER BY createdAt DESC LIMIT 10;"
npx prisma db execute --stdin <<< "SELECT * FROM InventoryTransaction ORDER BY createdAt DESC LIMIT 10;"
npx prisma db execute --stdin <<< "SELECT * FROM ScannedItem ORDER BY scannedAt DESC LIMIT 10;"
npx prisma db execute --stdin <<< "SELECT * FROM ComboComponent;"

# Migrate database (sau khi sửa schema.prisma)
pnpm db:migrate

# Seed data mẫu
pnpm db:seed

# Reset database (xóa sạch + migrate lại)
cd packages/backend
npx prisma migrate reset
```

## 3. Build & Package

```bash
# Build backend
pnpm build:backend

# Build electron app (tạo file .exe / .dmg)
pnpm build:electron

# Chỉ build electron (không package)
cd packages/electron
pnpm build
```

## 4. Kiểm tra Backend API

```bash
# Health check
curl http://localhost:3002/api/dashboard/today

# Đăng nhập (lấy token)
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Xem danh sách sản phẩm (cần token)
curl http://localhost:3002/api/products \
  -H "Authorization: Bearer <TOKEN>"

# Xem danh sách đơn hàng
curl http://localhost:3002/api/orders \
  -H "Authorization: Bearer <TOKEN>"

# Xem video records
curl http://localhost:3002/api/videos \
  -H "Authorization: Bearer <TOKEN>"

# Xem tồn kho
curl http://localhost:3002/api/inventory/transactions \
  -H "Authorization: Bearer <TOKEN>"

# Test webhook (giả lập KiotViet gửi đơn hàng có mã vận đơn)
curl -X POST http://localhost:3002/api/webhook/kiotviet \
  -H "Content-Type: application/json" \
  -d '{"Notifications":[{"Action":"invoice.update","Data":[{"Code":"HD001","InvoiceDelivery":{"DeliveryCode":"MVD-TEST-001"},"InvoiceDetails":[{"ProductCode":"SKU001","ProductName":"San pham test","Quantity":2}]}]}]}'

# Kiểm tra webhook có hoạt động không (expect {"success":true})
curl -s http://localhost:3002/api/webhook/kiotviet -X POST \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
```

## 5. Kiểm tra Webhook & Log

```bash
# --- Xem đơn hàng mới nhất từ webhook ---
cd packages/backend
npx prisma db execute --stdin <<< "SELECT id, shippingCode, source, createdAt FROM \"Order\" ORDER BY createdAt DESC LIMIT 10;"

# --- Xem chi tiết đơn hàng + sản phẩm ---
npx prisma db execute --stdin <<< "SELECT o.shippingCode, p.name, p.sku, oi.quantity FROM \"Order\" o JOIN \"OrderItem\" oi ON oi.orderId = o.id JOIN \"Product\" p ON p.id = oi.productId ORDER BY o.createdAt DESC LIMIT 20;"

# --- Xem raw payload KiotViet đã gửi ---
npx prisma db execute --stdin <<< "SELECT shippingCode, rawPayload FROM \"Order\" ORDER BY createdAt DESC LIMIT 5;"

# --- Xem đơn hàng bị trùng (đã tồn tại) ---
npx prisma db execute --stdin <<< "SELECT shippingCode, COUNT(*) as cnt FROM \"Order\" GROUP BY shippingCode HAVING cnt > 1;"

# --- Xem log backend realtime (Windows CMD) ---
# Nếu chạy bằng node trực tiếp, log hiện trên console
# Nếu redirect log:
# node dist/server.js > server.log 2>&1
# type server.log | findstr "Webhook"

# --- Xem log backend realtime (PowerShell) ---
# node dist/server.js 2>&1 | Tee-Object -FilePath server.log
# Select-String -Path server.log -Pattern "Webhook"

# --- Xem log backend realtime (macOS/Linux) ---
# node dist/server.js 2>&1 | tee server.log
# grep -i "webhook" server.log
# tail -f server.log | grep -i "webhook"

# --- Test webhook từ bên ngoài (thay YOUR_SERVER_IP) ---
curl -X POST http://YOUR_SERVER_IP:3002/api/webhook/kiotviet \
  -H "Content-Type: application/json" \
  -d '{"Notifications":[{"Action":"invoice.update","Data":[{"Code":"TEST","InvoiceDelivery":{"DeliveryCode":"MVD-TEST-002"},"InvoiceDetails":[{"ProductCode":"SKU001","ProductName":"Test","Quantity":1}]}]}]}'
```

## 5. Quản lý Server (Windows)

```bash
# Kiểm tra port 3002 đang chạy chưa
netstat -ano | findstr :3002

# Kill process trên port 3002
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3002') do taskkill /PID %a /F

# Chạy backend trên server
cd packages\backend
set NODE_ENV=production
node dist/server.js

# Xem log realtime (PowerShell)
Get-Content -Path .\log.txt -Wait
```

## 6. Quản lý Server (macOS/Linux)

```bash
# Kiểm tra port 3002
lsof -i :3002

# Kill process trên port 3002
kill -9 $(lsof -t -i :3002)

# Chạy backend background với nohup
cd packages/backend
nohup node dist/server.js > server.log 2>&1 &

# Xem log realtime
tail -f server.log
```

## 7. Git

```bash
git status
git log --oneline -10
git diff
git add -A && git commit -m "message"
```

## 8. Troubleshooting

```bash
# Xóa node_modules và cài lại
rm -rf node_modules packages/*/node_modules
pnpm install

# Xóa cache electron-vite
cd packages/electron
rm -rf node_modules/.vite

# Kiểm tra TypeScript errors
cd packages/electron
npx tsc --noEmit

cd packages/backend
npx tsc --noEmit

# Xem file settings của Electron app (video dir, etc.)
# Windows: %APPDATA%/packing-video/app-settings.json
# macOS: ~/Library/Application Support/packing-video/app-settings.json

# Xem file database SQLite trực tiếp
# File: packages/backend/dev.db (hoặc theo DATABASE_URL trong .env)
```

## 10. Test Webhook KiotViet (từ đầu đến cuối)

```bash
# Bước 1: Xem log backend realtime (mở 1 terminal riêng)
pm2 logs packing-api --lines 5

# Bước 2: Tạo hóa đơn trên KiotViet (làm thủ công trên web KiotViet)
# Sau khi tạo xong, quay lại terminal xem log

# Bước 3: Kiểm tra log có nhận webhook không (xem 5 hoặc 10 dòng cuối)
pm2 logs packing-api --lines 5
pm2 logs packing-api --lines 20

# Bước 4: Kiểm tra đơn hàng đã vào database chưa
cd packages/backend
npx prisma db execute --stdin <<< "SELECT id, shippingCode, source, createdAt FROM \"Order\" ORDER BY createdAt DESC LIMIT 5;"

# Bước 5: Nếu không thấy log → kiểm tra backend có đang chạy không
pm2 status

# Bước 6: Nếu backend died → restart
pm2 restart packing-api
```

## 9. Biến môi trường (.env)

File: `packages/backend/.env`

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `DATABASE_URL` | Đường dẫn SQLite | `file:./dev.db` |
| `JWT_SECRET` | Secret cho JWT token | `change-this-secret-in-production` |
| `PORT` | Port backend | `3002` |
| `KIOTVIET_WEBHOOK_SECRET` | Secret verify webhook (Base64) | Comment = tắt verify |

🚀 Hướng dẫn Build Electron App
📋 Yêu cầu trước khi build:
Đã cài đặt dependencies:


pnpm install
Tạo icon cho app (nếu chưa có):


mkdir -p packages/electron/build
Đặt file icon.ico (256x256px) cho Windows
Đặt file icon.icns (512x512px) cho Mac
Hoặc đặt file icon.png (512x512px), electron-builder sẽ tự convert
🪟 BUILD CHO WINDOWS
Trên máy Windows:

# Bước 1: Build code
cd packages/electron
pnpm run build

# Bước 2: Package thành installer
Mở powersell admin
pnpm run package
Hoặc từ root folder:

# Build + Package một lệnh
cd /Users/broviet/packing-video-app
pnpm --filter electron build && pnpm --filter electron package -- --win
Kết quả:
File installer: packages/electron/release/Packing Video Setup 1.0.0.exe
Format: NSIS installer (.exe)
Architecture: x64 (64-bit)
Người dùng có thể chọn thư mục cài đặt
Tạo shortcut trên Desktop
🍎 BUILD CHO MAC
Trên máy Mac:

# Bước 1: Build code
cd packages/electron
pnpm run build

# Bước 2: Package thành DMG
pnpm run package -- --mac
Hoặc từ root folder:

# Build + Package một lệnh
cd /Users/broviet/packing-video-app
pnpm --filter electron build && pnpm --filter electron package -- --mac
Kết quả:
File installer:
packages/electron/release/Packing Video-1.0.0-x64.dmg (Intel Mac)
packages/electron/release/Packing Video-1.0.0-arm64.dmg (Apple Silicon/M1/M2/M3)
Format: DMG (Disk Image)
