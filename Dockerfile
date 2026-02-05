# Stage 1: Cài đặt dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build code
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runner với Nginx
FROM nginx:stable-alpine AS runner

# COPY file cấu hình đã tạo ở bước trên vào Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy thành phẩm sau khi build vào thư mục mặc định của Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Port mặc định của Nginx là 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]