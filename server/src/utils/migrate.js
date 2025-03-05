const { db } = require('../models/database');
const fs = require('fs');
const path = require('path');

// 迁移数据库
const migrateDatabase = () => {
  return new Promise((resolve, reject) => {
    console.log('开始数据库迁移...');
    
    // 检查traces表是否存在requestBody和responseBody列
    db.get("PRAGMA table_info(traces)", [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      
      // 获取traces表的列信息
      db.all("PRAGMA table_info(traces)", [], (err, columns) => {
        if (err) {
          return reject(err);
        }
        
        // 检查是否有requestBody和responseBody列
        const hasRequestBody = columns.some(col => col.name === 'requestBody');
        const hasResponseBody = columns.some(col => col.name === 'responseBody');
        
        if (!hasRequestBody || !hasResponseBody) {
          console.log('需要添加requestBody和responseBody列...');
          
          // 备份数据
          db.all("SELECT * FROM traces", [], (err, traces) => {
            if (err) {
              return reject(err);
            }
            
            // 将数据保存到临时文件
            const backupPath = path.join(__dirname, '../../data/traces_backup.json');
            fs.writeFileSync(backupPath, JSON.stringify(traces, null, 2));
            console.log(`数据已备份到 ${backupPath}`);
            
            // 重命名旧表
            db.run("ALTER TABLE traces RENAME TO traces_old", (err) => {
              if (err) {
                return reject(err);
              }
              
              // 创建新表
              db.run(`
                CREATE TABLE traces (
                  id TEXT PRIMARY KEY,
                  traceId TEXT NOT NULL,
                  baseUrl TEXT NOT NULL,
                  key TEXT NOT NULL,
                  model TEXT NOT NULL,
                  ip TEXT,
                  userAgent TEXT,
                  headers TEXT,
                  requestBody TEXT,
                  responseBody TEXT,
                  requestTime INTEGER,
                  responseTime INTEGER,
                  createdAt INTEGER NOT NULL
                )
              `, (err) => {
                if (err) {
                  return reject(err);
                }
                
                // 从旧表复制数据到新表
                db.all("SELECT * FROM traces_old", [], (err, oldTraces) => {
                  if (err) {
                    return reject(err);
                  }
                  
                  // 开始事务
                  db.run("BEGIN TRANSACTION", (err) => {
                    if (err) {
                      return reject(err);
                    }
                    
                    let completed = 0;
                    
                    if (oldTraces.length === 0) {
                      // 如果没有数据，直接提交事务
                      db.run("COMMIT", (err) => {
                        if (err) {
                          return reject(err);
                        }
                        
                        // 删除旧表
                        db.run("DROP TABLE traces_old", (err) => {
                          if (err) {
                            return reject(err);
                          }
                          
                          console.log('数据库迁移完成');
                          resolve();
                        });
                      });
                      return;
                    }
                    
                    // 插入数据到新表
                    oldTraces.forEach((trace) => {
                      db.run(
                        `INSERT INTO traces (
                          id, traceId, baseUrl, key, model, ip, userAgent, headers, 
                          requestBody, responseBody, requestTime, responseTime, createdAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                          trace.id, 
                          trace.traceId, 
                          trace.baseUrl, 
                          trace.key, 
                          trace.model, 
                          trace.ip, 
                          trace.userAgent, 
                          trace.headers,
                          null, // requestBody
                          null, // responseBody
                          trace.requestTime, 
                          trace.responseTime, 
                          trace.createdAt
                        ],
                        function(err) {
                          if (err) {
                            db.run("ROLLBACK", () => {
                              reject(err);
                            });
                            return;
                          }
                          
                          completed++;
                          
                          if (completed === oldTraces.length) {
                            // 提交事务
                            db.run("COMMIT", (err) => {
                              if (err) {
                                return reject(err);
                              }
                              
                              // 删除旧表
                              db.run("DROP TABLE traces_old", (err) => {
                                if (err) {
                                  return reject(err);
                                }
                                
                                console.log('数据库迁移完成');
                                resolve();
                              });
                            });
                          }
                        }
                      );
                    });
                  });
                });
              });
            });
          });
        } else {
          console.log('数据库表结构已是最新，无需迁移');
          
          // 检查traces表是否存在ipPath列
          db.all("PRAGMA table_info(traces)", [], (err, columns) => {
            if (err) {
              return reject(err);
            }
            
            // 检查是否有ipPath列
            const hasIpPath = columns.some(col => col.name === 'ipPath');
            
            if (!hasIpPath) {
              console.log('需要添加ipPath列...');
              
              // 添加ipPath列
              db.run("ALTER TABLE traces ADD COLUMN ipPath TEXT", (err) => {
                if (err) {
                  console.error('添加ipPath列失败:', err);
                  return reject(err);
                }
                
                console.log('成功添加ipPath列');
                
                // 更新现有记录，将ip值复制到ipPath
                db.run("UPDATE traces SET ipPath = ip WHERE ipPath IS NULL", (err) => {
                  if (err) {
                    console.error('更新ipPath值失败:', err);
                    return reject(err);
                  }
                  
                  console.log('成功更新ipPath值');
                  resolve();
                });
              });
            } else {
              console.log('ipPath列已存在，无需迁移');
              resolve();
            }
          });
        }
      });
    });
  });
};

module.exports = {
  migrateDatabase
};
