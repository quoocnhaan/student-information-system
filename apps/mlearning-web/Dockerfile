# Bước 1: Build ứng dụng (Build stage)
FROM node:20-alpine AS builder

WORKDIR /app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Sao chép toàn bộ mã nguồn
COPY . .

# Build dự án (sẽ tạo ra thư mục dist)
RUN npm run build

# Bước 2: Phục vụ ứng dụng (Production stage)
FROM nginx:alpine

# Xóa các file mặc định của Nginx
RUN rm -rf /usr/share/nginx/html/*

# Sao chép thư mục dist từ build stage sang thư mục phục vụ của Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Chạy Nginx ở foreground
CMD ["nginx", "-g", "daemon off;"]
