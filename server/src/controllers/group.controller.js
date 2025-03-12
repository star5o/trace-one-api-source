const GroupModel = require('../models/group');

class GroupController {
  // 创建分组
  static async create(req, res) {
    try {
      const { proxyId, name, key, remark, group_ratio } = req.body;
      
      if (!proxyId || !name || !key) {
        return res.status(400).json({ message: '中转站ID、名称和API Key不能为空' });
      }
      
      const group = await GroupModel.create(proxyId, name, key, remark, group_ratio);
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
      const { name, key, remark, group_ratio } = req.body;
      
      if (!name || !key) {
        return res.status(400).json({ message: '名称和API Key不能为空' });
      }
      
      if (group_ratio !== undefined && group_ratio <= 0) {
        return res.status(400).json({ message: '价格倍率必须大于0' });
      }
      
      const group = await GroupModel.update(id, name, key, remark, group_ratio);
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
      
      // 获取分组下的所有模型
      const models = await GroupModel.getModels(id);
      
      // 计算每个模型的价格
      const modelsWithPrices = models.map(model => {
        const inputPrice = group.group_ratio * model.model_ratio * 2;
        const outputPrice = inputPrice * model.completion_ratio;
        return {
          ...model,
          input_price: inputPrice,
          output_price: outputPrice
        };
      });
      
      res.json({
        ...group,
        models: modelsWithPrices
      });
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
      
      // 为每个分组获取模型并计算价格
      const groupsWithModels = await Promise.all(groups.map(async group => {
        const models = await GroupModel.getModels(group.id);
        const modelsWithPrices = models.map(model => {
          const inputPrice = group.group_ratio * model.model_ratio * 2;
          const outputPrice = inputPrice * model.completion_ratio;
          return {
            ...model,
            input_price: inputPrice,
            output_price: outputPrice
          };
        });
        return {
          ...group,
          models: modelsWithPrices
        };
      }));
      
      res.json(groupsWithModels);
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

  // 获取分组和价格信息
  static async fetchGroupsAndPrices(req, res) {
    try {
      const { proxyId } = req.params;
      const result = await GroupModel.fetchGroupsAndPrices(proxyId);
      res.json(result);
    } catch (error) {
      console.error('获取分组和价格信息失败:', error);
      
      if (error.message === '中转站不存在' || error.message === '无法获取分组和价格信息') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '获取分组和价格信息失败', error: error.message });
    }
  }

  // 更新分组价格倍率
  static async updateGroupRatio(req, res) {
    try {
      const { id } = req.params;
      const { group_ratio } = req.body;
      
      if (group_ratio === undefined || group_ratio <= 0) {
        return res.status(400).json({ message: '价格倍率必须大于0' });
      }
      
      const group = await GroupModel.updateGroupRatio(id, group_ratio);
      
      // 获取分组下的所有模型并计算新的价格
      const models = await GroupModel.getModels(id);
      const modelsWithPrices = models.map(model => {
        const inputPrice = group_ratio * model.model_ratio * 2;
        const outputPrice = inputPrice * model.completion_ratio;
        return {
          ...model,
          input_price: inputPrice,
          output_price: outputPrice
        };
      });
      
      res.json({
        ...group,
        models: modelsWithPrices
      });
    } catch (error) {
      console.error('更新分组价格倍率失败:', error);
      
      if (error.message === '分组不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '更新分组价格倍率失败', error: error.message });
    }
  }
}

module.exports = GroupController;
