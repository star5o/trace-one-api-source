const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

class TraceModel {
  // 创建溯源记录
  static create(traceData) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const now = Date.now();
      
      const {
        traceId,
        baseUrl,
        key,
        model,
        ip,
        ipPath,
        userAgent,
        headers,
        requestBody,
        responseBody,
        requestTime,
        responseTime,
        groupName
      } = traceData;
      
      db.run(
        `INSERT INTO traces (
          id, traceId, baseUrl, key, model, ip, ipPath, userAgent, headers, 
          requestBody, responseBody, requestTime, responseTime, createdAt, groupName
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          traceId, 
          baseUrl, 
          key, 
          model, 
          ip, 
          ipPath || ip, 
          userAgent, 
          headers ? JSON.stringify(headers) : null,
          requestBody ? JSON.stringify(requestBody) : null,
          responseBody ? JSON.stringify(responseBody) : null,
          requestTime || now, 
          responseTime || null, 
          now,
          groupName || ''
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id,
              traceId,
              baseUrl,
              key,
              model,
              ip,
              ipPath: ipPath || ip,
              userAgent,
              headers: headers ? JSON.stringify(headers) : null,
              requestBody: requestBody ? JSON.stringify(requestBody) : null,
              responseBody: responseBody ? JSON.stringify(responseBody) : null,
              requestTime: requestTime || now,
              responseTime: responseTime || null,
              createdAt: now,
              groupName: groupName || ''
            });
          }
        }
      );
    });
  }

  // 更新溯源记录（例如添加响应时间和响应体）
  static update(traceId, updateData) {
    return new Promise((resolve, reject) => {
      // 构建更新字段和参数
      const updateFields = [];
      const updateParams = [];
      
      if (updateData.responseTime !== undefined) {
        updateFields.push('responseTime = ?');
        updateParams.push(updateData.responseTime);
      }
      
      if (updateData.responseBody !== undefined) {
        updateFields.push('responseBody = ?');
        updateParams.push(updateData.responseBody ? JSON.stringify(updateData.responseBody) : null);
      }
      
      if (updateData.ipPath !== undefined) {
        updateFields.push('ipPath = ?');
        updateParams.push(updateData.ipPath);
      }
      
      // 如果没有要更新的字段，直接返回
      if (updateFields.length === 0) {
        return resolve({ traceId });
      }
      
      // 添加traceId作为WHERE条件的参数
      updateParams.push(traceId);
      
      db.run(
        `UPDATE traces SET ${updateFields.join(', ')} WHERE traceId = ?`,
        updateParams,
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error('溯源记录不存在'));
          } else {
            resolve({ traceId, ...updateData });
          }
        }
      );
    });
  }

  // 删除溯源记录
  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM traces WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          reject(new Error('溯源记录不存在'));
        } else {
          resolve({ id, deleted: true });
        }
      });
    });
  }

  // 获取单个溯源记录
  static getById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM traces WHERE id = ?', [id], (err, trace) => {
        if (err) {
          reject(err);
        } else if (!trace) {
          reject(new Error('溯源记录不存在'));
        } else {
          // 解析JSON字段
          if (trace.headers) {
            try {
              trace.headers = JSON.parse(trace.headers);
            } catch (e) {
              // 如果解析失败，保持原样
            }
          }
          if (trace.requestBody) {
            try {
              trace.requestBody = JSON.parse(trace.requestBody);
            } catch (e) {
              // 如果解析失败，保持原样
            }
          }
          if (trace.responseBody) {
            try {
              trace.responseBody = JSON.parse(trace.responseBody);
            } catch (e) {
              // 如果解析失败，保持原样
            }
          }
          resolve(trace);
        }
      });
    });
  }

  // 获取溯源记录列表（分页）
  static getAll(page = 1, limit = 10, groupName = null) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      // 构建查询条件
      let countQuery = 'SELECT COUNT(*) as total FROM traces';
      let dataQuery = 'SELECT * FROM traces';
      const queryParams = [];
      
      // 如果指定了分组名称，添加过滤条件
      if (groupName) {
        countQuery += ' WHERE groupName = ?';
        dataQuery += ' WHERE groupName = ?';
        queryParams.push(groupName);
      }
      
      // 添加排序和分页
      dataQuery += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
      
      // 获取总记录数
      db.get(countQuery, groupName ? [groupName] : [], (err, result) => {
        if (err) {
          reject(err);
        } else {
          const total = result.total;
          
          // 获取分页数据
          const finalParams = [...queryParams, limit, offset];
          db.all(
            dataQuery,
            finalParams,
            (err, traces) => {
              if (err) {
                reject(err);
              } else {
                // 解析JSON字段
                traces.forEach(trace => {
                  if (trace.headers) {
                    try {
                      trace.headers = JSON.parse(trace.headers);
                    } catch (e) {
                      // 如果解析失败，保持原样
                    }
                  }
                  if (trace.requestBody) {
                    try {
                      trace.requestBody = JSON.parse(trace.requestBody);
                    } catch (e) {
                      // 如果解析失败，保持原样
                    }
                  }
                  if (trace.responseBody) {
                    try {
                      trace.responseBody = JSON.parse(trace.responseBody);
                    } catch (e) {
                      // 如果解析失败，保持原样
                    }
                  }
                });
                
                resolve({
                  items: traces,
                  total,
                  page,
                  limit
                });
              }
            }
          );
        }
      });
    });
  }

  // 根据模型ID获取溯源记录
  static getByModel(modelId, page = 1, limit = 10, groupName = null) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      // 构建查询条件和参数
      let countQuery = 'SELECT COUNT(*) as total FROM traces WHERE model = ?';
      let dataQuery = 'SELECT * FROM traces WHERE model = ?';
      const queryParams = [modelId];
      
      // 如果指定了分组名称，添加过滤条件
      if (groupName) {
        countQuery += ' AND groupName = ?';
        dataQuery += ' AND groupName = ?';
        queryParams.push(groupName);
      }
      
      // 获取总记录数
      db.get(countQuery, queryParams, (err, result) => {
        if (err) {
          reject(err);
        } else {
          const total = result.total;
          
          // 添加排序和分页
          dataQuery += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
          
          // 获取分页数据
          db.all(
            dataQuery,
            [...queryParams, limit, offset],
            (err, traces) => {
              if (err) {
                reject(err);
              } else {
                // 解析JSON字段
                traces.forEach(trace => {
                  if (trace.headers) {
                    try {
                      trace.headers = JSON.parse(trace.headers);
                    } catch (e) {
                      // 如果解析失败，保持原样
                    }
                  }
                  if (trace.requestBody) {
                    try {
                      trace.requestBody = JSON.parse(trace.requestBody);
                    } catch (e) {
                      // 如果解析失败，保持原样
                    }
                  }
                  if (trace.responseBody) {
                    try {
                      trace.responseBody = JSON.parse(trace.responseBody);
                    } catch (e) {
                      // 如果解析失败，保持原样
                    }
                  }
                });
                
                resolve({
                  items: traces,
                  total,
                  page,
                  limit
                });
              }
            }
          );
        }
      });
    });
  }

  // 根据traceId获取溯源记录
  static getByTraceId(traceId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM traces WHERE traceId = ?', [traceId], (err, trace) => {
        if (err) {
          reject(err);
        } else if (!trace) {
          resolve(null); // 返回null而不是抛出错误，因为可能尚未创建记录
        } else {
          // 解析JSON字段
          if (trace.headers) {
            try {
              trace.headers = JSON.parse(trace.headers);
            } catch (e) {
              // 如果解析失败，保持原样
            }
          }
          if (trace.requestBody) {
            try {
              trace.requestBody = JSON.parse(trace.requestBody);
            } catch (e) {
              // 如果解析失败，保持原样
            }
          }
          if (trace.responseBody) {
            try {
              trace.responseBody = JSON.parse(trace.responseBody);
            } catch (e) {
              // 如果解析失败，保持原样
            }
          }
          resolve(trace);
        }
      });
    });
  }
}

module.exports = TraceModel;
