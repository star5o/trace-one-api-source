const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

class GroupModel {
  // 创建分组
  static create(proxyId, name, key, remark = null) {
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
  static update(id, name, key, remark = null) {
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
}

module.exports = GroupModel;
