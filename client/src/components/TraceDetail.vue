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
        <el-descriptions-item label="初始IP">{{ trace.ip }}</el-descriptions-item>
        <el-descriptions-item label="用户代理">{{ trace.userAgent }}</el-descriptions-item>
      </el-descriptions>
      
      <el-divider />
      
      <el-tabs type="border-card">
        <el-tab-pane label="IP路径">
          <div class="code-block">
            <pre v-if="trace.ipPath">{{ formatIpPath(trace.ipPath) }}</pre>
            <pre v-else>{{ trace.ip }}</pre>
          </div>
        </el-tab-pane>
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
      if (!timestamp) return '无数据';
      const date = new Date(parseInt(timestamp));
      return date.toLocaleString();
    },
    formatJson(json) {
      if (!json) return '无数据';
      
      try {
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        return JSON.stringify(parsed, null, 2);
      } catch (error) {
        return json;
      }
    },
    formatIpPath(ipPath) {
      if (!ipPath) return '无数据';
      
      // 将IP路径格式化为更易读的形式
      return ipPath.split('->').map((ip, index, array) => {
        if (index === 0) return `初始IP: ${ip.trim()}`;
        if (index === array.length - 1) return `最终IP: ${ip.trim()}`;
        return `中转IP ${index}: ${ip.trim()}`;
      }).join('\n');
    }
  }
}
</script>

<style scoped>
.trace-detail {
  margin: 20px 0;
}

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
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
