<template>
  <div class="proxy-trace page-container">
    <a-card>
      <template #title>
        <div class="card-header">
          <span class="title">中转溯源</span>
        </div>
      </template>
      
      <div class="form-container">
        <a-form :model="traceForm" :rules="traceRules" ref="traceFormRef" 
          :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
          <a-form-item label="Base URL" name="baseUrl">
            <a-input v-model:value="traceForm.baseUrl" placeholder="请输入中转站Base URL" />
          </a-form-item>
          
          <a-form-item label="API Key" name="key">
            <a-input-password v-model:value="traceForm.key" placeholder="请输入API Key" />
          </a-form-item>
          
          <a-form-item label="模型" name="model">
            <a-input v-model:value="traceForm.model" placeholder="请输入模型ID" />
          </a-form-item>
          
          <a-form-item label="分组名称" name="groupName">
            <a-input v-model:value="traceForm.groupName" placeholder="请输入分组名称（非必填）" />
          </a-form-item>
          
          <a-form-item :wrapper-col="{ offset: 4, span: 20 }">
            <a-button type="primary" @click="startTrace">开始溯源</a-button>
            <a-button style="margin-left: 10px" @click="resetForm">重置</a-button>
          </a-form-item>
        </a-form>
      </div>
      
      <div v-if="traceStarted" class="trace-result">
        <a-divider>溯源结果</a-divider>
        
        <div v-if="traceLoading" class="trace-loading">
          <a-skeleton :rows="3" active />
        </div>
        
        <div v-else>
          <a-alert
            :message="traceSuccess ? '溯源成功' : '溯源失败'"
            :description="traceMessage"
            :type="traceSuccess ? 'success' : 'error'"
            show-icon
          />
          
          <div v-if="traceSuccess && traceResult" class="trace-info">
            <a-descriptions title="溯源信息" :column="1" bordered>
              <a-descriptions-item label="追踪ID">{{ traceResult.traceId }}</a-descriptions-item>
              <a-descriptions-item label="中转站">{{ traceForm.baseUrl }}</a-descriptions-item>
              <a-descriptions-item label="模型">{{ traceForm.model }}</a-descriptions-item>
              <a-descriptions-item label="分组名称">{{ traceForm.groupName || '无' }}</a-descriptions-item>
              <a-descriptions-item label="IP地址">{{ traceResult.ip }}</a-descriptions-item>
              <a-descriptions-item label="User Agent">{{ traceResult.userAgent }}</a-descriptions-item>
              <a-descriptions-item label="请求时间">{{ formatDate(traceResult.requestTime) }}</a-descriptions-item>
              <a-descriptions-item label="响应时间">{{ formatDate(traceResult.responseTime) }}</a-descriptions-item>
            </a-descriptions>
          </div>
        </div>
      </div>
      
      <div class="trace-history">
        <a-divider>溯源历史</a-divider>
        
        <div v-if="traceHistory.length === 0" class="empty-data">
          <a-empty description="暂无溯源历史" />
        </div>
        
        <div v-else class="history-table">
          <a-table :dataSource="traceHistory" :columns="columns" bordered>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'requestTime'">
                {{ formatDate(record.requestTime) }}
              </template>
              <template v-if="column.key === 'action'">
                <a-button type="primary" size="small" @click="viewTraceDetail(record)">查看详情</a-button>
              </template>
            </template>
          </a-table>
          
          <div class="pagination-container">
            <a-pagination
              v-model:current="currentPage"
              v-model:pageSize="pageSize"
              :total="totalTraces"
              :showSizeChanger="true"
              :pageSizeOptions="['10', '20', '50', '100']"
              @change="handlePageChange"
              @showSizeChange="handleSizeChange"
              show-size-changer
              show-total
            />
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
          <a-descriptions-item label="分组名称">{{ traceDetailDialog.data.groupName || '无' }}</a-descriptions-item>
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
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { message } from 'ant-design-vue'
import { apiClient, API_BASE_URL } from '../utils/api'

