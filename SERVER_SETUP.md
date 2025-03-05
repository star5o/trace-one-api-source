# 服务器部署指南

本文档介绍如何在服务器 check.lma.ac.cn 上部署和配置 OpenAI API 代理管理系统。

## 部署步骤

### 1. 克隆仓库

```bash
git clone <您的仓库URL> /path/to/project
cd /path/to/project
```

### 2. 配置域名

在服务器上，您需要配置 Nginx 或其他反向代理，将 check.lma.ac.cn 指向 Docker 容器的端口。

示例 Nginx 配置：

```nginx
server {
    listen 80;
    server_name check.lma.ac.cn;

    location / {
        proxy_pass http://localhost:30080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 部署应用

使用部署脚本进行部署：

```bash
chmod +x deploy.sh
./deploy.sh
```

这将：
1. 拉取最新代码
2. 构建 Docker 镜像
3. 停止并删除旧容器
4. 启动新容器，将端口 30080 映射到容器的 80 端口

### 4. 验证部署

访问 http://check.lma.ac.cn 确认应用已正确部署。

## 注意事项

1. 确保服务器防火墙允许 80 端口的访问
2. 如果使用 HTTPS，需要配置 SSL 证书和 443 端口
3. 数据存储在 `/path/to/project/server/data` 目录中，请定期备份此目录

## 故障排除

如果遇到问题，请检查：

1. Docker 容器日志：`docker logs openai-proxy-manager`
2. Nginx 错误日志：`/var/log/nginx/error.log`
3. 确保 API 请求正确代理到后端服务
