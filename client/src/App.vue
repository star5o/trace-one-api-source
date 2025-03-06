<template>
  <div class="app-container">
    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="30%"
      :close-on-click-modal="false"
      destroy-on-close
      center
    >
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input v-model="passwordForm.currentPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="passwordDialogVisible = false" plain>取消</el-button>
          <el-button type="primary" @click="submitPasswordChange" :loading="passwordLoading" icon="Key">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
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
              <el-menu-item index="/">
                <el-icon><Monitor /></el-icon>
                <span>中转站列表</span>
              </el-menu-item>
              <el-menu-item index="/trace">
                <el-icon><Connection /></el-icon>
                <span>中转溯源</span>
              </el-menu-item>
            </el-menu>
            
            <div class="user-info" v-if="user">
              <el-dropdown @command="handleCommand">
                <span class="user-dropdown-link">
                  <el-avatar :size="28" class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</el-avatar>
                  <span class="username-text">{{ user.username }}</span>
                  <el-icon class="el-icon--right"><arrow-down /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="changePassword">
                      <el-icon><Key /></el-icon> 修改密码
                    </el-dropdown-item>
                    <el-dropdown-item command="logout">
                      <el-icon><SwitchButton /></el-icon> 退出登录
                    </el-dropdown-item>
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
          <p>© {{ new Date().getFullYear() }} LLM API中转站管理系统 <span class="footer-divider">|</span> <span class="footer-author">by star5o</span></p>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script>
import { computed, onMounted, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { checkAuth, logout, getCurrentUser, changePassword } from './store/auth';
import { ArrowDown, Monitor, Connection, Key, SwitchButton } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

export default {
  name: 'App',
  components: {
    ArrowDown,
    Monitor,
    Connection,
    Key,
    SwitchButton
  },
  setup() {
    const router = useRouter();
    const { user, isAuthenticated } = checkAuth();
    
    const activeRoute = computed(() => {
      return router.currentRoute.value.path;
    });
    
    // 密码对话框相关
    const passwordDialogVisible = ref(false);
    const passwordLoading = ref(false);
    const passwordFormRef = ref(null);
    const passwordForm = reactive({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    // 密码表单验证规则
    const passwordRules = {
      currentPassword: [
        { required: true, message: '请输入当前密码', trigger: 'blur' }
      ],
      newPassword: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' }
      ],
      confirmPassword: [
        { required: true, message: '请确认新密码', trigger: 'blur' },
        { 
          validator: (rule, value, callback) => {
            if (value !== passwordForm.newPassword) {
              callback(new Error('两次输入的密码不一致'));
            } else {
              callback();
            }
          }, 
          trigger: 'blur' 
        }
      ]
    };
    
    // 提交密码修改
    const submitPasswordChange = async () => {
      if (!passwordFormRef.value) return;
      
      await passwordFormRef.value.validate(async (valid) => {
        if (valid) {
          passwordLoading.value = true;
          try {
            const { success, message, error } = await changePassword(
              passwordForm.currentPassword,
              passwordForm.newPassword
            );
            
            if (success) {
              ElMessage.success(message || '密码修改成功');
              passwordDialogVisible.value = false;
              // 重置表单
              passwordForm.currentPassword = '';
              passwordForm.newPassword = '';
              passwordForm.confirmPassword = '';
            } else {
              ElMessage.error(error || '密码修改失败');
            }
          } catch (err) {
            ElMessage.error('操作失败，请重试');
          } finally {
            passwordLoading.value = false;
          }
        }
      });
    };
    
    // 处理下拉菜单命令
    const handleCommand = async (command) => {
      if (command === 'logout') {
        const { success } = logout();
        if (success) {
          ElMessage.success('已退出登录');
          router.push('/login');
        }
      } else if (command === 'changePassword') {
        passwordDialogVisible.value = true;
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
      handleCommand,
      // 密码对话框相关
      passwordDialogVisible,
      passwordLoading,
      passwordFormRef,
      passwordForm,
      passwordRules,
      submitPasswordChange
    };
  }
}
</script>

<style>
/* 全局样式 */
:root {
  --primary-color: #1e88e5;
  --primary-light: #4b9fea;
  --primary-dark: #1565c0;
  --secondary-color: #00d0b0;
  --accent-color: #ff6b6b;
  --text-primary: #333333;
  --text-secondary: #666666;
  --bg-light: #f5f7fa;
  --bg-white: #ffffff;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.1);
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --transition: all 0.3s ease;
}

/* 基础样式重置 */
body {
  margin: 0;
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-primary);
  font-size: 14px;
}

.app-container {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-light);
}

/* 头部样式 */
.el-header {
  background: #1976d2;
  color: white;
  line-height: 60px;
  padding: 0 30px;
  box-shadow: var(--shadow-md);
  position: relative;
  z-index: 10;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-content h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: #ffffff;
}

.header-right {
  display: flex;
  align-items: center;
}

/* 菜单样式 */
.el-menu.el-menu--horizontal {
  border-bottom: none;
  background: transparent;
  margin-right: 20px;
}

.el-menu--horizontal > .el-menu-item {
  height: 60px;
  line-height: 60px;
  color: #ffffff;
  font-weight: 400;
  font-size: 14px;
  border-bottom: 2px solid transparent;
  transition: var(--transition);
  padding: 0 15px;
}

.el-menu--horizontal > .el-menu-item.is-active {
  color: #ffffff;
  border-bottom: 2px solid #ffffff;
  background-color: rgba(255, 255, 255, 0.15);
  font-weight: 500;
}

.el-menu--horizontal > .el-menu-item:hover {
  color: white;
  background-color: rgba(255, 255, 255, 0.15);
}

/* 用户信息样式 */
.user-info {
  margin-left: 24px;
  display: flex;
  align-items: center;
}

.user-dropdown-link {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #ffffff;
  font-weight: 400;
  font-size: 14px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
  background-color: rgba(255, 255, 255, 0.1);
}

.username-text {
  margin: 0 5px;
}

.user-avatar {
  background-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 14px;
}

.user-dropdown-link:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.user-dropdown-link .el-icon--right {
  margin-left: 8px;
}

/* 主内容区样式 */
.el-main {
  background-color: var(--bg-white);
  color: var(--text-primary);
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius-sm);
  margin: 15px;
}

