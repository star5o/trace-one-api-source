const express = require('express');
const TraceController = require('../controllers/trace.controller');

const router = express.Router();

// 获取所有溯源记录（分页）
router.get('/traces', TraceController.getAll);

// 获取单个溯源记录
router.get('/traces/:id', TraceController.getById);

// 根据模型ID获取溯源记录
router.get('/traces/model/:modelId', TraceController.getByModel);

// 创建溯源记录
router.post('/traces', TraceController.create);

// 删除溯源记录
router.delete('/traces/:id', TraceController.delete);

// 处理图片请求（用于溯源）
router.get('/img', TraceController.handleImageRequest);

module.exports = router;
