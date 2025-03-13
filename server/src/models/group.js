const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

class GroupModel {
  // 创建分组
  static create(proxyId, name, key, remark = null, group_ratio = 1.0) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const now = Date.now();
      
      db.run(
        'INSERT INTO groups (id, proxyId, name, key, remark, group_ratio, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, proxyId, name, key, remark, group_ratio, now, now],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id,
              proxyId,
              name,
              key,
              remark,
              group_ratio,
              createdAt: now,
              updatedAt: now
            });
          }
        }
      );
    });
  }

  // 更新分组
  static update(id, name, key, remark = null, group_ratio = 1.0) {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      
      db.run(
        'UPDATE groups SET name = ?, key = ?, remark = ?, group_ratio = ?, updatedAt = ? WHERE id = ?',
        [name, key, remark, group_ratio, now, id],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error('分组不存在'));
          } else {
            resolve({
              id,
              name,
              key,
              remark,
              group_ratio,
              updatedAt: now
            });
          }
        }
      );
    });
  }

  // 删除分组
  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM groups WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('分组不存在'));
        } else {
          resolve({ id });
        }
      });
    });
  }

  // 获取单个分组
  static getById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM groups WHERE id = ?', [id], async (err, group) => {
        if (err) {
          reject(err);
        } else if (!group) {
          reject(new Error('分组不存在'));
        } else {
          try {
            // 获取该分组的所有模型
            const models = await new Promise((resolve, reject) => {
              db.all('SELECT * FROM models WHERE groupId = ?', [id], (err, models) => {
                if (err) {
                  reject(err);
                } else {
                  // 解析原始数据
                  models.forEach(model => {
                    if (model.raw_data) {
                      try {
                        model.raw_data = JSON.parse(model.raw_data);
                      } catch (e) {
                        // 如果解析失败，保持原样
                      }
                    }
                  });
                  resolve(models);
                }
              });
            });

            group.models = models;
            resolve(group);
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  // 获取中转站的所有分组
  static getByProxyId(proxyId) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM groups WHERE proxyId = ? ORDER BY createdAt DESC', [proxyId], async (err, groups) => {
        if (err) {
          reject(err);
        } else {
          try {
            // 为每个分组获取模型
            for (const group of groups) {
              group.models = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM models WHERE groupId = ?', [group.id], (err, models) => {
                  if (err) {
                    reject(err);
                  } else {
                    // 解析原始数据
                    models.forEach(model => {
                      if (model.raw_data) {
                        try {
                          model.raw_data = JSON.parse(model.raw_data);
                        } catch (e) {
                          // 如果解析失败，保持原样
                        }
                      }
                    });
                    resolve(models);
                  }
                });
              });
            }

            resolve(groups);
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  // 刷新分组的模型列表
  static async refreshModels(id) {
    try {
      // 获取分组信息
      const group = await this.getById(id);
      
      // 获取中转站信息
      const proxy = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM proxies WHERE id = ?', [group.proxyId], (err, proxy) => {
          if (err) {
            reject(err);
          } else if (!proxy) {
            reject(new Error('中转站不存在'));
          } else {
            resolve(proxy);
          }
        });
      });
      
      // 调用OpenAI API获取模型列表
      const response = await axios.get(`${proxy.baseUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${group.key}`
        }
      });
      
      const models = response.data.data;
      const now = Date.now();
      
      // 开始事务
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      try {
        // 删除该分组的所有模型
        await new Promise((resolve, reject) => {
          db.run('DELETE FROM models WHERE groupId = ?', [id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // 插入新的模型列表
        for (const model of models) {
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO models (id, groupId, created, object, owned_by, raw_data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [
                model.id,
                id,
                model.created,
                model.object,
                model.owned_by,
                JSON.stringify(model),
                now,
                now
              ],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
        
        // 提交事务
        await new Promise((resolve, reject) => {
          db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        return { success: true, count: models.length };
      } catch (error) {
        // 回滚事务
        await new Promise((resolve) => {
          db.run('ROLLBACK', () => resolve());
        });
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }
  
  // 自动获取分组信息
  static async autoFetchGroups(proxyId) {
    try {
      // 获取中转站信息
      const proxy = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM proxies WHERE id = ?', [proxyId], (err, proxy) => {
          if (err) {
            reject(err);
          } else if (!proxy) {
            reject(new Error('中转站不存在'));
          } else {
            resolve(proxy);
          }
        });
      });
      
      // 尝试不同的API路径获取分组信息
      let groups = [];
      let success = false;
      
      try {
        // 尝试不同的API路径获取分组信息
        let apiResponses = [];
        
        // 尝试 /api/pricing 路径
        try {
          const pricingResponse = await axios.get(`${proxy.baseUrl}/api/pricing`, {
            timeout: 5000,
            headers: proxy.cookie ? { 'Cookie': proxy.cookie } : {}
          });
          apiResponses.push(pricingResponse);
        } catch (error) {
          console.log('尝试 /api/pricing 路径失败:', error.message);
        }
        
        // 尝试 /api/groups 路径
        try {
          const groupsResponse = await axios.get(`${proxy.baseUrl}/api/groups`, {
            timeout: 5000,
            headers: proxy.cookie ? { 'Cookie': proxy.cookie } : {}
          });
          apiResponses.push(groupsResponse);
        } catch (error) {
          console.log('尝试 /api/groups 路径失败:', error.message);
        }
        
        // 处理所有响应
        for (const response of apiResponses) {
          // 处理第三种格式：直接在根层级的 usable_group
          if (response.data && response.data.usable_group) {
            const usableGroups = response.data.usable_group;
            for (const [key, value] of Object.entries(usableGroups)) {
              groups.push({
                name: key,
                desc: value,
                key: key
              });
            }
            success = true;
          }
          // 处理第一、二种格式：在 data 层级的数据
          else if (response.data && response.data.data) {
            // 处理第一种格式：usable_group
            if (response.data.data.usable_group) {
              const usableGroups = response.data.data.usable_group;
              for (const [key, value] of Object.entries(usableGroups)) {
                groups.push({
                  name: key,
                  desc: value,
                  key: key
                });
              }
              success = true;
            }
            // 处理第二种格式：model_group
            else if (response.data.data.model_group) {
              const modelGroups = response.data.data.model_group;
              for (const [key, value] of Object.entries(modelGroups)) {
                groups.push({
                  name: key,
                  desc: value.Description || value.DisplayName || '',
                  key: key
                });
              }
              success = true;
            }
          }
        }
      } catch (error) {
        console.log('尝试获取分组信息失败:', error.message);
      }
      
      if (!success) {
        throw new Error('无法获取分组信息');
      }
      
      // 开始事务
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      try {
        const now = Date.now();
        const createdGroups = [];
        
        // 插入新的分组
        for (const group of groups) {
          // 检查分组是否已存在
          const existingGroup = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM groups WHERE proxyId = ? AND name = ?', [proxyId, group.name], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });
          
          if (!existingGroup) {
            const id = uuidv4();
            await new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO groups (id, proxyId, name, key, remark, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, proxyId, group.name, group.key, group.desc, now, now],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
            
            createdGroups.push({
              id,
              proxyId,
              name: group.name,
              key: group.key,
              remark: group.desc,
              createdAt: now,
              updatedAt: now
            });
          }
          else {
            console.log(`分组 ${group.name} 已存在，跳过创建`);
          }
        }
        
        // 提交事务
        await new Promise((resolve, reject) => {
          db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        return { success: true, count: createdGroups.length, groups: createdGroups };
      } catch (error) {
        // 回滚事务
        await new Promise((resolve) => {
          db.run('ROLLBACK', () => resolve());
        });
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  // 获取模型价格信息
  static async fetchModelPrices(proxyId) {
    try {
      // 获取中转站信息
      const proxy = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM proxies WHERE id = ?', [proxyId], (err, proxy) => {
          if (err) {
            reject(err);
          } else if (!proxy) {
            reject(new Error('中转站不存在'));
          } else {
            resolve(proxy);
          }
        });
      });
      
      // 获取该中转站的所有分组
      const groups = await this.getByProxyId(proxyId);
      
      // 尝试不同的API路径获取模型价格信息
      let modelPrices = {};
      let success = false;
      
      try {
        // 尝试不同的API路径获取模型价格信息
        let apiResponses = [];
        
        // 尝试 /api/pricing 路径
        try {
          const pricingResponse = await axios.get(`${proxy.baseUrl}/api/pricing`, {
            timeout: 5000,
            headers: proxy.cookie ? { 'Cookie': proxy.cookie } : {}
          });
          apiResponses.push(pricingResponse);
        } catch (error) {
          console.log('尝试 /api/pricing 路径失败:', error.message);
        }
        
        // 尝试 /api/models/price 路径
        try {
          const modelsPriceResponse = await axios.get(`${proxy.baseUrl}/api/models/price`, {
            timeout: 5000,
            headers: proxy.cookie ? { 'Cookie': proxy.cookie } : {}
          });
          apiResponses.push(modelsPriceResponse);
        } catch (error) {
          console.log('尝试 /api/models/price 路径失败:', error.message);
        }
        
        // 处理所有响应
        for (const response of apiResponses) {
          // 处理 new-api 格式
          if (response.data && Array.isArray(response.data.data) && response.data.group_ratio) {
            const models = response.data.data;
            const groupRatios = response.data.group_ratio;
            const usableGroups = response.data.usable_group || {};
            
            // 处理每个模型
            for (const model of models) {
              if (model.model_name && model.model_ratio && model.completion_ratio && model.enable_groups) {
                const modelName = model.model_name;
                const modelRatio = model.model_ratio;
                const completionRatio = model.completion_ratio;
                
                // 为每个分组计算价格
                for (const groupKey of model.enable_groups) {
                  if (groupRatios[groupKey]) {
                    const groupRatio = groupRatios[groupKey];
                    
                    // 计算价格
                    const inputPrice = groupRatio * modelRatio * 2;
                    const outputPrice = inputPrice * completionRatio;
                    
                    if (!modelPrices[groupKey]) {
                      modelPrices[groupKey] = {};
                    }
                    
                    modelPrices[groupKey][modelName] = {
                      inputPrice,
                      outputPrice,
                      modelRatio,
                      groupRatio,
                      completionRatio
                    };
                    
                    // 将模型和价格信息保存到数据库
                    const modelWithPrices = {
                      ...model,
                      input_price: inputPrice,
                      output_price: outputPrice,
                      group_ratio: groupRatio,
                      model_ratio: modelRatio,
                      completion_ratio: completionRatio
                    };
                    await this.saveModelToDatabase(groups, groupKey, modelName, modelWithPrices);
                  }
                }
              }
            }
            
            success = Object.keys(modelPrices).length > 0;
            if (success) break; // 如果成功解析到数据，就不处理后续响应
          }
          // 处理 Rix-api 格式
          else if (response.data && response.data.data && response.data.data.model_group && response.data.data.model_completion_ratio) {
            const modelGroups = response.data.data.model_group;
            const modelCompletionRatios = response.data.data.model_completion_ratio;
            const groupSpecial = response.data.data.group_special || {};
            
            // 处理每个分组
            for (const [groupKey, groupInfo] of Object.entries(modelGroups)) {
              if (groupInfo.GroupRatio && groupInfo.ModelPrice) {
                const groupRatio = groupInfo.GroupRatio;
                
                // 处理分组中的每个模型
                for (const [modelName, modelInfo] of Object.entries(groupInfo.ModelPrice)) {
                  if (modelInfo.price !== undefined) {
                    const modelRatio = modelInfo.price;
                    // 获取补全倍率，如果没有则默认为1
                    const completionRatio = modelCompletionRatios[modelName] || 1;
                    
                    // 检查模型是否在当前分组的特殊列表中
                    const isSpecialModel = groupSpecial[modelName] && groupSpecial[modelName].includes(groupKey);
                    
                    // 如果模型不在特殊列表中且特殊列表存在，则跳过
                    if (groupSpecial[modelName] && !isSpecialModel) {
                      continue;
                    }
                    
                    // 计算价格
                    const inputPrice = groupRatio * modelRatio * 2;
                    const outputPrice = inputPrice * completionRatio;
                    
                    if (!modelPrices[groupKey]) {
                      modelPrices[groupKey] = {};
                    }
                    
                    modelPrices[groupKey][modelName] = {
                      inputPrice,
                      outputPrice,
                      modelRatio,
                      groupRatio,
                      completionRatio
                    };
                    
                    // 将模型和价格信息保存到数据库
                    const modelData = {
                      model_name: modelName,
                      model_ratio: modelRatio,
                      completion_ratio: completionRatio,
                      input_price: inputPrice,
                      output_price: outputPrice,
                      group_ratio: groupRatio
                    };
                    await this.saveModelToDatabase(groups, groupKey, modelName, modelData);
                  }
                }
              }
            }
            
            success = Object.keys(modelPrices).length > 0;
            if (success) break; // 如果成功解析到数据，就不处理后续响应
          }
          // 处理 VoAPI 格式
          else if (response.data && response.data.data && response.data.data.models) {
            const models = response.data.data.models;
            
            for (const model of models) {
              if (model.key && model.group_price && model.completion_ratio) {
                const modelName = model.key;
                const completionRatio = model.completion_ratio;
                
                // 处理每个分组的价格
                for (const [groupKey, priceInfo] of Object.entries(model.group_price)) {
                  if (priceInfo.price !== undefined) {
                    // 在VoAPI中，price已经是分组倍率 × 模型倍率的结果
                    const combinedPrice = priceInfo.price;
                    
                    // 计算价格
                    const inputPrice = combinedPrice * 2;
                    const outputPrice = inputPrice * completionRatio;
                    
                    if (!modelPrices[groupKey]) {
                      modelPrices[groupKey] = {};
                    }
                    
                    modelPrices[groupKey][modelName] = {
                      inputPrice,
                      outputPrice,
                      combinedPrice,
                      completionRatio
                    };
                    
                    // 将模型和价格信息保存到数据库
                    // 对于VoAPI格式，模型倍率默认为1，分组倍率为combinedPrice
                    const modelData = {
                      model_name: modelName,
                      model_ratio: 1, // 默认设置为1
                      completion_ratio: completionRatio,
                      group_ratio: combinedPrice, // 将组合价格作为分组倍率
                      input_price: inputPrice,
                      output_price: outputPrice
                    };
                    await this.saveModelToDatabase(groups, groupKey, modelName, modelData);
                  }
                }
              }
            }
            
            success = Object.keys(modelPrices).length > 0;
            if (success) break; // 如果成功解析到数据，就不处理后续响应
          }
          // 处理 shell-api 格式
          else if (response.data && response.data.data && response.data.data.CompletionRatio && response.data.data.GroupRatio && response.data.data.ModelRatio && response.data.data.Models) {
            const completionRatios = response.data.data.CompletionRatio;
            const groupRatios = response.data.data.GroupRatio;
            const modelRatios = response.data.data.ModelRatio;
            const modelsList = response.data.data.Models;
            
            // 尝试获取可用的模型分组信息
            let availableModelsByGroups = {};
            try {
              const availableModelsResponse = await axios.get(`${proxy.baseUrl}/api/user/available_models_by_groups`, {
                timeout: 5000,
                headers: proxy.cookie ? { 'Cookie': proxy.cookie } : {}
              });
              
              if (availableModelsResponse.data && availableModelsResponse.data.data && availableModelsResponse.data.data.groups) {
                const groupsData = availableModelsResponse.data.data.groups;
                
                for (const group of groupsData) {
                  if (group.name && group.models) {
                    availableModelsByGroups[group.name] = {
                      models: group.models,
                      displayName: group.displayName || group.name,
                      group_ratio: group.group_ratio || groupRatios[group.name] || 1.0
                    };
                  }
                }
              }
            } catch (error) {
              console.log('获取可用模型分组信息失败:', error.message);
            }
            
            // 如果没有获取到可用模型分组信息，则使用 GroupRatio 中的分组
            if (Object.keys(availableModelsByGroups).length === 0) {
              for (const [groupKey, groupRatio] of Object.entries(groupRatios)) {
                availableModelsByGroups[groupKey] = {
                  models: modelsList, // 假设所有模型都可用于此分组
                  displayName: groupKey,
                  group_ratio: groupRatio
                };
              }
            }
            
            // 处理每个分组
            for (const [groupKey, groupInfo] of Object.entries(availableModelsByGroups)) {
              const groupRatio = groupInfo.group_ratio;
              const groupModels = groupInfo.models;
              
              // 处理分组中的每个模型
              for (const modelName of groupModels) {
                if (modelRatios[modelName] !== undefined && completionRatios[modelName] !== undefined) {
                  const modelRatio = modelRatios[modelName];
                  const completionRatio = completionRatios[modelName];
                  
                  // 计算价格
                  const inputPrice = groupRatio * modelRatio * 2;
                  const outputPrice = inputPrice * completionRatio;
                  
                  if (!modelPrices[groupKey]) {
                    modelPrices[groupKey] = {};
                  }
                  
                  modelPrices[groupKey][modelName] = {
                    inputPrice,
                    outputPrice,
                    modelRatio,
                    groupRatio,
                    completionRatio
                  };
                  
                  // 将模型和价格信息保存到数据库
                  const modelData = {
                    model_name: modelName,
                    model_ratio: modelRatio,
                    completion_ratio: completionRatio,
                    group_ratio: groupRatio,
                    input_price: inputPrice,
                    output_price: outputPrice
                  };
                  await this.saveModelToDatabase(groups, groupKey, modelName, modelData);
                }
              }
            }
            
            success = Object.keys(modelPrices).length > 0;
            if (success) break; // 如果成功解析到数据，就不处理后续响应
          }
        }
      } catch (error) {
        console.log('尝试获取模型价格失败:', error.message);
      }
      
      if (!success) {
        throw new Error('无法获取模型价格信息');
      }
      
      return { success: true, modelPrices };
    } catch (error) {
      console.error('获取模型价格失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 将模型保存到数据库
  static async saveModelToDatabase(groups, groupKey, modelName, modelData) {
    try {
      // 查找对应的分组
      const group = groups.find(g => g.key === groupKey);
      if (!group) return; // 如果找不到分组，直接返回
      
      const now = Date.now();
      const modelId = modelName;
      const rawData = JSON.stringify(modelData);
      
      // 从modelData中提取相关信息
      let created = null;
      let object = null;
      let owned_by = null;
      
      if (modelData.created) {
        created = modelData.created;
      }
      
      if (modelData.object) {
        object = modelData.object;
      }
      
      if (modelData.owned_by) {
        owned_by = modelData.owned_by;
      }
      
      // 提取价格计算所需的基础数据
      const priceData = {};
      
      // 只保存计算价格所需的基础数据，不保存计算结果
      if (modelData.group_ratio !== undefined) {
        priceData.group_ratio = modelData.group_ratio;
      }
      
      if (modelData.model_ratio !== undefined) {
        priceData.model_ratio = modelData.model_ratio;
      }
      
      if (modelData.completion_ratio !== undefined) {
        priceData.completion_ratio = modelData.completion_ratio;
      }
      
      // 序列化价格数据
      const priceDataJson = JSON.stringify(priceData);
      
      // 检查模型是否已存在
      const existingModel = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM models WHERE groupId = ? AND id = ?', [group.id, modelId], (err, model) => {
          if (err) reject(err);
          else resolve(model);
        });
      });
      
      if (existingModel) {
        // 更新现有模型
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE models SET created = ?, object = ?, owned_by = ?, raw_data = ?, price_data = ?, updatedAt = ? WHERE groupId = ? AND id = ?',
            [created, object, owned_by, rawData, priceDataJson, now, group.id, modelId],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      } else {
        // 创建新模型
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO models (id, groupId, created, object, owned_by, raw_data, price_data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [modelId, group.id, created, object, owned_by, rawData, priceDataJson, now, now],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    } catch (error) {
      console.error('保存模型到数据库失败:', error);
      // 这里我们不抛出错误，因为我们不希望因为保存模型失败而中断整个价格获取过程
    }
  }

  // 获取分组和价格信息
  static async fetchGroupsAndPrices(proxyId) {
    try {
      // 获取中转站信息
      const proxy = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM proxies WHERE id = ?', [proxyId], (err, proxy) => {
          if (err) {
            reject(err);
          } else if (!proxy) {
            reject(new Error('中转站不存在'));
          } else {
            resolve(proxy);
          }
        });
      });

      // 尝试不同的API路径获取分组和价格信息
      let groups = [];
      let modelPrices = {};
      let success = false;

      try {
        // 尝试不同的API路径
        let apiResponses = [];

        // 尝试 /api/pricing 路径
        try {
          const pricingResponse = await axios.get(`${proxy.baseUrl}/api/pricing`, {
            timeout: 5000,
            headers: proxy.cookie ? { 'Cookie': proxy.cookie } : {}
          });
          apiResponses.push(pricingResponse);
        } catch (error) {
          console.log('尝试 /api/pricing 路径失败:', error.message);
        }

        // 尝试 /api/models/price 路径
        try {
          const modelsPriceResponse = await axios.get(`${proxy.baseUrl}/api/models/price`, {
            timeout: 5000,
            headers: proxy.cookie ? { 'Cookie': proxy.cookie } : {}
          });
          apiResponses.push(modelsPriceResponse);
        } catch (error) {
          console.log('尝试 /api/models/price 路径失败:', error.message);
        }

        // 处理所有响应
        for (const response of apiResponses) {
          // 处理 new-api 格式
          if (response.data && Array.isArray(response.data.data) && response.data.group_ratio) {
            const models = response.data.data;
            const groupRatios = response.data.group_ratio;
            const usableGroups = response.data.usable_group || {};

            // 处理分组信息
            for (const [key, value] of Object.entries(usableGroups)) {
              groups.push({
                name: key,
                desc: value,
                key: key,
                group_ratio: groupRatios[key] || 1.0
              });
            }

            // 处理每个模型
            for (const model of models) {
              if (model.model_name && model.model_ratio && model.completion_ratio && model.enable_groups) {
                const modelName = model.model_name;
                const modelRatio = model.model_ratio;
                const completionRatio = model.completion_ratio;

                // 为每个分组计算价格
                for (const groupKey of model.enable_groups) {
                  if (groupRatios[groupKey]) {
                    const groupRatio = groupRatios[groupKey];

                    // 计算价格
                    const inputPrice = groupRatio * modelRatio * 2;
                    const outputPrice = inputPrice * completionRatio;

                    if (!modelPrices[groupKey]) {
                      modelPrices[groupKey] = {};
                    }

                    modelPrices[groupKey][modelName] = {
                      inputPrice,
                      outputPrice,
                      modelRatio,
                      groupRatio,
                      completionRatio
                    };
                  }
                }
              }
            }

            success = groups.length > 0;
            if (success) break;
          }
          // 处理 Rix-api 格式
          else if (response.data && response.data.data && response.data.data.model_group && response.data.data.model_completion_ratio) {
            const modelGroups = response.data.data.model_group;
            const modelCompletionRatios = response.data.data.model_completion_ratio;
            const groupSpecial = response.data.data.group_special || {};

            // 处理分组信息
            for (const [key, groupInfo] of Object.entries(modelGroups)) {
              groups.push({
                name: key,
                desc: groupInfo.Description || groupInfo.DisplayName || '',
                key: key,
                group_ratio: groupInfo.GroupRatio || 1.0
              });

              // 处理分组中的每个模型
              if (groupInfo.GroupRatio && groupInfo.ModelPrice) {
                const groupRatio = groupInfo.GroupRatio;

                for (const [modelName, modelInfo] of Object.entries(groupInfo.ModelPrice)) {
                  if (modelInfo.price !== undefined) {
                    const modelRatio = modelInfo.price;
                    const completionRatio = modelCompletionRatios[modelName] || 1;

                    // 检查模型是否在当前分组的特殊列表中
                    const isSpecialModel = groupSpecial[modelName] && groupSpecial[modelName].includes(key);

                    // 如果模型不在特殊列表中且特殊列表存在，则跳过
                    if (groupSpecial[modelName] && !isSpecialModel) {
                      continue;
                    }

                    // 计算价格
                    const inputPrice = groupRatio * modelRatio * 2;
                    const outputPrice = inputPrice * completionRatio;

                    if (!modelPrices[key]) {
                      modelPrices[key] = {};
                    }

                    modelPrices[key][modelName] = {
                      inputPrice,
                      outputPrice,
                      modelRatio,
                      groupRatio,
                      completionRatio
                    };
                  }
                }
              }
            }

            success = groups.length > 0;
            if (success) break;
          }
          // 处理 VoAPI 格式
          else if (response.data && response.data.data && response.data.data.models) {
            const models = response.data.data.models;

            // 先创建默认分组
            groups.push({
              name: 'default',
              desc: '默认分组',
              key: 'default',
              group_ratio: 1.0
            });

            for (const model of models) {
              if (model.key && model.group_price && model.completion_ratio) {
                const modelName = model.key;
                const completionRatio = model.completion_ratio;

                // 处理每个分组的价格
                for (const [groupKey, priceInfo] of Object.entries(model.group_price)) {
                  if (priceInfo.price !== undefined) {
                    // 在VoAPI中，price已经是分组倍率 × 模型倍率的结果
                    const combinedPrice = priceInfo.price;

                    // 计算价格
                    const inputPrice = combinedPrice * 2;
                    const outputPrice = inputPrice * completionRatio;

                    if (!modelPrices[groupKey]) {
                      modelPrices[groupKey] = {};
                    }

                    modelPrices[groupKey][modelName] = {
                      inputPrice,
                      outputPrice,
                      modelRatio: 1.0, // 默认设置为1
                      groupRatio: combinedPrice,
                      completionRatio
                    };

                    // 如果是新的分组，添加到分组列表
                    if (!groups.find(g => g.key === groupKey)) {
                      groups.push({
                        name: groupKey,
                        desc: '',
                        key: groupKey,
                        group_ratio: combinedPrice
                      });
                    }
                  }
                }
              }
            }

            success = groups.length > 0;
            if (success) break;
          }
          // 处理 shell-api 格式
          else if (response.data && response.data.data && response.data.data.CompletionRatio && response.data.data.GroupRatio && response.data.data.ModelRatio && response.data.data.Models) {
            const completionRatios = response.data.data.CompletionRatio;
            const groupRatios = response.data.data.GroupRatio;
            const modelRatios = response.data.data.ModelRatio;
            const modelsList = response.data.data.Models;

            // 尝试获取可用的模型分组信息
            let availableModelsByGroups = {};
            try {
              const availableModelsResponse = await axios.get(`${proxy.baseUrl}/api/user/available_models_by_groups`, {
                timeout: 5000,
                headers: proxy.cookie ? { 'Cookie': proxy.cookie } : {}
              });

              if (availableModelsResponse.data && availableModelsResponse.data.data && availableModelsResponse.data.data.groups) {
                const groupsData = availableModelsResponse.data.data.groups;

                for (const group of groupsData) {
                  if (group.name && group.models) {
                    availableModelsByGroups[group.name] = {
                      models: group.models,
                      displayName: group.displayName || group.name,
                      group_ratio: group.group_ratio || groupRatios[group.name] || 1.0
                    };
                  }
                }
              }
            } catch (error) {
              console.log('获取可用模型分组信息失败:', error.message);
            }

            // 如果没有获取到可用模型分组信息，则使用 GroupRatio 中的分组
            if (Object.keys(availableModelsByGroups).length === 0) {
              for (const [groupKey, groupRatio] of Object.entries(groupRatios)) {
                availableModelsByGroups[groupKey] = {
                  models: modelsList, // 假设所有模型都可用于此分组
                  displayName: groupKey,
                  group_ratio: groupRatio
                };
              }
            }

            // 处理每个分组
            for (const [groupKey, groupInfo] of Object.entries(availableModelsByGroups)) {
              const groupRatio = groupInfo.group_ratio;
              const groupModels = groupInfo.models;

              // 处理分组中的每个模型
              for (const modelName of groupModels) {
                if (modelRatios[modelName] !== undefined && completionRatios[modelName] !== undefined) {
                  const modelRatio = modelRatios[modelName];
                  const completionRatio = completionRatios[modelName];

                  // 计算价格
                  const inputPrice = groupRatio * modelRatio * 2;
                  const outputPrice = inputPrice * completionRatio;

                  if (!modelPrices[groupKey]) {
                    modelPrices[groupKey] = {};
                  }

                  modelPrices[groupKey][modelName] = {
                    inputPrice,
                    outputPrice,
                    modelRatio,
                    groupRatio,
                    completionRatio
                  };

                  // 如果是新的分组，添加到分组列表
                  if (!groups.find(g => g.key === groupKey)) {
                    groups.push({
                      name: groupKey,
                      desc: '',
                      key: groupKey,
                      group_ratio: groupRatio
                    });
                  }
                }
              }
            }

            success = groups.length > 0;
            if (success) break;
          }
        }
      } catch (error) {
        console.log('尝试获取分组和价格信息失败:', error.message);
      }

      if (!success) {
        throw new Error('无法获取分组和价格信息');
      }

      // 开始事务
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      try {
        const now = Date.now();
        const createdGroups = [];

        // 插入或更新分组
        for (const group of groups) {
          // 检查分组是否已存在
          const existingGroup = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM groups WHERE proxyId = ? AND name = ?', [proxyId, group.name], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });

          let groupId;
          if (!existingGroup) {
            groupId = uuidv4();
            await new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO groups (id, proxyId, name, key, remark, group_ratio, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [groupId, proxyId, group.name, group.key, group.desc, group.group_ratio, now, now],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });

            createdGroups.push({
              id: groupId,
              proxyId,
              name: group.name,
              key: group.key,
              remark: group.desc,
              group_ratio: group.group_ratio,
              createdAt: now,
              updatedAt: now
            });
          } else {
            groupId = existingGroup.id;
            // 更新现有分组的倍率和备注
            await new Promise((resolve, reject) => {
              db.run(
                'UPDATE groups SET group_ratio = ?, remark = ?, updatedAt = ? WHERE id = ?',
                [group.group_ratio, group.desc, now, groupId],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          }

          // 处理该分组下的所有模型
          if (modelPrices[group.key]) {
            for (const [modelName, priceInfo] of Object.entries(modelPrices[group.key])) {
              const modelId = modelName;

              // 检查模型是否已存在
              const existingModel = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM models WHERE groupId = ? AND id = ?', [groupId, modelId], (err, model) => {
                  if (err) reject(err);
                  else resolve(model);
                });
              });

              const modelData = {
                model_ratio: priceInfo.modelRatio,
                completion_ratio: priceInfo.completionRatio,
                raw_data: JSON.stringify({
                  input_price: priceInfo.inputPrice,
                  output_price: priceInfo.outputPrice,
                  ...priceInfo
                })
              };

              if (existingModel) {
                // 更新现有模型
                await new Promise((resolve, reject) => {
                  db.run(
                    'UPDATE models SET model_ratio = ?, completion_ratio = ?, raw_data = ?, updatedAt = ? WHERE groupId = ? AND id = ?',
                    [modelData.model_ratio, modelData.completion_ratio, modelData.raw_data, now, groupId, modelId],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });
              } else {
                // 创建新模型
                await new Promise((resolve, reject) => {
                  db.run(
                    'INSERT INTO models (id, groupId, model_ratio, completion_ratio, raw_data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [modelId, groupId, modelData.model_ratio, modelData.completion_ratio, modelData.raw_data, now, now],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });
              }
            }
          }
        }

        // 提交事务
        await new Promise((resolve, reject) => {
          db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        return { success: true, count: createdGroups.length, groups: createdGroups };
      } catch (error) {
        // 回滚事务
        await new Promise((resolve) => {
          db.run('ROLLBACK', () => resolve());
        });
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = GroupModel;
