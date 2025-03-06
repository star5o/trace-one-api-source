const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { initDatabase } = require('./models/database');
const { migrateDatabase } = require('./utils/migrate');
const { authenticateToken } = require('./middlewares/auth.middleware');

// 导入路由
const proxyRoutes = require('./routes/proxy.routes');
const groupRoutes = require('./routes/group.routes');
const traceRoutes = require('./routes/trace.routes');
const modelRoutes = require('./routes/model.routes');
const authRoutes = require('./routes/auth.routes');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 静态文件
app.use(express.static(path.join(__dirname, '../../client/dist')));

// 创建一个中间件来处理除了登录和图片请求外的所有API请求
const authMiddleware = (req, res, next) => {
  // 如果是登录请求或图片请求，则跳过认证
  if ((req.path === '/auth/login' && req.method === 'POST') || 
      (req.path === '/img' && req.method === 'GET')) {
    return next();
  }
  
  // 其他请求需要认证
  return authenticateToken(req, res, next);
};

// 应用认证中间件到所有API路由
app.use('/api', authMiddleware);

// 注册所有路由
app.use('/api', proxyRoutes);
app.use('/api', groupRoutes);
app.use('/api', traceRoutes);
app.use('/api', modelRoutes);
app.use('/api', authRoutes);

// 前端路由处理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// 初始化数据库并启动服务器
(async () => {
  try {
    await initDatabase();
    console.log('数据库初始化成功');
    
    // 运行数据库迁移
    await migrateDatabase();
    
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
})();
