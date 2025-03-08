const express = require('express');
const ModelController = require('../controllers/model.controller');

const router = express.Router();

// 更新模型信息
router.put('/models/:id', ModelController.update);

// 更新模型价格参数
router.put('/models/:id/price-params', ModelController.updatePriceParams);

module.exports = router;
