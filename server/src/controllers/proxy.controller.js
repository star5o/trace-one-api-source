const ProxyModel = require('../models/proxy');

class ProxyController {
  // 创建中转站
  static async create(req, res) {
    try {
      const { name, baseUrl, exchangeRate, cookie } = req.body;
      
      if (!name || !baseUrl) {
        return res.status(400).json({ message: '名称和Base URL不能为空' });
      }
      
      // 汇率默认为7.0，如果提供了则使用提供的值
      const rate = exchangeRate ? parseFloat(exchangeRate) : 7.0;
      
      const proxy = await ProxyModel.create(name, baseUrl, rate, cookie);
      res.status(201).json(proxy);
    } catch (error) {
      console.error('创建中转站失败:', error);
      res.status(500).json({ message: '创建中转站失败', error: error.message });
    }
  }

  // 更新中转站
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, baseUrl, exchangeRate, cookie } = req.body;
      
      if (!name || !baseUrl) {
        return res.status(400).json({ message: '名称和Base URL不能为空' });
      }
      
      // 汇率必须是数字
      const rate = exchangeRate !== undefined ? parseFloat(exchangeRate) : 7.0;
      if (isNaN(rate)) {
        return res.status(400).json({ message: '汇率必须是有效的数字' });
      }
      
      const proxy = await ProxyModel.update(id, name, baseUrl, rate, cookie);
      res.json(proxy);
    } catch (error) {
      console.error('更新中转站失败:', error);
      
      if (error.message === '中转站不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '更新中转站失败', error: error.message });
    }
  }

  // 删除中转站
  static async delete(req, res) {
    try {
      const { id } = req.params;
      await ProxyModel.delete(id);
      res.json({ message: '中转站删除成功' });
    } catch (error) {
      console.error('删除中转站失败:', error);
      
      if (error.message === '中转站不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '删除中转站失败', error: error.message });
    }
  }

  // 获取单个中转站
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const proxy = await ProxyModel.getById(id);
      res.json(proxy);
    } catch (error) {
      console.error('获取中转站失败:', error);
      
      if (error.message === '中转站不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '获取中转站失败', error: error.message });
    }
  }

  // 获取所有中转站
  static async getAll(req, res) {
    try {
      const proxies = await ProxyModel.getAll();
      res.json(proxies);
    } catch (error) {
      console.error('获取中转站列表失败:', error);
      res.status(500).json({ message: '获取中转站列表失败', error: error.message });
    }
  }
  
  // 清空中转站的分组和模型
  static async clearGroupsAndModels(req, res) {
    try {
      const { id } = req.params;
      await ProxyModel.clearGroupsAndModels(id);
      res.json({ message: '分组和模型清空成功' });
    } catch (error) {
      console.error('清空分组和模型失败:', error);
      
      if (error.message === '中转站不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '清空分组和模型失败', error: error.message });
    }
  }
}

module.exports = ProxyController;
