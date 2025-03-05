import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'ProxyList',
    component: () => import('../views/ProxyList.vue'),
    meta: { title: '中转站列表' }
  },
  {
    path: '/trace',
    name: 'ProxyTrace',
    component: () => import('../views/TraceView.vue'),
    meta: { title: '中转溯源' }
  },
  {
    path: '/model-detail/:proxyId/:groupId/:modelId',
    name: 'ModelDetail',
    component: () => import('../views/ModelDetail.vue'),
    meta: { title: '模型详情' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'OpenAI API中转站管理系统'
  next()
})

export default router
