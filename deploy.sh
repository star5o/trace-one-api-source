#!/bin/bash

# 拉取最新代码
git pull

# 停止并删除旧容器（如果存在）
docker stop openai-proxy-manager 2>/dev/null || true
docker rm openai-proxy-manager 2>/dev/null || true
echo "旧容器已停止并删除"

# 删除旧镜像（如果存在）
docker rmi openai-proxy-manager 2>/dev/null || true
echo "旧镜像已删除"

# 构建Docker镜像
docker build -t openai-proxy-manager .

# 运行新容器
docker run -d --name openai-proxy-manager -p 30080:80 -v $(pwd)/server/data:/app/server/data openai-proxy-manager

# 输出容器状态
echo "容器已启动，状态如下："
