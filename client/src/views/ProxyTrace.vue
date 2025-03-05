<template>
  <div class="proxy-trace page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">中转溯源</span>
        </div>
      </template>
      
      <div class="form-container">
        <el-form :model="traceForm" :rules="traceRules" ref="traceFormRef" label-width="120px">
          <el-form-item label="Base URL" prop="baseUrl">
            <el-input v-model="traceForm.baseUrl" placeholder="请输入中转站Base URL" />
          </el-form-item>
          
          <el-form-item label="API Key" prop="key">
            <el-input v-model="traceForm.key" placeholder="请输入API Key" show-password />
          </el-form-item>
          
          <el-form-item label="模型" prop="model">
            <el-input v-model="traceForm.model" placeholder="请输入模型ID" />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="startTrace">开始溯源</el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <div v-if="traceStarted" class="trace-result">
        <el-divider content-position="center">溯源结果</el-divider>
        
        <div v-if="traceLoading" class="trace-loading">
          <el-skeleton :rows="3" animated />
        </div>
        
        <div v-else>
          <el-alert
            :title="traceSuccess ? '溯源成功' : '溯源失败'"
            :type="traceSuccess ? 'success' : 'error'"
            :description="traceMessage"
            show-icon
            :closable="false"
          />
          
          <div v-if="traceSuccess && traceResult" class="trace-info">
            <el-descriptions title="溯源信息" :column="1" border>
              <el-descriptions-item label="追踪ID">{{ traceResult.traceId }}</el-descriptions-item>
              <el-descriptions-item label="中转站">{{ traceForm.baseUrl }}</el-descriptions-item>
              <el-descriptions-item label="模型">{{ traceForm.model }}</el-descriptions-item>
              <el-descriptions-item label="IP地址">{{ traceResult.ip }}</el-descriptions-item>
              <el-descriptions-item label="User Agent">{{ traceResult.userAgent }}</el-descriptions-item>
              <el-descriptions-item label="请求时间">{{ formatDate(traceResult.requestTime) }}</el-descriptions-item>
              <el-descriptions-item label="响应时间">{{ formatDate(traceResult.responseTime) }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </div>
      
      <div class="trace-history">
        <el-divider content-position="center">溯源历史</el-divider>
        
        <div v-if="traceHistory.length === 0" class="empty-data">
          <el-empty description="暂无溯源历史" />
        </div>
        
        <div v-else class="history-table">
          <el-table :data="traceHistory" style="width: 100%" border>
            <el-table-column prop="traceId" label="追踪ID" min-width="120" />
            <el-table-column prop="baseUrl" label="中转站" min-width="180" show-overflow-tooltip />
            <el-table-column prop="model" label="模型" min-width="120" />
            <el-table-column prop="ip" label="IP地址" min-width="120" />
            <el-table-column label="请求时间" min-width="150">
              <template #default="scope">
                {{ formatDate(scope.row.requestTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button size="small" type="primary" @click="viewTraceDetail(scope.row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="totalTraces"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 溯源详情对话框 -->
    <el-dialog v-model="traceDetailDialog.visible" title="溯源详情" width="600px">
      <div v-if="traceDetailDialog.data">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="追踪ID">{{ traceDetailDialog.data.traceId }}</el-descriptions-item>
          <el-descriptions-item label="中转站">{{ traceDetailDialog.data.baseUrl }}</el-descriptions-item>
          <el-descriptions-item label="模型">{{ traceDetailDialog.data.model }}</el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ traceDetailDialog.data.ip }}</el-descriptions-item>
          <el-descriptions-item label="User Agent">{{ traceDetailDialog.data.userAgent }}</el-descriptions-item>
          <el-descriptions-item label="请求时间">{{ formatDate(traceDetailDialog.data.requestTime) }}</el-descriptions-item>
          <el-descriptions-item label="响应时间">{{ formatDate(traceDetailDialog.data.responseTime) }}</el-descriptions-item>
          <el-descriptions-item label="请求头">
            <pre>{{ JSON.stringify(traceDetailDialog.data.headers || {}, null, 2) }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { apiClient, API_BASE_URL } from '../utils/api'

export default {
  name: 'ProxyTrace',
  setup() {
    const route = useRoute()
    
    const traceFormRef = ref(null)
    const traceForm = reactive({
      baseUrl: '',
      key: '',
      model: ''
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
      
      await traceFormRef.value.validate(async (valid) => {
        if (valid) {
          traceStarted.value = true
          traceLoading.value = true
          
          try {
            const response = await apiClient.post('/traces', {
              baseUrl: traceForm.baseUrl,
              key: traceForm.key,
              model: traceForm.model
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
        }
      })
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
        ElMessage.error('获取溯源历史失败')
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
        ElMessage.error('获取溯源详情失败')
      }
    }
    
    // 处理分页大小变化
    const handleSizeChange = (size) => {
      pageSize.value = size
      fetchTraceHistory()
    }
    
    // 处理页码变化
    const handleCurrentChange = (page) => {
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
      traceDetailDialog,
      formatDate,
      startTrace,
      resetForm,
      viewTraceDetail,
      handleSizeChange,
      handleCurrentChange
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
