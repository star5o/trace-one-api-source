# 使用Node.js作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装依赖
RUN apk add --no-cache nginx

# 复制package.json文件
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# 安装依赖
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# 复制源代码
COPY . .

# 构建前端
RUN cd client && npm run build

# 配置Nginx
COPY nginx.conf /etc/nginx/http.d/default.conf

# 暴露端口
EXPOSE 80

# 启动脚本
COPY start.sh /start.sh
RUN chmod +x /start.sh

# 启动服务
CMD ["/start.sh"]
