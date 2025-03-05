const express = require('express');
const ModelController = require('../controllers/model.controller');

const router = express.Router();

// 更新模型信息
router.put('/models/:id', ModelController.update);

module.exports = router;
