<template>
  <div class="trace-detail">
    <el-card v-if="trace" class="trace-card">
      <template #header>
        <div class="card-header">
          <h3>溯源详情 (ID: {{ trace.id }})</h3>
          <el-tag type="info">{{ formatDate(trace.createdAt) }}</el-tag>
        </div>
      </template>
      
      <el-descriptions :column="2" border>
        <el-descriptions-item label="中转站URL">{{ trace.baseUrl }}</el-descriptions-item>
        <el-descriptions-item label="模型">{{ trace.model }}</el-descriptions-item>
        <el-descriptions-item label="请求时间">{{ formatDate(trace.requestTime) }}</el-descriptions-item>
        <el-descriptions-item label="响应时间">{{ formatDate(trace.responseTime) }}</el-descriptions-item>
        <el-descriptions-item label="请求IP">{{ trace.ip }}</el-descriptions-item>
        <el-descriptions-item label="用户代理">{{ trace.userAgent }}</el-descriptions-item>
      </el-descriptions>
      
      <el-divider />
      
      <el-tabs type="border-card">
        <el-tab-pane label="请求体">
          <div class="code-block">
            <pre>{{ formatJson(trace.requestBody) }}</pre>
          </div>
        </el-tab-pane>
        <el-tab-pane label="响应体">
          <div class="code-block">
            <pre>{{ formatJson(trace.responseBody) }}</pre>
          </div>
        </el-tab-pane>
        <el-tab-pane label="请求头">
          <div class="code-block">
            <pre>{{ formatJson(trace.headers) }}</pre>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
    <el-empty v-else description="无溯源数据"></el-empty>
  </div>
</template>

<script>
export default {
  name: 'TraceDetail',
  props: {
    trace: {
      type: Object,
      default: null
    }
  },
  methods: {
    formatDate(timestamp) {
      if (!timestamp) return '未知';
      const date = new Date(parseInt(timestamp));
      return date.toLocaleString();
    },
    formatJson(json) {
      if (!json) return '无数据';
      
      try {
        // 如果是字符串，尝试解析
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        return JSON.stringify(data, null, 2);
      } catch (e) {
        // 如果解析失败，直接返回原始字符串
        return json;
      }
    }
  }
}
</script>

<style scoped>
.trace-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.code-block {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-family: monospace;
  white-space: pre-wrap;
}
</style>
