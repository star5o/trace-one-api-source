const jwt = require('jsonwebtoken');
const { verifyUser, createUser, getAllUsers, updateUser, deleteUser } = require('../models/user');

// JWT密钥，实际生产环境应该使用环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'openai-proxy-manager-secret-key';
// 令牌过期时间（24小时）
const JWT_EXPIRES_IN = '24h';

// 用户登录
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const user = await verifyUser(username, password);
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      },
      token
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 注册新用户（仅管理员可用）
const register = async (req, res) => {
  try {
    // 检查当前用户是否为管理员
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: '只有管理员可以创建新用户' });
    }
    
    const { username, password, isAdmin } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const newUser = await createUser({ username, password, isAdmin: isAdmin ? 1 : 0 });
    
    res.status(201).json({
      message: '用户创建成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        isAdmin: newUser.isAdmin
      }
    });
  } catch (error) {
    if (error.message === '用户名已存在') {
      return res.status(409).json({ error: error.message });
    }
    console.error('创建用户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 获取当前用户信息
const getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '未授权' });
  }
  
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      isAdmin: req.user.isAdmin
    }
  });
};

// 获取所有用户（仅管理员可用）
const getUsers = async (req, res) => {
  try {
    // 检查当前用户是否为管理员
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: '只有管理员可以查看用户列表' });
    }
    
    const users = await getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 更新用户信息
const updateUserInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, isAdmin } = req.body;
    
    // 检查权限：只有管理员可以更新其他用户，普通用户只能更新自己
    if (id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: '没有权限更新其他用户' });
    }
    
    // 只有管理员可以更改isAdmin状态
    if (isAdmin !== undefined && !req.user.isAdmin) {
      return res.status(403).json({ error: '只有管理员可以更改用户权限' });
    }
    
    const updatedUser = await updateUser(id, { username, password, isAdmin });
    
    res.json({
      message: '用户信息更新成功',
      user: updatedUser
    });
  } catch (error) {
    if (error.message === '用户不存在') {
      return res.status(404).json({ error: error.message });
    }
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 删除用户（仅管理员可用）
const removeUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查当前用户是否为管理员
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: '只有管理员可以删除用户' });
    }
    
    // 防止删除自己
    if (id === req.user.id) {
      return res.status(400).json({ error: '不能删除当前登录的用户' });
    }
    
    await deleteUser(id);
    
    res.json({
      message: '用户删除成功',
      id
    });
  } catch (error) {
    if (error.message === '用户不存在') {
      return res.status(404).json({ error: error.message });
    }
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

module.exports = {
  login,
  register,
  getCurrentUser,
  getUsers,
  updateUserInfo,
  removeUser,
  JWT_SECRET
};