export default {
  name: 'ProxyTrace',
  setup() {
    const route = useRoute()
    
    const traceFormRef = ref(null)
    const traceForm = reactive({
      baseUrl: '',
      key: '',
      model: '',
      groupName: ''
    })
    
    const traceRules = {
      baseUrl: [
        { required: true, message: '请输入中转站Base URL', trigger: 'blur' },
        { pattern: /^https?:\/\/.+/i, message: '请输入有效的URL地址', trigger: 'blur' }
      ],
      key: [
        { required: true, message: '请输入API Key', trigger: 'blur' }
      ],
      model: [
        { required: true, message: '请输入模型ID', trigger: 'blur' }
      ]
    }
    
    const traceStarted = ref(false)
    const traceLoading = ref(false)
    const traceSuccess = ref(false)
    const traceMessage = ref('')
    const traceResult = ref(null)
    
    const traceHistory = ref([])
    const currentPage = ref(1)
    const pageSize = ref(10)
    const totalTraces = ref(0)
    
    // 定义表格列
    const columns = [
      {
        title: '追踪ID',
        dataIndex: 'traceId',
        key: 'traceId',
        width: 120
      },
      {
        title: '中转站',
        dataIndex: 'baseUrl',
        key: 'baseUrl',
        width: 180,
        ellipsis: true
      },
      {
        title: '模型',
        dataIndex: 'model',
        key: 'model',
        width: 120
      },
      {
        title: '分组名称',
        dataIndex: 'groupName',
        key: 'groupName',
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
        title: '操作',
        key: 'action',
        width: 150
      }
    ]
    
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
    
    // 开始溯源
    const startTrace = async () => {
      if (!traceFormRef.value) return
      
      try {
        await traceFormRef.value.validate()
        
        traceStarted.value = true
        traceLoading.value = true
        
        try {
          const response = await apiClient.post('/traces', {
            baseUrl: traceForm.baseUrl,
            key: traceForm.key,
            model: traceForm.model,
            groupName: traceForm.groupName || ''
          })
          
          traceSuccess.value = true
          traceMessage.value = '溯源成功，已记录中转节点信息'
          traceResult.value = response.data
          
          // 刷新溯源历史
          fetchTraceHistory()
        } catch (error) {
          traceSuccess.value = false
          traceMessage.value = `溯源失败: ${error.response?.data?.message || error.message}`
          traceResult.value = null
        } finally {
          traceLoading.value = false
        }
      } catch (e) {
        // 表单验证失败
      }
    }
    
    // 重置表单
    const resetForm = () => {
      if (traceFormRef.value) {
        traceFormRef.value.resetFields()
      }
      traceStarted.value = false
      traceResult.value = null
    }
    
    // 获取溯源历史
    const fetchTraceHistory = async () => {
      try {
        const response = await apiClient.get('/traces', {
          params: {
            page: currentPage.value,
            limit: pageSize.value
          }
        })
        
        traceHistory.value = response.data.items
        totalTraces.value = response.data.total
      } catch (error) {
        console.error('获取溯源历史失败:', error)
        message.error('获取溯源历史失败')
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
    
    // 处理分页大小变化
    const handleSizeChange = (page, size) => {
      pageSize.value = size
      currentPage.value = 1 // 当改变每页条数时，重置为第一页
      fetchTraceHistory()
    }
    
    // 处理页码变化
    const handlePageChange = (page, pageSize) => {
      currentPage.value = page
      fetchTraceHistory()
    }
    
    // 监听路由参数变化，自动填充表单
    watch(() => route.query, (query) => {
      if (query.baseUrl) {
        traceForm.baseUrl = query.baseUrl
      }
      
      if (query.key) {
        traceForm.key = query.key
      }
      
      if (query.model) {
        traceForm.model = query.model
      }
      
      if (query.groupName) {
        traceForm.groupName = query.groupName
      }
    }, { immediate: true })
    
    onMounted(() => {
      fetchTraceHistory()
    })
    
    return {
      traceFormRef,
      traceForm,
      traceRules,
      traceStarted,
      traceLoading,
      traceSuccess,
      traceMessage,
      traceResult,
      traceHistory,
      currentPage,
      pageSize,
      totalTraces,
      columns,
      traceDetailDialog,
      formatDate,
      startTrace,
      resetForm,
      viewTraceDetail,
      handleSizeChange,
      handlePageChange
    }
  }
}
</script>

<style scoped>
.trace-result {
  margin-top: 30px;
}

.trace-loading {
  padding: 20px 0;
}

.trace-info {
  margin-top: 20px;
}

.trace-history {
  margin-top: 30px;
}

.history-table {
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
