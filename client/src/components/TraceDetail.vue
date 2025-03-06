<template>
  <div class="trace-detail">
    <a-card v-if="trace" class="trace-card">
      <template #title>
        <div class="card-header">
          <h3>溯源详情 (ID: {{ trace.id }})</h3>
          <a-tag color="blue">{{ formatDate(trace.createdAt) }}</a-tag>
        </div>
      </template>
      
      <a-descriptions :column="2" bordered>
        <a-descriptions-item label="中转站URL">{{ trace.baseUrl }}</a-descriptions-item>
        <a-descriptions-item label="模型">{{ trace.model }}</a-descriptions-item>
        <a-descriptions-item label="请求时间">{{ formatDate(trace.requestTime) }}</a-descriptions-item>
        <a-descriptions-item label="响应时间">{{ formatDate(trace.responseTime) }}</a-descriptions-item>
        <a-descriptions-item label="初始IP">{{ trace.ip }}</a-descriptions-item>
        <a-descriptions-item label="用户代理">{{ trace.userAgent }}</a-descriptions-item>
      </a-descriptions>
      
      <a-divider />
      
      <a-tabs type="card">
        <a-tab-pane key="ipPath" tab="IP路径">
          <div class="code-block">
            <pre v-if="trace.ipPath">{{ formatIpPath(trace.ipPath) }}</pre>
            <pre v-else>{{ trace.ip }}</pre>
          </div>
        </a-tab-pane>
        <a-tab-pane key="requestBody" tab="请求体">
          <div class="code-block">
            <pre>{{ formatJson(trace.requestBody) }}</pre>
          </div>
        </a-tab-pane>
        <a-tab-pane key="responseBody" tab="响应体">
          <div class="code-block">
            <pre>{{ formatJson(trace.responseBody) }}</pre>
          </div>
        </a-tab-pane>
        <a-tab-pane key="headers" tab="请求头">
          <div class="code-block">
            <pre>{{ formatJson(trace.headers) }}</pre>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>
    
    <a-empty v-else description="无溯源数据"></a-empty>
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
