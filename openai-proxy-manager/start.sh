#!/bin/sh

# 确保数据目录存在
mkdir -p /app/server/data

# 启动Nginx
nginx

# 启动后端服务器
cd /app/server && node src/index.js &

# 等待后端服务器启动
echo "等待后端服务器启动..."
sleep 5

# 打印启动信息
echo "OpenAI API代理管理系统已启动"
echo "访问 http://localhost 使用系统"

# 保持容器运行
tail -f /dev/null
