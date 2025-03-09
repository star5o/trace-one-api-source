const { db } = require('../models/database');

class ModelController {
  // 更新模型信息
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { remark } = req.body;
      
      if (remark === undefined) {
        return res.status(400).json({ message: '备注不能为空' });
      }
      
      const now = Date.now();
      
      // 更新模型备注
      db.run(
        'UPDATE models SET remark = ?, updatedAt = ? WHERE id = ?',
        [remark, now, id],
        function(err) {
          if (err) {
            console.error('更新模型备注失败:', err);
            return res.status(500).json({ message: '更新模型备注失败', error: err.message });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ message: '模型不存在' });
          }
          
          res.json({ 
            id, 
            remark, 
            updatedAt: now 
          });
        }
      );
    } catch (error) {
      console.error('更新模型备注失败:', error);
      res.status(500).json({ message: '更新模型备注失败', error: error.message });
    }
  }
  
  // 更新模型价格参数
  static async updatePriceParams(req, res) {
    try {
      const { id } = req.params;
      const { group_ratio, model_ratio, completion_ratio } = req.body;
      
      // 验证参数
      if (group_ratio === undefined || model_ratio === undefined || completion_ratio === undefined) {
        return res.status(400).json({ message: '缺少必要的价格参数' });
      }
      
      if (group_ratio <= 0 || model_ratio <= 0 || completion_ratio <= 0) {
        return res.status(400).json({ message: '价格参数必须大于0' });
      }
      
      const now = Date.now();
      
      // 准备价格数据
      const priceData = JSON.stringify({
        group_ratio,
        model_ratio,
        completion_ratio
      });
      
      // 更新模型价格参数
      db.run(
        'UPDATE models SET price_data = ?, updatedAt = ? WHERE id = ?',
        [priceData, now, id],
        function(err) {
          if (err) {
            console.error('更新模型价格参数失败:', err);
            return res.status(500).json({ message: '更新模型价格参数失败', error: err.message });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ message: '模型不存在' });
          }
          
          // 计算输入和输出价格
          const inputPrice = group_ratio * model_ratio * 2;
          const outputPrice = inputPrice * completion_ratio;
          
          res.json({ 
            id, 
            price_data: {
              group_ratio,
              model_ratio,
              completion_ratio
            },
            input_price: inputPrice,
            output_price: outputPrice,
            updatedAt: now 
          });
        }
      );
    } catch (error) {
      console.error('更新模型价格参数失败:', error);
      res.status(500).json({ message: '更新模型价格参数失败', error: error.message });
    }
  }
  
  // 更新模型逆向状态
  static async updateReverseStatus(req, res) {
    try {
      const { id } = req.params;
      const { proxy_id, group_id, is_reverse } = req.body;
      
      // 验证参数
      if (is_reverse === undefined) {
        return res.status(400).json({ message: '缺少必要的参数' });
      }
      
      const isReverseValue = is_reverse ? 1 : 0;
      const now = Date.now();
      
      // 如果提供了分组ID，则更新特定分组中的模型
      if (group_id) {
        db.run(
          'UPDATE models SET is_reverse = ?, updatedAt = ? WHERE id = ? AND groupId = ?',
          [isReverseValue, now, id, group_id],
          function(err) {
            if (err) {
              console.error('更新模型逆向状态失败:', err);
              return res.status(500).json({ message: '更新模型逆向状态失败', error: err.message });
            }
            
            if (this.changes === 0) {
              return res.status(404).json({ message: '未找到指定的模型或分组' });
            }
            
            res.json({ 
              id, 
              group_id,
              proxy_id,
              is_reverse: !!is_reverse,
              updatedAt: now 
            });
          }
        );
      } else {
        // 如果没有提供分组ID，则更新所有分组中的该模型
        db.run(
          'UPDATE models SET is_reverse = ?, updatedAt = ? WHERE id = ?',
          [isReverseValue, now, id],
          function(err) {
            if (err) {
              console.error('更新模型逆向状态失败:', err);
              return res.status(500).json({ message: '更新模型逆向状态失败', error: err.message });
            }
            
            res.json({ 
              id, 
              is_reverse: !!is_reverse,
              updatedAt: now 
            });
          }
        );
      }
    } catch (error) {
      console.error('更新模型逆向状态失败:', error);
      res.status(500).json({ message: '更新模型逆向状态失败', error: error.message });
    }
  }
}

module.exports = ModelController;
