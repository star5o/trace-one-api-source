# OpenAI API中转站管理系统

这是一个用于管理OpenAI API中转站的系统，可以管理多个中转站、分组和模型，并提供溯源功能。

## 功能特点

- 中转站管理：添加、编辑、删除中转站
- 分组管理：为每个中转站添加多个分组，每个分组有独立的API Key
- 模型管理：自动获取每个分组可用的模型列表
- 溯源功能：通过图片URL追踪请求，记录中转节点的IP和UA信息
- 溯源历史：查看和删除溯源历史记录

## 技术栈

- 前端：Vue 3 + Vue Router + Element Plus + Axios
- 后端：Express + SQLite
- 构建工具：Vite
- 容器化：Docker + Nginx

## 安装与运行

### 前提条件

- Node.js 14.0+
- npm 或 yarn
- Docker（如果使用Docker部署）

### 使用Docker运行（推荐）

```bash
# 构建Docker镜像
docker build -t openai-proxy-manager .

# 运行Docker容器
docker run -p 80:80 -v $(pwd)/server/data:/app/server/data openai-proxy-manager
```

或者使用docker-compose：

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 手动安装依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd client
npm install

# 安装后端依赖
cd ../server
npm install
```

### 开发模式

```bash
# 在根目录运行前后端
npm start

# 或分别运行

# 运行前端开发服务器
cd client
npm run dev

# 运行后端开发服务器
cd ../server
npm run dev
```

### 生产模式

```bash
# 构建前端
cd client
npm run build

# 运行后端服务器（会自动提供前端静态文件）
cd ../server
npm start
```

## 项目结构

```
openai-proxy-manager/
├── client/                 # 前端代码
│   ├── public/             # 静态资源
│   ├── src/                # 源代码
│   │   ├── assets/         # 资源文件
│   │   ├── components/     # 组件
│   │   ├── router/         # 路由配置
│   │   ├── store/          # 状态管理
│   │   ├── views/          # 页面视图
│   │   ├── App.vue         # 主应用组件
│   │   └── main.js         # 入口文件
│   ├── index.html          # HTML模板
│   └── vite.config.js      # Vite配置
├── server/                 # 后端代码
│   ├── data/               # 数据库文件
│   ├── src/                # 源代码
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由
│   │   ├── utils/          # 工具函数
│   │   └── index.js        # 入口文件
│   └── package.json        # 项目配置
├── Dockerfile              # Docker构建文件
├── docker-compose.yml      # Docker Compose配置
├── nginx.conf              # Nginx配置
├── start.sh                # Docker启动脚本
└── README.md               # 项目说明
```

## API接口

### 中转站接口

- `GET /api/proxies` - 获取所有中转站
- `GET /api/proxies/:id` - 获取单个中转站
- `POST /api/proxies` - 创建中转站
- `PUT /api/proxies/:id` - 更新中转站
- `DELETE /api/proxies/:id` - 删除中转站

### 分组接口

- `GET /api/proxies/:proxyId/groups` - 获取中转站的所有分组
- `GET /api/groups/:id` - 获取单个分组
- `POST /api/groups` - 创建分组
- `PUT /api/groups/:id` - 更新分组
- `DELETE /api/groups/:id` - 删除分组
- `POST /api/groups/:id/refresh-models` - 刷新分组的模型列表

### 溯源接口

- `GET /api/traces` - 获取所有溯源记录
- `GET /api/traces/:id` - 获取单个溯源记录
- `GET /api/traces/model/:modelId` - 获取模型的溯源记录
- `POST /api/traces` - 创建溯源记录
- `DELETE /api/traces/:id` - 删除溯源记录
- `GET /api/img?traceid=xxx` - 溯源图片请求

## 溯源原理

当用户发送OpenAI API请求时，请求中会包含一个图片的URL，该URL指向当前系统，并附带traceId。例如：`/api/img?traceid=xxx`。系统会返回一个随机图片，并记录请求者的IP地址和时间。

如果请求通过中转节点，中转节点会访问该图片URL，从而记录下访问者的IP和UA等信息。在OpenAI API请求完成后，程序会查询数据库，检测是否有与当前traceId匹配的请求记录。

## 许可证

MIT
