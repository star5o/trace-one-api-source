import axios from 'axios';

// 从本地存储中获取令牌
const getStoredToken = () => {
  return localStorage.getItem('auth_token');
};

// 从本地存储中获取用户信息
const getStoredUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// 初始状态
const state = {
  token: getStoredToken(),
  user: getStoredUser(),
  isAuthenticated: !!getStoredToken()
};

// 设置认证头
const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// 如果已有令牌，设置认证头
if (state.token) {
  setAuthHeader(state.token);
}

// 登录
export const login = async (username, password) => {
  try {
    const response = await axios.post('/api/auth/login', { username, password });
    const { token, user } = response.data;
    
    // 保存到本地存储
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // 更新状态
    state.token = token;
    state.user = user;
    state.isAuthenticated = true;
    
    // 设置认证头
    setAuthHeader(token);
    
    return { success: true, user };
  } catch (error) {
    console.error('登录失败:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || '登录失败，请检查网络连接' 
    };
  }
};

// 登出
export const logout = () => {
  // 清除本地存储
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  
  // 更新状态
  state.token = null;
  state.user = null;
  state.isAuthenticated = false;
  
  // 清除认证头
  setAuthHeader(null);
  
  return { success: true };
};

// 获取当前用户信息
export const getCurrentUser = async () => {
  if (!state.token) {
    return { success: false, error: '未登录' };
  }
  
  try {
    const response = await axios.get('/api/auth/me');
    const { user } = response.data;
    
    // 更新本地存储和状态
    localStorage.setItem('user', JSON.stringify(user));
    state.user = user;
    
    return { success: true, user };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    
    // 如果是认证错误，清除认证信息
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      logout();
    }
    
    return { 
      success: false, 
      error: error.response?.data?.error || '获取用户信息失败' 
    };
  }
};

// 检查认证状态
export const checkAuth = () => {
  return {
    isAuthenticated: state.isAuthenticated,
    user: state.user
  };
};

// 修改密码
export const changePassword = async (currentPassword, newPassword) => {
  if (!state.token) {
    return { success: false, error: '未登录' };
  }
  
  try {
    const response = await axios.post('/api/auth/change-password', { 
      currentPassword, 
      newPassword 
    });
    
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error('修改密码失败:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || '修改密码失败' 
    };
  }
};

export default {
  state,
  login,
  logout,
  getCurrentUser,
  checkAuth,
  changePassword
};
