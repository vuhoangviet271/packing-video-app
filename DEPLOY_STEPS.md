# Các bước deploy sau khi pull code mới

## Trên Server Windows 2012:

1. **Pull code mới:**
```bash
cd C:\packing-video-app
git pull
```

2. **Build lại backend:**
```bash
cd packages\backend
npm run build
```

3. **Restart PM2:**
```bash
pm2 restart packing-api
pm2 save
```

4. **Kiểm tra log:**
```bash
pm2 logs packing-api
```

## Trên máy local (máy đóng hàng):

1. **Pull code mới:**
```bash
cd /path/to/packing-video-app
git pull
```

2. **Build lại Electron app:**
```bash
cd packages/electron
npx electron-vite build
```

3. **Khởi động lại app Electron** (đóng app cũ và mở lại)

## Test fix return quality:

1. Xóa dữ liệu test cũ trong database (optional)
2. Quay video hoàn hàng mới
3. Chọn "Hoàn xấu" cho ít nhất 1 sản phẩm
4. Hoàn thành video
5. Kiểm tra trang Tổng quan - phải hiển thị đúng số lượng "Hoàn xấu"
6. Kiểm tra database: `SELECT return_quality FROM scanned_items WHERE return_quality IS NOT NULL;`
