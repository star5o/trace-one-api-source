<template>
  <div class="model-detail page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">模型溯源记录</span>
          <el-button @click="goBack">返回</el-button>
        </div>
      </template>
      
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else>
        <el-descriptions title="模型信息" :column="1" border>
          <el-descriptions-item label="中转站">{{ proxyName }}</el-descriptions-item>
          <el-descriptions-item label="分组">{{ groupName }}</el-descriptions-item>
          <el-descriptions-item label="模型ID">{{ modelId }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="trace-records">
          <el-divider content-position="center">溯源记录</el-divider>
          
          <div v-if="traceRecords.length === 0" class="empty-data">
            <el-empty description="暂无溯源记录" />
          </div>
          
          <div v-else class="records-table">
            <el-table :data="traceRecords" style="width: 100%" border>
              <el-table-column prop="traceId" label="追踪ID" min-width="120" />
              <el-table-column prop="ip" label="IP地址" min-width="120" />
              <el-table-column label="请求时间" min-width="150">
                <template #default="scope">
                  {{ formatDate(scope.row.requestTime) }}
                </template>
              </el-table-column>
              <el-table-column label="响应时间" min-width="150">
                <template #default="scope">
                  {{ formatDate(scope.row.responseTime) }}
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
                :total="totalRecords"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
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
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

export default {
  name: 'ModelDetail',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const API_BASE_URL = 'http://localhost:3000/api'
    
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
        const proxyResponse = await axios.get(`${API_BASE_URL}/proxies/${proxyId}`)
        proxyName.value = proxyResponse.data.name
        
        const group = proxyResponse.data.groups.find(g => g.id === groupId)
        if (group) {
          groupName.value = group.name
        }
      } catch (error) {
        console.error('获取中转站和分组信息失败:', error)
        ElMessage.error('获取中转站和分组信息失败')
      }
    }
    
    // 获取溯源记录
    const fetchTraceRecords = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/traces/model/${modelId}`, {
          params: {
            page: currentPage.value,
            limit: pageSize.value
          }
        })
        
        traceRecords.value = response.data.items
        totalRecords.value = response.data.total
      } catch (error) {
        console.error('获取溯源记录失败:', error)
        ElMessage.error('获取溯源记录失败')
      } finally {
        loading.value = false
      }
    }
    
    // 查看溯源详情
    const viewTraceDetail = async (trace) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/traces/${trace.id}`)
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
      fetchTraceRecords()
    }
    
    // 处理页码变化
    const handleCurrentChange = (page) => {
      currentPage.value = page
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
      formatDate,
      viewTraceDetail,
      handleSizeChange,
      handleCurrentChange,
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
