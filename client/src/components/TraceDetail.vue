<template>
  <div class="trace-detail">
    <a-card v-if="trace" class="trace-card" :bordered="false">
      <template #title>
        <div class="card-header">
          <h3 class="card-title">溯源详情</h3>
          <div class="card-meta">
            <span class="trace-id">ID: {{ trace.id }}</span>
            <a-tag color="blue" class="date-tag">{{ formatDate(trace.createdAt) }}</a-tag>
          </div>
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
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

:deep(.ant-card-head) {
  background-color: var(--bg-white);
  border-bottom: 1px solid var(--border-color);
  padding: 0;
}

:deep(.ant-card-head-title) {
  padding: 16px 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trace-id {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  color: var(--text-secondary);
  background-color: rgba(59, 130, 246, 0.05);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.date-tag {
  border-radius: var(--radius-sm);
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

:deep(.ant-card-body) {
  padding: 24px;
}

:deep(.ant-descriptions) {
  background-color: var(--bg-white);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

:deep(.ant-descriptions-item-label) {
  background-color: rgba(59, 130, 246, 0.05);
  font-weight: 500;
  width: 120px;
}

:deep(.ant-divider) {
  margin: 32px 0 24px;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 16px;
}

:deep(.ant-divider::before),
:deep(.ant-divider::after) {
  border-top-color: var(--border-color);
}

:deep(.ant-tabs) {
  background-color: var(--bg-white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 16px;
  margin-top: 16px;
}

:deep(.ant-tabs-card) {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

:deep(.ant-tabs-tab) {
  padding: 8px 16px;
  transition: all 0.2s;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  margin-right: 4px;
  border: 1px solid var(--border-color) !important;
  background-color: rgba(59, 130, 246, 0.02) !important;
}

:deep(.ant-tabs-tab-active) {
  background-color: #f0f7ff !important;
  border-bottom-color: #f0f7ff !important;
}

:deep(.ant-tabs-tab:hover) {
  color: var(--primary-color);
}

:deep(.ant-tabs-content) {
  padding: 16px;
  background-color: #f0f7ff;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.code-block {
  background-color: #f8fafc;
  padding: 16px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  border: 1px solid var(--border-color);
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #334155;
}

:deep(.ant-empty) {
  padding: 32px 0;
  background-color: var(--bg-white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

:deep(.ant-empty-description) {
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
