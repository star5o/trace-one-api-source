const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

class ProxyModel {
  // 创建中转站
  static create(name, baseUrl, exchangeRate = 7.0) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const now = Date.now();
      
      db.run(
        'INSERT INTO proxies (id, name, baseUrl, exchangeRate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, baseUrl, exchangeRate, now, now],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id,
              name,
              baseUrl,
              exchangeRate,
              createdAt: now,
              updatedAt: now
            });
          }
        }
      );
    });
  }

  // 更新中转站
  static update(id, name, baseUrl, exchangeRate) {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      
      db.run(
        'UPDATE proxies SET name = ?, baseUrl = ?, exchangeRate = ?, updatedAt = ? WHERE id = ?',
        [name, baseUrl, exchangeRate, now, id],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error('中转站不存在'));
          } else {
            resolve({
              id,
              name,
              baseUrl,
              exchangeRate,
              updatedAt: now
            });
          }
        }
      );
    });
  }

  // 删除中转站
  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM proxies WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('中转站不存在'));
        } else {
          resolve({ id });
        }
      });
    });
  }

  // 获取单个中转站
  static getById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM proxies WHERE id = ?', [id], async (err, proxy) => {
        if (err) {
          reject(err);
        } else if (!proxy) {
          reject(new Error('中转站不存在'));
        } else {
          try {
            // 获取该中转站的所有分组
            const groups = await new Promise((resolve, reject) => {
              db.all('SELECT * FROM groups WHERE proxyId = ?', [id], (err, groups) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(groups);
                }
              });
            });

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
                      
                      // 获取价格信息
                      if (model.price_data) {
                        try {
                          const priceData = JSON.parse(model.price_data);
                          
                          // 计算输入和输出价格
                          if (priceData.group_ratio !== undefined && priceData.model_ratio !== undefined && priceData.completion_ratio !== undefined) {
                            const inputPrice = priceData.group_ratio * priceData.model_ratio * 2;
                            const outputPrice = inputPrice * priceData.completion_ratio;
                            
                            // 保存价格信息到模型对象
                            model.prices = {
                              ...priceData,
                              inputPrice,
                              outputPrice
                            };
                            
                            // 为了兼容性，同时保存下划线格式的字段名
                            model.input_price = inputPrice;
                            model.output_price = outputPrice;
                          } else {
                            model.prices = priceData;
                          }
                        } catch (e) {
                          console.error('解析价格数据失败:', e);
                        }
                      }
                    });
                    resolve(models);
                  }
                });
              });
            }

            proxy.groups = groups;
            resolve(proxy);
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  // 清空中转站的分组和模型
  static clearGroupsAndModels(id) {
    return new Promise(async (resolve, reject) => {
      try {
        // 首先检查中转站是否存在
        const proxy = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM proxies WHERE id = ?', [id], (err, proxy) => {
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
        const groups = await new Promise((resolve, reject) => {
          db.all('SELECT id FROM groups WHERE proxyId = ?', [id], (err, groups) => {
            if (err) {
              reject(err);
            } else {
              resolve(groups);
            }
          });
        });
        
        // 开始事务
        await new Promise((resolve, reject) => {
          db.run('BEGIN TRANSACTION', err => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        try {
          // 删除每个分组的模型
          for (const group of groups) {
            await new Promise((resolve, reject) => {
              db.run('DELETE FROM models WHERE groupId = ?', [group.id], err => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
          
          // 删除所有分组
          await new Promise((resolve, reject) => {
            db.run('DELETE FROM groups WHERE proxyId = ?', [id], err => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          // 提交事务
          await new Promise((resolve, reject) => {
            db.run('COMMIT', err => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          resolve({ message: '分组和模型清空成功' });
        } catch (error) {
          // 回滚事务
          await new Promise((resolve) => {
            db.run('ROLLBACK', () => resolve());
          });
          throw error;
        }
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // 获取所有中转站
  static getAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM proxies ORDER BY createdAt DESC', async (err, proxies) => {
        if (err) {
          reject(err);
        } else {
          try {
            // 为每个中转站获取分组和模型
            for (const proxy of proxies) {
              // 获取该中转站的所有分组
              const groups = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM groups WHERE proxyId = ?', [proxy.id], (err, groups) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(groups);
                  }
                });
              });

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
                        
                        // 获取价格信息
                        if (model.price_data) {
                          try {
                            const priceData = JSON.parse(model.price_data);
                            
                            // 计算输入和输出价格
                            if (priceData.group_ratio !== undefined && priceData.model_ratio !== undefined && priceData.completion_ratio !== undefined) {
                              const inputPrice = priceData.group_ratio * priceData.model_ratio * 2;
                              const outputPrice = inputPrice * priceData.completion_ratio;
                              
                              // 保存价格信息到模型对象
                              model.prices = {
                                ...priceData,
                                inputPrice,
                                outputPrice
                              };
                              
                              // 为了兼容性，同时保存下划线格式的字段名
                              model.input_price = inputPrice;
                              model.output_price = outputPrice;
                            } else {
                              model.prices = priceData;
                            }
                          } catch (e) {
                            console.error('解析价格数据失败:', e);
                          }
                        }
                      });
                      resolve(models);
                    }
                  });
                });
              }

              proxy.groups = groups;
            }

            resolve(proxies);
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  // 创建分组
  static createGroup(proxyId, name, key, remark = null) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const now = Date.now();
      
      db.run(
        'INSERT INTO groups (id, proxyId, name, key, remark, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, proxyId, name, key, remark, now, now],
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
              createdAt: now,
              updatedAt: now
            });
          }
        }
      );
    });
  }

  // 更新分组
  static updateGroup(id, name, key, remark = null) {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      
      db.run(
        'UPDATE groups SET name = ?, key = ?, remark = ?, updatedAt = ? WHERE id = ?',
        [name, key, remark, now, id],
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
              updatedAt: now
            });
          }
        }
      );
    });
  }
}

module.exports = ProxyModel;
