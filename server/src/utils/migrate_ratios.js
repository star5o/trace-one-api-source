const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 获取数据库路径
const dbPath = path.join(__dirname, '../../data/openai-proxy-manager.db');
const db = new sqlite3.Database(dbPath);

async function migrateRatios() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 开始事务
      db.run('BEGIN TRANSACTION');

      try {
        // 在 groups 表中添加 group_ratio 字段
        db.run(`ALTER TABLE groups ADD COLUMN group_ratio REAL DEFAULT 1.0`);

        // 在 models 表中添加 model_ratio 和 completion_ratio 字段
        db.run(`ALTER TABLE models ADD COLUMN model_ratio REAL DEFAULT 1.0`);
        db.run(`ALTER TABLE models ADD COLUMN completion_ratio REAL DEFAULT 1.0`);

        // 从现有的 price_data 中迁移数据
        db.all(`SELECT id, groupId, price_data FROM models WHERE price_data IS NOT NULL`, [], (err, rows) => {
          if (err) {
            console.error('获取模型数据失败:', err);
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          // 更新每个模型的倍率
          rows.forEach(row => {
            try {
              const priceData = JSON.parse(row.price_data);
              const modelRatio = priceData.model_ratio || 1.0;
              const completionRatio = priceData.completion_ratio || 1.0;
              const groupRatio = priceData.group_ratio || 1.0;

              // 更新模型的倍率
              db.run(
                'UPDATE models SET model_ratio = ?, completion_ratio = ? WHERE id = ? AND groupId = ?',
                [modelRatio, completionRatio, row.id, row.groupId]
              );

              // 更新分组的倍率
              db.run(
                'UPDATE groups SET group_ratio = ? WHERE id = ?',
                [groupRatio, row.groupId]
              );
            } catch (parseErr) {
              console.error('解析 price_data 失败:', parseErr);
            }
          });
        });

        // 提交事务
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('提交事务失败:', err);
            db.run('ROLLBACK');
            reject(err);
          } else {
            console.log('数据迁移完成');
            resolve();
          }
        });
      } catch (error) {
        console.error('迁移失败:', error);
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

// 执行迁移
migrateRatios()
  .then(() => {
    console.log('迁移成功完成');
    db.close();
  })
  .catch(error => {
    console.error('迁移失败:', error);
    db.close();
  });
