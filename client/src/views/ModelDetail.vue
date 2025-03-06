<template>
  <div class="model-detail page-container">
    <div class="page-header">
      <h1 class="page-title">模型溯源记录</h1>
      <div class="page-actions">
        <a-button @click="goBack" class="back-button">
          <template #icon><arrow-left-outlined /></template>
          返回
        </a-button>
      </div>
    </div>
    <a-card class="main-card" :bordered="false">
      
      <div v-if="loading" class="loading-container">
        <a-skeleton :rows="5" active />
      </div>
      
      <div v-else>
        <a-descriptions title="模型信息" :column="1" bordered>
          <a-descriptions-item label="中转站">{{ proxyName }}</a-descriptions-item>
          <a-descriptions-item label="分组">{{ groupName }}</a-descriptions-item>
          <a-descriptions-item label="模型ID">{{ modelId }}</a-descriptions-item>
        </a-descriptions>
        
        <div class="trace-records">
          <a-divider>溯源记录</a-divider>
          
          <div v-if="traceRecords.length === 0" class="empty-data">
            <a-empty description="暂无溯源记录" />
          </div>
          
          <div v-else class="records-table">
            <a-table :dataSource="traceRecords" :columns="columns" bordered>
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'requestTime'">
                  {{ formatDate(record.requestTime) }}
                </template>
                <template v-else-if="column.key === 'responseTime'">
                  {{ formatDate(record.responseTime) }}
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button size="small" type="primary" @click="viewTraceDetail(record)">查看详情</a-button>
                </template>
              </template>
            </a-table>
            
            <div class="pagination-container">
              <a-pagination
                v-model:current="currentPage"
                v-model:pageSize="pageSize"
                :pageSizeOptions="['10', '20', '50', '100']"
                showSizeChanger
                showTotal="(total) => `共 ${total} 条`"
                :total="totalRecords"
                @change="handlePageChange"
              />
            </div>
          </div>
        </div>
      </div>
    </a-card>
    
    <!-- 溯源详情对话框 -->
    <a-modal v-model:open="traceDetailDialog.visible" title="溯源详情" width="600px">
      <div v-if="traceDetailDialog.data">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="追踪ID">{{ traceDetailDialog.data.traceId }}</a-descriptions-item>
          <a-descriptions-item label="中转站">{{ traceDetailDialog.data.baseUrl }}</a-descriptions-item>
          <a-descriptions-item label="模型">{{ traceDetailDialog.data.model }}</a-descriptions-item>
          <a-descriptions-item label="IP地址">{{ traceDetailDialog.data.ip }}</a-descriptions-item>
          <a-descriptions-item label="User Agent">{{ traceDetailDialog.data.userAgent }}</a-descriptions-item>
          <a-descriptions-item label="请求时间">{{ formatDate(traceDetailDialog.data.requestTime) }}</a-descriptions-item>
          <a-descriptions-item label="响应时间">{{ formatDate(traceDetailDialog.data.responseTime) }}</a-descriptions-item>
          <a-descriptions-item label="请求头">
            <pre>{{ JSON.stringify(traceDetailDialog.data.headers || {}, null, 2) }}</pre>
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { apiClient, API_BASE_URL } from '../utils/api'

