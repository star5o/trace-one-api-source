const express = require('express');
const GroupController = require('../controllers/group.controller');

const router = express.Router();

// 获取中转站的所有分组
router.get('/proxies/:proxyId/groups', GroupController.getByProxyId);

// 获取单个分组
router.get('/groups/:id', GroupController.getById);

// 创建分组
router.post('/groups', GroupController.create);

// 更新分组
router.put('/groups/:id', GroupController.update);

// 删除分组
router.delete('/groups/:id', GroupController.delete);

// 刷新分组的模型列表
router.post('/groups/:id/refresh-models', GroupController.refreshModels);

// 获取分组和价格信息
router.post('/proxies/:proxyId/fetch-groups-and-prices', GroupController.fetchGroupsAndPrices);

// 更新分组价格倍率
router.put('/groups/:id/ratio', GroupController.updateGroupRatio);

module.exports = router;
