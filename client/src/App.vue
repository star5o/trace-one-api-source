<template>
  <div class="app-container">
    <el-container v-if="$route.meta.public">
      <el-main style="padding: 0">
        <router-view />
      </el-main>
    </el-container>
    
    <el-container v-else>
      <el-header>
        <div class="header-content">
          <h1>LLM API中转站管理系统</h1>
          <div class="header-right">
            <el-menu mode="horizontal" :router="true" :default-active="activeRoute">
              <el-menu-item index="/">中转站列表</el-menu-item>
              <el-menu-item index="/trace">中转溯源</el-menu-item>
            </el-menu>
            
            <div class="user-info" v-if="user">
              <el-dropdown @command="handleCommand">
                <span class="user-dropdown-link">
                  {{ user.username }}
                  <el-icon class="el-icon--right"><arrow-down /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
      <el-footer>
        <div class="footer-content">
          <p>© {{ new Date().getFullYear() }} LLM API中转站管理系统 by star5o</p>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { checkAuth, logout, getCurrentUser } from './store/auth';
import { ArrowDown } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

export default {
  name: 'App',
  components: {
    ArrowDown
  },
  setup() {
    const router = useRouter();
    const { user, isAuthenticated } = checkAuth();
    
    const activeRoute = computed(() => {
      return router.currentRoute.value.path;
    });
    
    // 处理下拉菜单命令
    const handleCommand = async (command) => {
      if (command === 'logout') {
        const { success } = logout();
        if (success) {
          ElMessage.success('已退出登录');
          router.push('/login');
        }
      }
    };
    
    // 组件挂载时检查用户信息
    onMounted(async () => {
      if (isAuthenticated) {
        await getCurrentUser();
      }
    });
    
    return {
      user: computed(() => checkAuth().user),
      activeRoute,
      handleCommand
    };
  }
}
</script>

<style>
.app-container {
  height: 100vh;
  width: 100%;
}

.el-header {
  background-color: #f5f7fa;
  color: #333;
  line-height: 60px;
  padding: 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  margin-left: 20px;
  display: flex;
  align-items: center;
}

.user-dropdown-link {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #409EFF;
}

.header-content h1 {
  margin: 0;
  font-size: 1.5rem;
}

.el-main {
  background-color: #fff;
  color: #333;
  padding: 20px;
}

.el-footer {
  background-color: #f5f7fa;
  color: #333;
  text-align: center;
  line-height: 60px;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

.footer-content p {
  margin: 0;
}
</style>
