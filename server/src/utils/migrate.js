const { db } = require('../models/database');
const fs = require('fs');
const path = require('path');

// 添加列的通用函数
const addColumnIfNotExists = async (tableName, columnName, columnType) => {
  return new Promise((resolve, reject) => {
    // 检查列是否存在
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error(`检查${tableName}表结构失败:`, err);
        return reject(err);
      }
      
      // 检查是否有指定列
      const hasColumn = columns.some(col => col.name === columnName);
      
      if (!hasColumn) {
        console.log(`需要添加${columnName}列到${tableName}表...`);
        
        // 添加列
        db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`, (err) => {
          if (err) {
            console.error(`添加${columnName}列失败:`, err);
            return reject(err);
          }
          
          console.log(`成功添加${columnName}列到${tableName}表`);
          resolve(true); // 表示已添加列
        });
      } else {
        console.log(`${columnName}列已存在于${tableName}表`);
        resolve(false); // 表示列已存在
      }
    });
  });
};

// 迁移 models 表结构
const migrateModelsTable = async () => {
  try {
    // 添加 is_reverse 列
    await addColumnIfNotExists('models', 'is_reverse', 'INTEGER DEFAULT 0');
    
    // 添加 price_data 列
    await addColumnIfNotExists('models', 'price_data', 'TEXT');
    
    console.log('models 表迁移完成');
    return true;
  } catch (error) {
    console.error('models 表迁移失败:', error);
    return false;
  }
};

// 迁移traces表结构
const migrateTracesTable = async () => {
  return new Promise((resolve, reject) => {
    // 获取traces表的列信息
    db.all("PRAGMA table_info(traces)", [], async (err, columns) => {
      if (err) {
        return reject(err);
      }
      
      // 检查是否有requestBody和responseBody列
      const hasRequestBody = columns.some(col => col.name === 'requestBody');
      const hasResponseBody = columns.some(col => col.name === 'responseBody');
      
      if (!hasRequestBody || !hasResponseBody) {
        // 需要重建表结构
        try {
          // 备份数据
          const traces = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM traces", [], (err, traces) => {
              if (err) return reject(err);
              resolve(traces);
            });
          });
          
          // 将数据保存到临时文件
          const backupPath = path.join(__dirname, '../../data/traces_backup.json');
          fs.writeFileSync(backupPath, JSON.stringify(traces, null, 2));
          console.log(`数据已备份到 ${backupPath}`);
          
          // 重建表结构
          await rebuildTracesTable(traces);
          resolve();
        } catch (error) {
          reject(error);
        }
      } else {
        // 表结构基本正确，检查是否需要添加其他列
        try {
          // 检查并添加ipPath列
          const ipPathAdded = await addColumnIfNotExists('traces', 'ipPath', 'TEXT');
          
          // 如果添加了ipPath列，更新现有记录
          if (ipPathAdded) {
            await new Promise((resolve, reject) => {
              db.run("UPDATE traces SET ipPath = ip WHERE ipPath IS NULL", (err) => {
                if (err) {
                  console.error('更新ipPath值失败:', err);
                  return reject(err);
                }
                console.log('成功更新ipPath值');
                resolve();
              });
            });
          }
          
          // 检查并添加groupName列
          await addColumnIfNotExists('traces', 'groupName', 'TEXT');
          
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    });
  });
};

// 重建traces表
const rebuildTracesTable = async (oldTraces) => {
  return new Promise((resolve, reject) => {
    // 重命名旧表
    db.run("ALTER TABLE traces RENAME TO traces_old", (err) => {
      if (err) return reject(err);
      
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
          createdAt INTEGER NOT NULL,
          ipPath TEXT,
          groupName TEXT
        )
      `, async (err) => {
        if (err) return reject(err);
        
        try {
          // 开始事务
          await new Promise((resolve, reject) => {
            db.run("BEGIN TRANSACTION", (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
          
          // 如果没有数据，直接提交事务
          if (oldTraces.length === 0) {
            await new Promise((resolve, reject) => {
              db.run("COMMIT", (err) => {
                if (err) return reject(err);
                resolve();
              });
            });
            
            // 删除旧表
            await new Promise((resolve, reject) => {
              db.run("DROP TABLE traces_old", (err) => {
                if (err) return reject(err);
                resolve();
              });
            });
            
            console.log('数据库迁移完成 (无数据)');
            return resolve();
          }
          
          // 插入数据到新表
          for (const trace of oldTraces) {
            await new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO traces (
                  id, traceId, baseUrl, key, model, ip, userAgent, headers, 
                  requestBody, responseBody, requestTime, responseTime, createdAt,
                  ipPath, groupName
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                  trace.createdAt,
                  trace.ipPath || trace.ip, // ipPath
                  trace.groupName || ''  // groupName
                ],
                (err) => {
                  if (err) return reject(err);
                  resolve();
                }
              );
            });
          }
          
          // 提交事务
          await new Promise((resolve, reject) => {
            db.run("COMMIT", (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
          
          // 删除旧表
          await new Promise((resolve, reject) => {
            db.run("DROP TABLE traces_old", (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
          
          console.log('数据库迁移完成');
          resolve();
        } catch (error) {
          // 回滚事务
          db.run("ROLLBACK", () => {
            reject(error);
          });
        }
      });
    });
  });
};

// 创建 model_reverse_status 表
const createModelReverseStatusTable = async () => {
  return new Promise((resolve, reject) => {
    // 检查表是否存在
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='model_reverse_status'", (err, table) => {
      if (err) {
        console.error('检查model_reverse_status表是否存在失败:', err);
        return reject(err);
      }
      
      if (!table) {
        console.log('创建model_reverse_status表...');
        
        // 创建表
        db.run(`
          CREATE TABLE model_reverse_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_id TEXT NOT NULL,
            proxy_id TEXT NOT NULL,
            group_id TEXT NOT NULL,
            is_reverse INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(model_id, proxy_id, group_id)
          )
        `, (err) => {
          if (err) {
            console.error('创建model_reverse_status表失败:', err);
            return reject(err);
          }
          
          console.log('model_reverse_status表创建成功');
          resolve(true);
        });
      } else {
        console.log('model_reverse_status表已存在');
        resolve(false);
      }
    });
  });
};

// 迁移数据库
const migrateDatabase = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('开始数据库迁移...');
      
      // 迁移groups表
      await addColumnIfNotExists('groups', 'remark', 'TEXT');
      
      // 迁移models表
      await migrateModelsTable();
      
      // 迁移proxies表
      await addColumnIfNotExists('proxies', 'exchangeRate', 'REAL DEFAULT 7.0');
      
      // 迁移traces表
      await migrateTracesTable();
      
      // 创建model_reverse_status表
      await createModelReverseStatusTable();
      
      console.log('数据库迁移全部完成');
      resolve();
    } catch (error) {
      console.error('数据库迁移失败:', error);
      reject(error);
    }
  });
};

module.exports = {
  migrateDatabase
};
