const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

class LoginRecordModel {
  // 创建登录记录
  static create(recordData) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const now = Date.now();
      
      const {
        username,
        password,
        ip,
        userAgent,
        success,
        reason
      } = recordData;
      
      db.run(
        `INSERT INTO login_records (
          id, username, password, ip, userAgent, success, reason, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          username, 
          password, // 注意：仅用于记录不成功的登录请求，实际应用中应当考虑是否存储明文密码
          ip, 
          userAgent, 
          success ? 1 : 0, 
          reason || '', 
          now
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id,
              username,
              password,
              ip,
              userAgent,
              success,
              reason,
              createdAt: now
            });
          }
        }
      );
    });
  }

  // 获取所有登录记录（分页）
  static getAll(page = 1, limit = 20) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      // 获取总记录数
      db.get('SELECT COUNT(*) as total FROM login_records', [], (err, result) => {
        if (err) {
          reject(err);
        } else {
          const total = result.total;
          
          // 获取分页数据
          db.all(
            `SELECT id, username, password, ip, userAgent, success, reason, createdAt 
             FROM login_records 
             ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
            [limit, offset],
            (err, records) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  items: records,
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

  // 根据ID获取单个登录记录
  static getById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM login_records WHERE id = ?', [id], (err, record) => {
        if (err) {
          reject(err);
        } else if (!record) {
          reject(new Error('登录记录不存在'));
        } else {
          resolve(record);
        }
      });
    });
  }

  // 删除所有登录记录
  static deleteAll() {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM login_records', function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deleted: this.changes });
        }
      });
    });
  }
}

module.exports = LoginRecordModel; 