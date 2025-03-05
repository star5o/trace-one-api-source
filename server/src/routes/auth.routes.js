const express = require('express');
const { login, register, getCurrentUser, getUsers, updateUserInfo, removeUser } = require('../controllers/auth.controller');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// 公开路由
router.post('/auth/login', login);

// 需要认证的路由
router.get('/auth/me', authenticateToken, getCurrentUser);
router.post('/auth/register', authenticateToken, register);
router.get('/auth/users', authenticateToken, getUsers);
router.put('/auth/users/:id', authenticateToken, updateUserInfo);
router.delete('/auth/users/:id', authenticateToken, removeUser);

module.exports = router;
