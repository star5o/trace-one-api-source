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
        userAgent,
        headers,
        requestBody,
        responseBody,
        requestTime,
        responseTime
      } = traceData;
      
      db.run(
        `INSERT INTO traces (
          id, traceId, baseUrl, key, model, ip, userAgent, headers, 
          requestBody, responseBody, requestTime, responseTime, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          traceId, 
          baseUrl, 
          key, 
          model, 
          ip, 
          userAgent, 
          headers ? JSON.stringify(headers) : null,
          requestBody ? JSON.stringify(requestBody) : null,
          responseBody ? JSON.stringify(responseBody) : null,
          requestTime || now, 
          responseTime || null, 
          now
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
              userAgent,
              headers: headers ? JSON.stringify(headers) : null,
              requestBody: requestBody ? JSON.stringify(requestBody) : null,
              responseBody: responseBody ? JSON.stringify(responseBody) : null,
              requestTime: requestTime || now,
              responseTime: responseTime || null,
              createdAt: now
            });
          }
        }
      );
    });
  }

  // 更新溯源记录（例如添加响应时间和响应体）
  static update(traceId, updateData) {
    return new Promise((resolve, reject) => {
      const { responseTime, responseBody } = updateData;
      
      db.run(
        'UPDATE traces SET responseTime = ?, responseBody = ? WHERE traceId = ?',
        [responseTime, responseBody ? JSON.stringify(responseBody) : null, traceId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new Error('溯源记录不存在'));
          } else {
            resolve({ traceId, responseTime, responseBody });
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
  static getAll(page = 1, limit = 10) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      // 获取总记录数
      db.get('SELECT COUNT(*) as total FROM traces', [], (err, result) => {
        if (err) {
          reject(err);
        } else {
          const total = result.total;
          
          // 获取分页数据
          db.all(
            'SELECT * FROM traces ORDER BY createdAt DESC LIMIT ? OFFSET ?',
            [limit, offset],
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
  static getByModel(modelId, page = 1, limit = 10) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      // 获取总记录数
      db.get('SELECT COUNT(*) as total FROM traces WHERE model = ?', [modelId], (err, result) => {
        if (err) {
          reject(err);
        } else {
          const total = result.total;
          
          // 获取分页数据
          db.all(
            'SELECT * FROM traces WHERE model = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
            [modelId, limit, offset],
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
