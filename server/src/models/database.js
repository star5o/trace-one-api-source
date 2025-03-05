const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 确保数据目录存在
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'openai-proxy-manager.db');
const db = new sqlite3.Database(dbPath);

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
          createdAt INTEGER NOT NULL
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};

module.exports = {
  db,
  initDatabase
};
