<template>
  <div class="login-container">
    <a-card class="login-card">
      <div class="login-header">
        <h2>OpenAI API中转站管理系统</h2>
        <p>请登录以继续</p>
      </div>
      
      <a-form :model="loginForm" ref="loginFormRef" :rules="rules" layout="vertical">
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="loginForm.username" placeholder="请输入用户名">
            <template #prefix><user-outlined /></template>
          </a-input>
        </a-form-item>
        
        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="loginForm.password" placeholder="请输入密码">
            <template #prefix><lock-outlined /></template>
          </a-input-password>
        </a-form-item>
        
        <a-form-item>
          <a-button type="primary" :loading="loading" @click="handleLogin" style="width: 100%">登录</a-button>
        </a-form-item>
      </a-form>
      
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </a-card>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../store/auth';
import { message } from 'ant-design-vue';
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue';

export default {
  name: 'LoginView',
  components: {
    UserOutlined,
    LockOutlined
  },
  setup() {
    const router = useRouter();
    const loginFormRef = ref(null);
    const loading = ref(false);
    const errorMessage = ref('');
    
    const loginForm = reactive({
      username: '',
      password: ''
    });
    
    const rules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' }
      ]
    };
    
    const handleLogin = async () => {
      if (!loginFormRef.value) return;
      
      try {
        await loginFormRef.value.validate();
        
        loading.value = true;
        errorMessage.value = '';
        
        try {
          const { success, error, user } = await login(loginForm.username, loginForm.password);
          
          if (success) {
            message.success('登录成功');
            router.push('/');
          } else {
            errorMessage.value = error;
          }
        } catch (err) {
          console.error('登录出错:', err);
          errorMessage.value = '登录失败，请稍后重试';
        } finally {
          loading.value = false;
        }
      } catch (e) {
        // 表单验证失败
      }
    };
    
    return {
      loginFormRef,
      loginForm,
      rules,
      loading,
      errorMessage,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.login-card {
  width: 400px;
  max-width: 90%;
}

.login-header {
  text-align: center;
  margin-bottom: 20px;
}

.login-header h2 {
  margin-bottom: 10px;
  color: #303133;
}

.login-header p {
  color: #909399;
  margin: 0;
}

.error-message {
  color: #f56c6c;
  text-align: center;
  margin-top: 15px;
}
</style>
