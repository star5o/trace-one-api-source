import { createRouter, createWebHistory } from 'vue-router'
import { checkAuth } from '../store/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/',
    name: 'ProxyList',
    component: () => import('../views/ProxyList.vue'),
    meta: { title: '中转站列表', requiresAuth: true }
  },
  {
    path: '/models',
    name: 'ModelList',
    component: () => import('../views/ModelList.vue'),
    meta: { title: '模型列表', requiresAuth: true }
  },
  {
    path: '/trace',
    name: 'ProxyTrace',
    component: () => import('../views/TraceView.vue'),
    meta: { title: '中转溯源', requiresAuth: true }
  },
  {
    path: '/model-detail/:proxyId/:groupId/:modelId',
    name: 'ModelDetail',
    component: () => import('../views/ModelDetail.vue'),
    meta: { title: '模型详情', requiresAuth: true }
  },
  {
    path: '/login-records',
    name: 'LoginRecords',
    component: () => import('../views/LoginRecords.vue'),
    meta: { title: '登录记录', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'OpenAI API中转站管理系统'
  
  // 检查路由是否需要认证
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isPublic = to.matched.some(record => record.meta.public)
  const { isAuthenticated, user } = checkAuth()
  
  // 如果需要认证且未登录，重定向到登录页面
  if (requiresAuth && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } 
  // 如果已登录且访问登录页面，重定向到首页
  else if (isAuthenticated && isPublic) {
    next({ name: 'ProxyList' })
  }
  // 其他情况正常导航
  else {
    next()
  }
})

export default router