export default {
  name: 'ModelDetail',
  components: {
    ArrowLeftOutlined
  },
  setup() {
    // 定义表格列
    const columns = [
      {
        title: '追踪ID',
        dataIndex: 'traceId',
        key: 'traceId',
        width: 120
      },
      {
        title: 'IP地址',
        dataIndex: 'ip',
        key: 'ip',
        width: 120
      },
      {
        title: '请求时间',
        dataIndex: 'requestTime',
        key: 'requestTime',
        width: 150
      },
      {
        title: '响应时间',
        dataIndex: 'responseTime',
        key: 'responseTime',
        width: 150
      },
      {
        title: '操作',
        key: 'action',
        width: 150
      }
    ];
    
    const route = useRoute()
    const router = useRouter()
    
    const proxyId = route.params.proxyId
    const groupId = route.params.groupId
    const modelId = route.params.modelId
    
    const proxyName = ref('')
    const groupName = ref('')
    
    const loading = ref(true)
    const traceRecords = ref([])
    const currentPage = ref(1)
    const pageSize = ref(10)
    const totalRecords = ref(0)
    
    const traceDetailDialog = reactive({
      visible: false,
      data: null
    })
    
    // 格式化日期
    const formatDate = (timestamp) => {
      if (!timestamp) return '未知'
      const date = new Date(timestamp)
      return date.toLocaleString()
    }
    
    // 获取中转站和分组信息
    const fetchProxyAndGroupInfo = async () => {
      try {
        const proxyResponse = await apiClient.get(`/proxies/${proxyId}`)
        proxyName.value = proxyResponse.data.name
        
        const group = proxyResponse.data.groups.find(g => g.id === groupId)
        if (group) {
          groupName.value = group.name
        }
      } catch (error) {
        console.error('获取中转站和分组信息失败:', error)
        message.error('获取中转站和分组信息失败')
      }
    }
    
    // 获取溯源记录
    const fetchTraceRecords = async () => {
      try {
        const response = await apiClient.get(`/traces/model/${modelId}`, {
          params: {
            page: currentPage.value,
            limit: pageSize.value
          }
        })
        
        traceRecords.value = response.data.items
        totalRecords.value = response.data.total
      } catch (error) {
        console.error('获取溯源记录失败:', error)
        message.error('获取溯源记录失败')
      } finally {
        loading.value = false
      }
    }
    
    // 查看溯源详情
    const viewTraceDetail = async (trace) => {
      try {
        const response = await apiClient.get(`/traces/${trace.id}`)
        traceDetailDialog.data = response.data
        traceDetailDialog.visible = true
      } catch (error) {
        console.error('获取溯源详情失败:', error)
        message.error('获取溯源详情失败')
      }
    }
    
    // 处理分页变化
    const handlePageChange = (page, size) => {
      currentPage.value = page
      pageSize.value = size
      fetchTraceRecords()
    }
    
    // 返回上一页
    const goBack = () => {
      router.go(-1)
    }
    
    onMounted(async () => {
      await fetchProxyAndGroupInfo()
      await fetchTraceRecords()
    })
    
    return {
      proxyName,
      groupName,
      modelId,
      loading,
      traceRecords,
      currentPage,
      pageSize,
      totalRecords,
      traceDetailDialog,
      columns,
      formatDate,
      viewTraceDetail,
      handlePageChange,
      goBack
    }
  }
}
</script>

<style scoped>
/* 页面布局 */
.page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  position: relative;
}

.page-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 40px;
  height: 3px;
  background: var(--primary-color);
  border-radius: 3px;
}

.page-actions {
  display: flex;
  gap: 12px;
}

.back-button {
  border-radius: var(--radius-md);
  font-weight: 500;
  height: 38px;
  padding: 0 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.back-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* 卡片样式 */
.main-card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

:deep(.ant-card-body) {
  padding: 24px;
}

.loading-container {
  padding: 20px 0;
}

/* 溯源记录样式 */
.trace-records {
  margin-top: 30px;
}

:deep(.ant-descriptions) {
  background-color: var(--bg-white);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

:deep(.ant-descriptions-title) {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 16px 24px;
  margin-bottom: 0;
  border-bottom: 1px solid var(--border-color);
  background-color: rgba(59, 130, 246, 0.03);
}

:deep(.ant-descriptions-item-label) {
  background-color: rgba(59, 130, 246, 0.05);
  font-weight: 500;
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

.records-table {
  margin-top: 20px;
}

/* 表格样式 */
:deep(.ant-table) {
  border-radius: var(--radius-md);
  overflow: hidden;
}

:deep(.ant-table-thead > tr > th) {
  background-color: rgba(59, 130, 246, 0.05);
  font-weight: 600;
  color: var(--text-primary);
}

:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--border-color);
}

:deep(.ant-table-tbody > tr:hover > td) {
  background-color: rgba(59, 130, 246, 0.05);
}

:deep(.ant-table-tbody > tr:last-child > td) {
  border-bottom: none;
}

:deep(.ant-btn) {
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

:deep(.ant-btn:hover) {
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.empty-data {
  padding: 32px 0;
  text-align: center;
  background-color: var(--bg-white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

:deep(.ant-empty-description) {
  color: var(--text-secondary);
  font-size: 14px;
}

.pagination-container {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

:deep(.ant-pagination-item) {
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

:deep(.ant-pagination-item-active) {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

:deep(.ant-pagination-item-active a) {
  color: white;
}

:deep(.ant-pagination-item:hover) {
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* 溯源详情对话框样式 */
:deep(.ant-modal-content) {
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

:deep(.ant-modal-header) {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-white);
}

:deep(.ant-modal-title) {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

:deep(.ant-modal-body) {
  padding: 24px;
  background-color: var(--bg-light);
}

:deep(.ant-modal-footer) {
  border-top: 1px solid var(--border-color);
  padding: 12px 24px;
  background-color: var(--bg-white);
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f8fafc;
  padding: 16px;
  border-radius: var(--radius-md);
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #334155;
}
</style>
