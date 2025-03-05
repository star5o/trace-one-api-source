<template>
  <div class="login-container">
    <el-card class="login-card">
      <div class="login-header">
        <h2>OpenAI API中转站管理系统</h2>
        <p>请登录以继续</p>
      </div>
      
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" prefix-icon="el-icon-user"></el-input>
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" prefix-icon="el-icon-lock" show-password></el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleLogin" style="width: 100%">登录</el-button>
        </el-form-item>
      </el-form>
      
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../store/auth';
import { ElMessage } from 'element-plus';

export default {
  name: 'LoginView',
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
      
      await loginFormRef.value.validate(async (valid) => {
        if (!valid) return;
        
        loading.value = true;
        errorMessage.value = '';
        
        try {
          const { success, error, user } = await login(loginForm.username, loginForm.password);
          
          if (success) {
            ElMessage.success('登录成功');
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
      });
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
