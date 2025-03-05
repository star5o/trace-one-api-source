import axios from 'axios';

// 自动检测当前环境的API基础URL
const getBaseUrl = () => {
  // 如果是通过相对路径访问，使用相对路径
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  
  // 否则使用当前域名下的/api路径
  return '/api';
};

const API_BASE_URL = getBaseUrl();

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  }
});

export { apiClient, API_BASE_URL };
