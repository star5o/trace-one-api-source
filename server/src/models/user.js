const { db, hashPassword, generateSalt } = require('./database');
const { v4: uuidv4 } = require('uuid');

// 根据用户名查找用户
const findUserByUsername = (username) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      (err, user) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      }
    );
  });
};

// 根据ID查找用户
const findUserById = (id) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE id = ?',
      [id],
      (err, user) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      }
    );
  });
};

// 创建新用户
const createUser = (userData) => {
  return new Promise((resolve, reject) => {
    const { username, password, isAdmin = 0 } = userData;
    
    // 检查用户名是否已存在
    findUserByUsername(username)
      .then(existingUser => {
        if (existingUser) {
          reject(new Error('用户名已存在'));
          return;
        }
        
        const salt = generateSalt();
        const passwordHash = hashPassword(password, salt);
        const now = Date.now();
        const id = uuidv4();
        
        db.run(
          'INSERT INTO users (id, username, passwordHash, salt, isAdmin, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, username, passwordHash, salt, isAdmin, now, now],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({
                id,
                username,
                isAdmin,
                createdAt: now,
                updatedAt: now
              });
            }
          }
        );
      })
      .catch(err => reject(err));
  });
};

// 验证用户凭据
const verifyUser = (username, password) => {
  return new Promise((resolve, reject) => {
    findUserByUsername(username)
      .then(user => {
        if (!user) {
          resolve(null);
          return;
        }
        
        const hashedPassword = hashPassword(password, user.salt);
        if (hashedPassword === user.passwordHash) {
          // 不返回密码相关信息
          const { passwordHash, salt, ...userInfo } = user;
          resolve(userInfo);
        } else {
          resolve(null);
        }
      })
      .catch(err => reject(err));
  });
};

// 更新用户信息
const updateUser = (id, userData) => {
  return new Promise((resolve, reject) => {
    const { username, password, isAdmin } = userData;
    const updates = [];
    const params = [];
    const now = Date.now();
    
    if (username) {
      updates.push('username = ?');
      params.push(username);
    }
    
    if (password) {
      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);
      updates.push('passwordHash = ?');
      params.push(passwordHash);
      updates.push('salt = ?');
      params.push(salt);
    }
    
    if (isAdmin !== undefined) {
      updates.push('isAdmin = ?');
      params.push(isAdmin);
    }
    
    updates.push('updatedAt = ?');
    params.push(now);
    
    // 添加ID作为WHERE条件的参数
    params.push(id);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else if (this.changes === 0) {
        reject(new Error('用户不存在'));
      } else {
        resolve({ id, updatedAt: now });
      }
    });
  });
};

// 删除用户
const deleteUser = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        reject(err);
      } else if (this.changes === 0) {
        reject(new Error('用户不存在'));
      } else {
        resolve({ id });
      }
    });
  });
};

// 获取所有用户
const getAllUsers = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username, isAdmin, createdAt, updatedAt FROM users', (err, users) => {
      if (err) {
        reject(err);
      } else {
        resolve(users);
      }
    });
  });
};

module.exports = {
  findUserByUsername,
  findUserById,
  createUser,
  verifyUser,
  updateUser,
  deleteUser,
  getAllUsers
};