/* 页脚样式 */
.el-footer {
  background-color: var(--bg-white);
  color: var(--text-secondary);
  text-align: center;
  line-height: 40px;
  font-size: 12px;
  box-shadow: var(--shadow-sm);
  margin-top: auto;
}

.footer-divider {
  margin: 0 8px;
  color: #cccccc;
}

.footer-author {
  color: #888888;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

.footer-content p {
  margin: 0;
}

/* 对话框样式 */
.el-dialog {
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.el-dialog__header {
  background-color: var(--primary-color);
  color: white;
  padding: 15px 20px;
}

.el-dialog__title {
  color: white;
  font-weight: 600;
}

.el-dialog__headerbtn .el-dialog__close {
  color: rgba(255, 255, 255, 0.9);
}

.el-dialog__body {
  padding: 30px 24px;
}

.el-dialog__footer {
  padding: 16px 24px;
  border-top: 1px solid #ebeef5;
}

/* 表单样式 */
.el-form-item__label {
  font-weight: 500;
  color: var(--text-secondary);
}

.el-input__inner {
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.el-input__inner:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(58, 123, 213, 0.2);
}

/* 按钮样式 */
.el-button {
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition: var(--transition);
}

.el-button--primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.el-button--primary:hover, 
.el-button--primary:focus {
  background-color: var(--primary-light);
  border-color: var(--primary-light);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .el-header {
    padding: 0 15px;
  }
  
  .header-content h1 {
    font-size: 1.2rem;
  }
  
  .el-main {
    padding: 15px;
    margin: 10px;
  }
}
</style>
