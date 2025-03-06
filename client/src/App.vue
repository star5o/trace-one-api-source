<template>
  <div class="app-container">
    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="30%"
      :close-on-click-modal="false"
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
          <el-button @click="passwordDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitPasswordChange" :loading="passwordLoading">确认</el-button>
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
                    <el-dropdown-item command="changePassword">修改密码</el-dropdown-item>
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
import { computed, onMounted, ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { checkAuth, logout, getCurrentUser, changePassword } from './store/auth';
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
