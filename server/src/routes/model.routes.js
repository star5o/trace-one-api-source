const express = require('express');
const ModelController = require('../controllers/model.controller');

const router = express.Router();

// 获取模型列表，支持分页和筛选
router.get('/models', ModelController.getModels);

// 更新模型信息
router.put('/models/:id', ModelController.update);

// 更新模型价格参数
router.put('/models/:id/price-params', ModelController.updatePriceParams);

module.exports = router;
