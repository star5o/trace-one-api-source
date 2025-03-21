const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// 辅助函数：发送带有统一头信息的 HTTP 请求
async function makeRequest(url, options = {}, proxy = null) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': url.split('/api')[0],
    'Origin': url.split('/api')[0],
    ...options.headers
  };
  
  if (proxy && proxy.cookie) {
    headers['Cookie'] = proxy.cookie;
  }
  
  try {
    return await axios.get(url, {
      timeout: options.timeout || 5000,
      headers: headers,
      ...options
    });
  } catch (error) {
    console.log(`请求 ${url} 失败:`, error.message);
    if (error.response) {
      console.log('错误响应状态:', error.response.status);
      try {
        console.log('错误响应数据:', JSON.stringify(error.response.data).substring(0, 200) + '...');
      } catch (e) {
        console.log('无法解析错误响应数据');
      }
    }
    throw error;
  }
}

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
      const response = await makeRequest(`${proxy.baseUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${group.key}`
        }
      }, proxy);
      
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
      let errorDetails = {
        apiErrors: [],
        responseErrors: []
      };

      try {
        // 尝试不同的API路径
        let apiResponses = [];

        // 尝试 /api/pricing 路径
        try {
          console.log(`尝试获取 ${proxy.baseUrl}/api/pricing 数据...`);
          const pricingResponse = await makeRequest(`${proxy.baseUrl}/api/pricing`, {}, proxy);
          apiResponses.push(pricingResponse);
          console.log(`成功获取 ${proxy.baseUrl}/api/pricing 响应`);
        } catch (error) {
          const errorMsg = `尝试 /api/pricing 路径失败: ${error.message}`;
          console.log(errorMsg);
          errorDetails.apiErrors.push(errorMsg);
        }

        // 尝试 /api/models/price 路径
        try {
          console.log(`尝试获取 ${proxy.baseUrl}/api/models/price 数据...`);
          const modelsPriceResponse = await makeRequest(`${proxy.baseUrl}/api/models/price`, {}, proxy);
          apiResponses.push(modelsPriceResponse);
          console.log(`成功获取 ${proxy.baseUrl}/api/models/price 响应`);
        } catch (error) {
          const errorMsg = `尝试 /api/models/price 路径失败: ${error.message}`;
          console.log(errorMsg);
          errorDetails.apiErrors.push(errorMsg);
        }

        // 尝试 /api/v1/pricing 路径
        try {
          console.log(`尝试获取 ${proxy.baseUrl}/api/v1/pricing 数据...`);
          const v1PricingResponse = await makeRequest(`${proxy.baseUrl}/api/v1/pricing`, {}, proxy);
          apiResponses.push(v1PricingResponse);
          console.log(`成功获取 ${proxy.baseUrl}/api/v1/pricing 响应`);
        } catch (error) {
          const errorMsg = `尝试 /api/v1/pricing 路径失败: ${error.message}`;
          console.log(errorMsg);
          errorDetails.apiErrors.push(errorMsg);
        }

        // 处理所有响应
        for (const response of apiResponses) {
          try {
            // 处理 new-api 格式
            if (response.data && Array.isArray(response.data.data) && response.data.group_ratio) {
              console.log('检测到 new-api 格式数据');
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

              // 如果没有 usable_group，但有 group_ratio，则使用 group_ratio 的键作为分组
              if (Object.keys(usableGroups).length === 0 && Object.keys(groupRatios).length > 0) {
                console.log('未找到 usable_group，使用 group_ratio 的键作为分组');
                for (const [key, ratio] of Object.entries(groupRatios)) {
                  groups.push({
                    name: key,
                    desc: `分组 ${key}`,
                    key: key,
                    group_ratio: ratio
                  });
                }
              }

              // 处理每个模型
              for (const model of models) {
                if (model.model_name && model.model_ratio && model.completion_ratio) {
                  const modelName = model.model_name;
                  const modelRatio = model.model_ratio;
                  const completionRatio = model.completion_ratio;

                  // 确保 enable_groups 是数组，如果不存在则使用 groupRatios 的所有键
                  const enableGroups = Array.isArray(model.enable_groups) && model.enable_groups.length > 0 
                    ? model.enable_groups 
                    : Object.keys(groupRatios);
                  
                  // 为每个分组计算价格
                  for (const groupKey of enableGroups) {
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
              if (success) {
                console.log(`成功解析 new-api 格式数据，找到 ${groups.length} 个分组`);
                break;
              } else {
                const errorMsg = '解析 new-api 格式数据失败：未找到任何分组';
                console.log(errorMsg);
                errorDetails.responseErrors.push(errorMsg);
              }
            }
            // 处理 Rix-api 格式
            else if (response.data && response.data.data && response.data.data.model_group && response.data.data.model_completion_ratio) {
              console.log('检测到 Rix-api 格式数据');
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
              if (success) {
                console.log(`成功解析 Rix-api 格式数据，找到 ${groups.length} 个分组`);
                break;
              } else {
                const errorMsg = '解析 Rix-api 格式数据失败：未找到任何分组';
                console.log(errorMsg);
                errorDetails.responseErrors.push(errorMsg);
              }
            }
            // 处理 VoAPI 格式
            else if (response.data && response.data.data && response.data.data.models) {
              console.log('检测到 VoAPI 格式数据');
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
              if (success) {
                console.log(`成功解析 VoAPI 格式数据，找到 ${groups.length} 个分组`);
                break;
              } else {
                const errorMsg = '解析 VoAPI 格式数据失败：未找到任何分组';
                console.log(errorMsg);
                errorDetails.responseErrors.push(errorMsg);
              }
            }
            // 处理 shell-api 格式
            else if (response.data && response.data.data && response.data.data.CompletionRatio && response.data.data.GroupRatio && response.data.data.ModelRatio && response.data.data.Models) {
              console.log('检测到 shell-api 格式数据');
              const completionRatios = response.data.data.CompletionRatio;
              const groupRatios = response.data.data.GroupRatio;
              const modelRatios = response.data.data.ModelRatio;
              const modelsList = response.data.data.Models;
              
              // 尝试获取可用的模型分组信息
              let availableModelsByGroups = {};
              try {
                const availableModelsResponse = await makeRequest(`${proxy.baseUrl}/api/user/available_models_by_groups`, {}, proxy);
                
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
              if (success) {
                console.log(`成功解析 shell-api 格式数据，找到 ${groups.length} 个分组`);
                break;
              } else {
                const errorMsg = '解析 shell-api 格式数据失败：未找到任何分组';
                console.log(errorMsg);
                errorDetails.responseErrors.push(errorMsg);
              }
            } else {
              // 记录无法识别的响应格式
              const responseStructure = this.describeResponseStructure(response.data);
              const errorMsg = `无法识别的响应格式: ${responseStructure}`;
              console.log(errorMsg);
              errorDetails.responseErrors.push(errorMsg);
            }
          } catch (parseError) {
            const errorMsg = `解析响应数据时出错: ${parseError.message}`;
            console.log(errorMsg);
            errorDetails.responseErrors.push(errorMsg);
          }
        }
      } catch (error) {
        console.log('尝试获取分组和价格信息失败:', error.message);
        errorDetails.apiErrors.push(`获取数据过程中发生错误: ${error.message}`);
      }

      if (!success) {
        // 构建详细的错误信息
        let errorMessage = '无法获取分组和价格信息。';
        
        if (errorDetails.apiErrors.length > 0) {
          errorMessage += `\n\nAPI请求错误:\n${errorDetails.apiErrors.join('\n')}`;
        }
        
        if (errorDetails.responseErrors.length > 0) {
          errorMessage += `\n\n响应解析错误:\n${errorDetails.responseErrors.join('\n')}`;
        }
        
        if (apiResponses.length > 0) {
          errorMessage += '\n\n已收到响应但无法解析。请检查API格式是否受支持。';
        } else {
          errorMessage += '\n\n未收到任何有效响应。请检查网络连接和API地址是否正确。';
        }
        
        throw new Error(errorMessage);
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

  // 辅助方法：描述响应数据结构
  static describeResponseStructure(data) {
    if (!data) return '空响应';
    
    try {
      const structure = {};
      
      // 检查顶层属性
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (Array.isArray(value)) {
          structure[key] = `数组[${value.length}]`;
        } else if (typeof value === 'object' && value !== null) {
          structure[key] = '对象';
        } else {
          structure[key] = typeof value;
        }
      });
      
      // 特别检查常见的数据结构
      if (data.data) {
        if (Array.isArray(data.data)) {
          structure['data详情'] = `数组[${data.data.length}]`;
        } else if (typeof data.data === 'object') {
          structure['data详情'] = Object.keys(data.data).join(', ');
        }
      }
      
      return JSON.stringify(structure);
    } catch (e) {
      return '无法解析响应结构';
    }
  }
}

module.exports = GroupModel;
