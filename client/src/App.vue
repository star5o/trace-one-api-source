<template>
  <div class="app-container">
    <!-- 修改密码对话框 -->
    <a-modal
      v-model:open="passwordDialogVisible"
      title="修改密码"
      :width="500"
      :mask-closable="false"
      :destroyOnClose="true"
      centered
      @ok="submitPasswordChange"
      :confirmLoading="passwordLoading"
    >
      <a-form :model="passwordForm" ref="passwordFormRef" :rules="passwordRules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="当前密码" name="currentPassword">
          <a-input-password v-model:value="passwordForm.currentPassword" />
        </a-form-item>
        <a-form-item label="新密码" name="newPassword">
          <a-input-password v-model:value="passwordForm.newPassword" />
        </a-form-item>
        <a-form-item label="确认新密码" name="confirmPassword">
          <a-input-password v-model:value="passwordForm.confirmPassword" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="passwordDialogVisible = false">取消</a-button>
        <a-button type="primary" @click="submitPasswordChange" :loading="passwordLoading">
          <template #icon><key-outlined /></template>确认
        </a-button>
      </template>
    </a-modal>
    
    <a-layout v-if="$route.meta.public">
      <a-layout-content :style="{ padding: 0 }">
        <router-view />
      </a-layout-content>
    </a-layout>
    
    <a-layout v-else>
      <a-layout-header>
        <div class="header-content">
          <h1>LLM API中转站管理系统</h1>
          <div class="header-right">
            <a-menu mode="horizontal" :selectedKeys="[activeRoute]">
              <a-menu-item key="/" @click="() => $router.push('/')">
                <template #icon><monitor-outlined /></template>
                <span>中转站列表</span>
              </a-menu-item>
              <a-menu-item key="/models" @click="() => $router.push('/models')">
                <template #icon><appstore-outlined /></template>
                <span>模型列表</span>
              </a-menu-item>
              <a-menu-item key="/trace" @click="() => $router.push('/trace')">
                <template #icon><link-outlined /></template>
                <span>中转溯源</span>
              </a-menu-item>
            </a-menu>
            
            <div class="user-info" v-if="user">
              <a-dropdown>
                <a class="user-dropdown-link" @click.prevent>
                  <a-avatar :size="28" class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</a-avatar>
                  <span class="username-text">{{ user.username }}</span>
                  <down-outlined />
                </a>
                <template #overlay>
                  <a-menu @click="handleCommand">
                    <a-menu-item key="changePassword">
                      <template #icon><key-outlined /></template> 修改密码
                    </a-menu-item>
                    <a-menu-item key="logout">
                      <template #icon><logout-outlined /></template> 退出登录
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>
        </div>
      </a-layout-header>
      <a-layout-content>
        <router-view />
      </a-layout-content>
      <a-layout-footer>
        <div class="footer-content">
          <p>© {{ new Date().getFullYear() }} LLM API中转站管理系统 <span class="footer-divider">|</span> <span class="footer-author">by star5o</span></p>
        </div>
      </a-layout-footer>
    </a-layout>
  </div>
</template>

<script>
import { computed, onMounted, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { checkAuth, logout, getCurrentUser, changePassword } from './store/auth';
import { DownOutlined, MonitorOutlined, LinkOutlined, KeyOutlined, LogoutOutlined, AppstoreOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

export default {
  name: 'App',
  components: {
    DownOutlined,
    MonitorOutlined,
    LinkOutlined,
    KeyOutlined,
    LogoutOutlined,
    AppstoreOutlined
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
          validator: async (rule, value) => {
            if (value !== passwordForm.newPassword) {
              throw new Error('两次输入的密码不一致');
            }
            return Promise.resolve();
          }, 
          trigger: 'blur' 
        }
      ]
    };
    
    // 提交密码修改
    const submitPasswordChange = async () => {
      if (!passwordFormRef.value) return;
      
      try {
        await passwordFormRef.value.validate();
        passwordLoading.value = true;
        try {
          const { success, msg, error } = await changePassword(
            passwordForm.currentPassword,
            passwordForm.newPassword
          );
          
          if (success) {
            message.success(msg || '密码修改成功');
            passwordDialogVisible.value = false;
            // 重置表单
            passwordForm.currentPassword = '';
            passwordForm.newPassword = '';
            passwordForm.confirmPassword = '';
          } else {
            message.error(error || '密码修改失败');
          }
        } catch (err) {
          message.error('操作失败，请重试');
        } finally {
          passwordLoading.value = false;
        }
      } catch (e) {
        // 表单验证失败
      }
    };
    
    // 处理下拉菜单命令
    const handleCommand = async (menuInfo) => {
      const { key } = menuInfo;
      if (key === 'logout') {
        const { success } = logout();
        if (success) {
          message.success('已退出登录');
          router.push('/login');
        }
      } else if (key === 'changePassword') {
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
  --primary-color: #4361ee;
  --primary-light: #738aff;
  --primary-dark: #2541b2;
  --secondary-color: #06d6a0;
  --accent-color: #ef476f;
  --text-primary: #2b2d42;
  --text-secondary: #6c757d;
  --bg-light: #f8f9fa;
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
.ant-layout-header {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  line-height: 60px;
  padding: 0 30px;
  box-shadow: var(--shadow-md);
  position: relative;
  z-index: 10;
  height: 64px;
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
.ant-menu.ant-menu-horizontal {
  border-bottom: none !important;
  background: transparent;
  margin-right: 20px;
  line-height: 60px;
}

.ant-menu-horizontal .ant-menu-item .ant-menu-title-content {
  color: white !important;
}

.ant-menu-horizontal .ant-menu-item:hover .ant-menu-title-content {
  color: white !important;
}

.ant-menu-horizontal > .ant-menu-item {
  height: 60px;
  line-height: 60px;
  color: #ffffff;
  font-weight: 400;
  font-size: 14px;
  border-bottom: 2px solid transparent !important;
  transition: var(--transition);
  padding: 0 15px;
  margin: 0;
}

.ant-menu-horizontal > .ant-menu-item-selected {
  color: #ffffff;
  border-bottom: 2px solid var(--secondary-color) !important;
  background-color: rgba(255, 255, 255, 0.15);
  font-weight: 500;
}

.ant-menu-horizontal > .ant-menu-item:hover {
  color: white !important;
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
  background-color: var(--accent-color);
  color: #ffffff;
  font-size: 14px;
}

.user-dropdown-link:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.user-dropdown-link .anticon {
  margin-left: 8px;
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


</style>
