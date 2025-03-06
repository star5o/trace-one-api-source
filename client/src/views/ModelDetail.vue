<template>
  <div class="model-detail page-container">
    <a-card>
      <template #title>
        <div class="card-header">
          <span class="title">模型溯源记录</span>
          <a-button @click="goBack">返回</a-button>
        </div>
      </template>
      
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
import { apiClient, API_BASE_URL } from '../utils/api'

export default {
  name: 'ModelDetail',
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
.loading-container {
  padding: 20px 0;
}

.trace-records {
  margin-top: 30px;
}

.records-table {
  margin-top: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}
</style>
