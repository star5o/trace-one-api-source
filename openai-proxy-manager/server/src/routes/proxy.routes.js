const express = require('express');
const ProxyController = require('../controllers/proxy.controller');

const router = express.Router();

// 获取所有中转站
router.get('/proxies', ProxyController.getAll);

// 获取单个中转站
router.get('/proxies/:id', ProxyController.getById);

// 创建中转站
router.post('/proxies', ProxyController.create);

// 更新中转站
router.put('/proxies/:id', ProxyController.update);

// 删除中转站
router.delete('/proxies/:id', ProxyController.delete);

module.exports = router;
