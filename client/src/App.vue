<template>
  <div class="app-container">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>OpenAI API中转站管理系统</h1>
          <el-menu mode="horizontal" :router="true" :default-active="activeRoute">
            <el-menu-item index="/">中转站列表</el-menu-item>
            <el-menu-item index="/trace">中转溯源</el-menu-item>
          </el-menu>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
      <el-footer>
        <div class="footer-content">
          <p>© {{ new Date().getFullYear() }} OpenAI API中转站管理系统</p>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script>
export default {
  name: 'App',
  computed: {
    activeRoute() {
      return this.$route.path
    }
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
