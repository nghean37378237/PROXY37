# ProxySwitcher Pro - Quản lý Proxy & Điều Hướng Mạng

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

Ứng dụng web chuyên nghiệp quản lý hồ sơ Proxy, phân bổ cổng cho nhân viên, tự đổi IP xoay vòng, kiểm tra ping độ trễ và hỗ trợ truy cập thiết bị/router mạng LAN `192.168.1.27`.

---

## ⚡ Hướng Dẫn Kết Nối & Triển Khai Lên Vercel (2 Cách)

### Cách 1: Triển khai qua GitHub (Khuyên dùng - 1 Click)

1. **Đưa mã nguồn lên GitHub:**
   - Tạo một repository mới trên GitHub (ví dụ: `proxyswitcher-pro`).
   - Đẩy (Push) toàn bộ thư mục code lên GitHub:
     ```bash
     git init
     git add .
     git commit -m "feat: setup ProxySwitcher Pro with Vercel support"
     git branch -M main
     git remote add origin https://github.com/TÊN_GITHUB_CỦA_BẠN/proxyswitcher-pro.git
     git push -u origin main
     ```

2. **Kết nối vào Vercel:**
   - Đăng nhập vào [Vercel](https://vercel.com).
   - Bấm **"Add New..."** -> chọn **"Project"**.
   - Chọn kho GitHub `proxyswitcher-pro` vừa tạo và bấm **"Import"**.
   - Vercel sẽ tự động phát hiện cấu hình từ file `vercel.json`:
     - **Framework Preset:** Vite
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
   - Bấm nút **"Deploy"**. Sau khoảng 30 giây, dự án của bạn sẽ chạy trên domain miễn phí dạng `proxyswitcher-pro.vercel.app`!

---

### Cách 2: Triển khai nhanh bằng Vercel CLI

Nếu bạn đã có Node.js trên máy tính:

1. Cài đặt Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Đăng nhập tài khoản Vercel:
   ```bash
   vercel login
   ```

3. Chạy lệnh deploy:
   ```bash
   vercel
   ```
   *(Nhấn Enter theo các câu hỏi mặc định của Vercel)*

4. Triển khai bản chính thức (Production):
   ```bash
   vercel --prod
   ```

---

## 📁 Cấu Trúc Hỗ Trợ Vercel Serverless

- `vercel.json`: Cấu hình framework Vite, SPA rewrites và headers bảo mật.
- `/api/proxy.js`: Serverless Function nhận gửi request relay, đo ping, kiểm tra mã HTTP status.
- `/api/download-pac.js`: Tự động tạo và tải script tự động cấu hình proxy (.PAC) trực tiếp từ đám mây Vercel.

---

## 🛠️ Chạy ở Môi Trường Cục Bộ (Local Development)

```bash
npm install
npm run dev
```
Truy cập tại: `http://localhost:3000`
