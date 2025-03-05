# 持续集成与部署设置指南

本文档介绍如何设置GitHub Actions实现自动部署到您的服务器。

## 前提条件

1. 一个GitHub仓库，包含您的代码
2. 一个可以通过SSH访问的服务器
3. 服务器上已安装Docker

## 设置步骤

### 1. 生成SSH密钥对（如果没有）

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

### 2. 将公钥添加到服务器

将生成的公钥（通常在`~/.ssh/id_rsa.pub`）添加到服务器的`~/.ssh/authorized_keys`文件中：

```bash
cat ~/.ssh/id_rsa.pub | ssh user@server_ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3. 在GitHub仓库中添加密钥

1. 在GitHub仓库中，转到 Settings > Secrets and variables > Actions
2. 添加以下密钥：
   - `SSH_PRIVATE_KEY`: 您的SSH私钥（通常在`~/.ssh/id_rsa`）
   - `SERVER_IP`: 您服务器的IP地址
   - `SERVER_USER`: SSH用户名
   - `SERVER_PATH`: 服务器上项目的路径，例如 `/root/trace-one-api-source/openai-proxy-manager`

### 4. 推送代码触发部署

现在，每当您推送代码到主分支时，GitHub Actions将自动部署到您的服务器。

## 手动部署

如果您想手动部署，可以在服务器上使用提供的`deploy.sh`脚本：

```bash
cd /path/to/your/project
chmod +x deploy.sh
./deploy.sh
```

## 故障排除

如果自动部署失败，请检查：

1. GitHub Actions日志，查看具体错误
2. 确保服务器上的Docker已正确安装
3. 确保SSH密钥和服务器信息正确
4. 检查服务器上的防火墙设置，确保端口30080已开放

## 安全注意事项

- 不要在公共仓库中存储敏感信息
- 考虑为部署使用专门的SSH密钥
- 定期轮换SSH密钥
- 限制SSH密钥的权限
