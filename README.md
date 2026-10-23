# Đoán Chữ Party

Game đoán chữ cho 6-10 người, mỗi người một điện thoại.

## Deploy lên Netlify
Cách 1 (nhanh nhất, dùng CLI):
    npm install
    npx netlify-cli deploy --prod
  (lần đầu sẽ hỏi đăng nhập và tạo site mới; Publish directory: public)

Cách 2: đẩy thư mục này lên GitHub, rồi trên Netlify chọn
"Add new site > Import an existing project". Không cần cấu hình thêm.

Lưu ý: kéo-thả thư mục lên Netlify Drop sẽ KHÔNG chạy được phần server (/api/room).

## Chơi
Mở site, nhập tên, người đầu tiên vào là chủ phòng. Bạn bè quét QR trong phòng chờ.
Sửa từ khóa / hình phạt mặc định ở netlify/functions/room.mjs (WORDS, PUN).
