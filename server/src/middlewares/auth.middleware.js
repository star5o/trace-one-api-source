const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../controllers/auth.controller');

// 验证JWT令牌的中间件
const authenticateToken = (req, res, next) => {
  // 从请求头获取令牌
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN格式
  
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  
  // 验证令牌
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: '认证令牌已过期' });
      }
      return res.status(403).json({ error: '无效的认证令牌' });
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    next();
  });
};

// 检查是否为管理员的中间件
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '未授权' });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  isAdmin
};
