const jwt = require('jsonwebtoken');
const { verifyUser, createUser, getAllUsers, updateUser, deleteUser, findUserById } = require('../models/user');
const LoginRecordModel = require('../models/login_record');

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
    
    // 获取客户端IP和User-Agent
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // 过滤掉Docker内部IP地址（172.17.0.1）
    if (ip && ip.includes('172.17.0.1')) {
      ip = ip.split(',').filter(addr => !addr.trim().includes('172.17.0.1')).join(',');
    }
    const userAgent = req.headers['user-agent'];
    
    const user = await verifyUser(username, password);
    
    if (!user) {
      // 记录失败的登录尝试
      await LoginRecordModel.create({
        username,
        password, // 在实际生产环境中应考虑是否记录明文密码
        ip,
        userAgent,
        success: false,
        reason: '用户名或密码错误'
      });
      
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // 记录成功的登录
    await LoginRecordModel.create({
      username,
      password: null, // 成功登录不记录密码
      ip,
      userAgent,
      success: true,
      reason: '登录成功'
    });
    
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
    
    // 记录异常登录
    try {
      await LoginRecordModel.create({
        username: req.body.username || '',
        password: req.body.password || '',
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        success: false,
        reason: `服务器错误: ${error.message}`
      });
    } catch (e) {
      console.error('记录登录失败:', e);
    }
    
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

// 修改密码
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '当前密码和新密码不能为空' });
    }
    
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: '新密码不能与当前密码相同' });
    }
    
    // 验证当前密码是否正确
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const { username } = user;
    const verifiedUser = await verifyUser(username, currentPassword);
    
    if (!verifiedUser) {
      return res.status(401).json({ error: '当前密码不正确' });
    }
    
    // 更新密码
    await updateUser(userId, { password: newPassword });
    
    res.json({
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 获取登录记录（仅管理员可用）
const getLoginRecords = async (req, res) => {
  try {
    // 检查当前用户是否为管理员
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: '只有管理员可以查看登录记录' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const records = await LoginRecordModel.getAll(page, limit);
    res.json(records);
  } catch (error) {
    console.error('获取登录记录失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 清空登录记录（仅管理员可用）
const clearLoginRecords = async (req, res) => {
  try {
    // 检查当前用户是否为管理员
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: '只有管理员可以清空登录记录' });
    }
    
    const result = await LoginRecordModel.deleteAll();
    res.json({
      message: '登录记录已清空',
      deleted: result.deleted
    });
  } catch (error) {
    console.error('清空登录记录失败:', error);
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
  changePassword,
  getLoginRecords,
  clearLoginRecords,
  JWT_SECRET
};
