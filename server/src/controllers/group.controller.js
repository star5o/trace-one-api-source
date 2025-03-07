const GroupModel = require('../models/group');

class GroupController {
  // 创建分组
  static async create(req, res) {
    try {
      const { proxyId, name, key, remark } = req.body;
      
      if (!proxyId || !name || !key) {
        return res.status(400).json({ message: '中转站ID、名称和API Key不能为空' });
      }
      
      const group = await GroupModel.create(proxyId, name, key, remark);
      res.status(201).json(group);
    } catch (error) {
      console.error('创建分组失败:', error);
      res.status(500).json({ message: '创建分组失败', error: error.message });
    }
  }

  // 更新分组
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, key, remark } = req.body;
      
      if (!name || !key) {
        return res.status(400).json({ message: '名称和API Key不能为空' });
      }
      
      const group = await GroupModel.update(id, name, key, remark);
      res.json(group);
    } catch (error) {
      console.error('更新分组失败:', error);
      
      if (error.message === '分组不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '更新分组失败', error: error.message });
    }
  }

  // 删除分组
  static async delete(req, res) {
    try {
      const { id } = req.params;
      await GroupModel.delete(id);
      res.json({ message: '分组删除成功' });
    } catch (error) {
      console.error('删除分组失败:', error);
      
      if (error.message === '分组不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '删除分组失败', error: error.message });
    }
  }

  // 获取单个分组
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const group = await GroupModel.getById(id);
      res.json(group);
    } catch (error) {
      console.error('获取分组失败:', error);
      
      if (error.message === '分组不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '获取分组失败', error: error.message });
    }
  }

  // 获取中转站的所有分组
  static async getByProxyId(req, res) {
    try {
      const { proxyId } = req.params;
      const groups = await GroupModel.getByProxyId(proxyId);
      res.json(groups);
    } catch (error) {
      console.error('获取分组列表失败:', error);
      res.status(500).json({ message: '获取分组列表失败', error: error.message });
    }
  }

  // 刷新分组的模型列表
  static async refreshModels(req, res) {
    try {
      const { id } = req.params;
      const result = await GroupModel.refreshModels(id);
      res.json(result);
    } catch (error) {
      console.error('刷新模型列表失败:', error);
      
      if (error.message === '分组不存在' || error.message === '中转站不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '刷新模型列表失败', error: error.message });
    }
  }

  // 自动获取分组
  static async autoFetchGroups(req, res) {
    try {
      const { proxyId } = req.params;
      const result = await GroupModel.autoFetchGroups(proxyId);
      res.json(result);
    } catch (error) {
      console.error('自动获取分组失败:', error);
      
      if (error.message === '中转站不存在' || error.message === '无法获取分组信息') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '自动获取分组失败', error: error.message });
    }
  }
}

module.exports = GroupController;
