const { db } = require('../models/database');

class ModelController {
  // 获取模型列表，支持分页和筛选
  static async getModels(req, res) {
    try {
      const { page = 1, pageSize = 20, search = '', proxyId, groupId } = req.query;
      
      // 验证分页参数
      const pageNum = parseInt(page, 10);
      const pageSizeNum = parseInt(pageSize, 10);
      
      if (isNaN(pageNum) || isNaN(pageSizeNum) || pageNum < 1 || pageSizeNum < 1) {
        return res.status(400).json({ message: '分页参数无效' });
      }
      
      // 计算偏移量
      const offset = (pageNum - 1) * pageSizeNum;
      
      // 构建查询条件
      let whereClause = '';
      const params = [];
      
      if (search) {
        whereClause += "(m.id LIKE ? OR m.remark LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (proxyId) {
        if (whereClause) whereClause += " AND ";
        whereClause += "g.proxyId = ?";
        params.push(proxyId);
      }
      
      if (groupId) {
        if (whereClause) whereClause += " AND ";
        whereClause += "m.groupId = ?";
        params.push(groupId);
      }
      
      if (whereClause) {
        whereClause = `WHERE ${whereClause}`;
      }
      
      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM models m 
        JOIN groups g ON m.groupId = g.id 
        ${whereClause}
      `;
      
      // 查询数据
      const dataQuery = `
        SELECT 
          m.id, m.groupId, m.remark, m.price_data, m.createdAt, m.updatedAt,
          g.id as group_id, g.name as group_name, g.price_data as group_price_data, g.proxyId,
          p.id as proxy_id, p.name as proxy_name, p.baseUrl, p.exchangeRate
        FROM models m
        JOIN groups g ON m.groupId = g.id
        JOIN proxies p ON g.proxyId = p.id
        ${whereClause}
        ORDER BY m.updatedAt DESC
        LIMIT ? OFFSET ?
      `;
      
      // 执行总数查询
      db.get(countQuery, params, (err, countResult) => {
        if (err) {
          console.error('查询模型总数失败:', err);
          return res.status(500).json({ message: '查询模型总数失败', error: err.message });
        }
        
        const total = countResult.total;
        
        // 执行数据查询
        db.all(dataQuery, [...params, pageSizeNum, offset], (err, models) => {
          if (err) {
            console.error('查询模型列表失败:', err);
            return res.status(500).json({ message: '查询模型列表失败', error: err.message });
          }
          
          // 处理数据，计算价格
          const processedModels = models.map(model => {
            // 解析价格数据
            let modelPriceData = {};
            let groupPriceData = {};
            
            try {
              if (model.price_data) {
                modelPriceData = typeof model.price_data === 'string' 
                  ? JSON.parse(model.price_data) 
                  : model.price_data;
              }
              
              if (model.group_price_data) {
                groupPriceData = typeof model.group_price_data === 'string' 
                  ? JSON.parse(model.group_price_data) 
                  : model.group_price_data;
              }
            } catch (e) {
              console.error('解析价格数据失败:', e);
            }
            
            // 计算价格
            const groupRatio = groupPriceData.group_ratio || 1;
            const modelRatio = modelPriceData.model_ratio || 1;
            const completionRatio = modelPriceData.completion_ratio || 1;
            
            const inputPrice = groupRatio * modelRatio * 2;
            const outputPrice = inputPrice * completionRatio;
            
            return {
              id: model.id,
              groupId: model.groupId,
              groupName: model.group_name,
              proxyId: model.proxyId,
              proxyName: model.proxy_name,
              baseUrl: model.baseUrl,
              exchangeRate: model.exchangeRate || 7.0,
              remark: model.remark,
              prices: {
                group_ratio: groupRatio,
                model_ratio: modelRatio,
                completion_ratio: completionRatio,
                input_price: inputPrice,
                output_price: outputPrice
              },
              createdAt: model.createdAt,
              updatedAt: model.updatedAt
            };
          });
          
          // 返回结果
          res.json({
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages: Math.ceil(total / pageSizeNum),
            data: processedModels
          });
        });
      });
    } catch (error) {
      console.error('获取模型列表失败:', error);
      res.status(500).json({ message: '获取模型列表失败', error: error.message });
    }
  }
  
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
}

module.exports = ModelController;
