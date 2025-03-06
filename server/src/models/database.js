const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 确保数据目录存在
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'openai-proxy-manager.db');
const db = new sqlite3.Database(dbPath);

// 生成密码哈希
const hashPassword = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
};

// 生成随机盐值
const generateSalt = () => {
  return crypto.randomBytes(16).toString('hex');
};

// 初始化数据库表
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 创建中转站表
      db.run(`
        CREATE TABLE IF NOT EXISTS proxies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          baseUrl TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `);

      // 创建分组表
      db.run(`
        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          proxyId TEXT NOT NULL,
          name TEXT NOT NULL,
          key TEXT NOT NULL,
          remark TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          FOREIGN KEY (proxyId) REFERENCES proxies (id) ON DELETE CASCADE
        )
      `);

      // 创建模型表
      db.run(`
        CREATE TABLE IF NOT EXISTS models (
          id TEXT NOT NULL,
          groupId TEXT NOT NULL,
          created INTEGER,
          object TEXT,
          owned_by TEXT,
          raw_data TEXT,
          remark TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          PRIMARY KEY (id, groupId),
          FOREIGN KEY (groupId) REFERENCES groups (id) ON DELETE CASCADE
        )
      `);

      // 创建溯源记录表
      db.run(`
        CREATE TABLE IF NOT EXISTS traces (
          id TEXT PRIMARY KEY,
          traceId TEXT NOT NULL,
          baseUrl TEXT NOT NULL,
          key TEXT NOT NULL,
          model TEXT NOT NULL,
          ip TEXT,
          ipPath TEXT,
          userAgent TEXT,
          headers TEXT,
          requestBody TEXT,
          responseBody TEXT,
          requestTime INTEGER,
          responseTime INTEGER,
          createdAt INTEGER NOT NULL,
          groupName TEXT
        )
      `);
      
      // 检查是否需要添加 groupName 列（兼容旧版本）
      db.get("PRAGMA table_info(traces)", (err, rows) => {
        if (err) {
          console.error('检查traces表结构失败:', err);
        } else {
          // 检查是否存在 groupName 列
          const hasGroupName = rows.some(row => row.name === 'groupName');
          if (!hasGroupName) {
            // 添加 groupName 列
            db.run('ALTER TABLE traces ADD COLUMN groupName TEXT', (err) => {
              if (err) {
                console.error('添加 groupName 列失败:', err);
              } else {
                console.log('成功添加 groupName 列到 traces 表');
              }
            });
          }
        }
      });
      
      // 创建用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          passwordHash TEXT NOT NULL,
          salt TEXT NOT NULL,
          isAdmin INTEGER DEFAULT 0,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          // 检查是否需要创建默认管理员用户
          db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (err) {
              console.error('检查用户数量失败:', err);
              resolve();
            } else if (row.count === 0) {
              // 创建默认管理员用户 (admin/admin123)
              const salt = generateSalt();
              const passwordHash = hashPassword('admin123', salt);
              const now = Date.now();
              
              db.run(
                'INSERT INTO users (id, username, passwordHash, salt, isAdmin, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['admin-' + now, 'admin', passwordHash, salt, 1, now, now],
                (err) => {
                  if (err) {
                    console.error('创建默认管理员用户失败:', err);
                  } else {
                    console.log('已创建默认管理员用户 (用户名: admin, 密码: admin123)');
                  }
                  resolve();
                }
              );
            } else {
              resolve();
            }
          });
        }
      });
    });
  });
};

module.exports = {
  db,
  initDatabase,
  hashPassword,
  generateSalt
};
