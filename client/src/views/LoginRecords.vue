<template>
  <div class="login-records-container">
    <a-card title="登录记录" :bordered="false">
      <template #extra>
        <div class="card-extra">
          <a-radio-group v-model:value="filterType" button-style="solid" class="filter-btns">
            <a-radio-button value="all">全部记录</a-radio-button>
            <a-radio-button value="failed">仅失败记录</a-radio-button>
          </a-radio-group>
          <a-button type="primary" danger @click="confirmClear" class="clear-btn">清空记录</a-button>
        </div>
      </template>
      
      <a-table
        :dataSource="loginRecords"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        rowKey="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'success'">
            <a-tag :color="record.success ? 'success' : 'error'">
              {{ record.success ? '成功' : '失败' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'ip'">
            <span :class="{'highlight-ip': !record.success}">{{ record.ip || '-' }}</span>
          </template>
          <template v-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
        </template>
      </a-table>
    </a-card>
    
    <a-modal
      v-model:visible="clearModalVisible"
      title="确认清空"
      okText="确认"
      cancelText="取消"
      @ok="clearRecords"
    >
      <p>确定要清空所有登录记录吗？此操作不可恢复！</p>
    </a-modal>
  </div>
</template>

<script>
import { ref, reactive, onMounted, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import axios from 'axios'
import { getToken } from '../store/auth'

export default {
  name: 'LoginRecords',
  setup() {
    const loginRecords = ref([])
    const loading = ref(false)
    const clearModalVisible = ref(false)
    const total = ref(0)
    const filterType = ref('all')
    const allRecords = ref([])
    
    const pagination = reactive({
      current: 1,
      pageSize: 10,
      total: 0,
      showTotal: (total) => `共 ${total} 条记录`
    })
    
    const columns = [
      {
        title: '状态',
        dataIndex: 'success',
        key: 'success',
        width: '8%'
      },
      {
        title: 'IP地址',
        dataIndex: 'ip',
        key: 'ip',
        width: '18%'
      },
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
        width: '13%'
      },
      {
        title: '原因/错误信息',
        dataIndex: 'reason',
        key: 'reason',
        width: '20%'
      },
      {
        title: '输入的密码',
        dataIndex: 'password',
        key: 'password',
        width: '13%',
        ellipsis: true
      },
      {
        title: '时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: '13%',
        sorter: true
      },
      {
        title: '浏览器信息',
        dataIndex: 'userAgent',
        key: 'userAgent',
        width: '15%',
        ellipsis: true
      }
    ]
    
    // 加载登录记录
    const fetchLoginRecords = async (page = 1, limit = 10) => {
      loading.value = true
      try {
        const token = getToken()
        const response = await axios.get('/api/auth/login-records', {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            page,
            limit
          }
        })
        
        allRecords.value = response.data.items
        applyFilter()
        
        total.value = response.data.total
        pagination.total = response.data.total
        pagination.current = response.data.page
        pagination.pageSize = response.data.limit
      } catch (error) {
        console.error('获取登录记录失败:', error)
        message.error('获取登录记录失败')
      } finally {
        loading.value = false
      }
    }
    
    // 应用过滤
    const applyFilter = () => {
      if (filterType.value === 'all') {
        loginRecords.value = allRecords.value
      } else if (filterType.value === 'failed') {
        loginRecords.value = allRecords.value.filter(record => !record.success)
      }
    }
    
    // 监听过滤类型变化
    watch(filterType, () => {
      applyFilter()
    })
    
    // 表格变化处理
    const handleTableChange = (pag) => {
      // 保存当前过滤状态，重新获取数据
      const currentFilter = filterType.value
      fetchLoginRecords(pag.current, pag.pageSize).then(() => {
        filterType.value = currentFilter
        applyFilter()
      })
    }
    
    // 格式化日期
    const formatDate = (timestamp) => {
      if (!timestamp) return ''
      const date = new Date(parseInt(timestamp))
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    }
    
    // 显示清空确认对话框
    const confirmClear = () => {
      clearModalVisible.value = true
    }
    
    // 清空登录记录
    const clearRecords = async () => {
      try {
        const token = getToken()
        await axios.delete('/api/auth/login-records', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        
        message.success('登录记录已清空')
        allRecords.value = []
        loginRecords.value = []
        total.value = 0
        pagination.total = 0
        fetchLoginRecords()
      } catch (error) {
        console.error('清空登录记录失败:', error)
        message.error('清空登录记录失败')
      } finally {
        clearModalVisible.value = false
      }
    }
    
    onMounted(() => {
      fetchLoginRecords()
    })
    
    return {
      loginRecords,
      columns,
      loading,
      pagination,
      clearModalVisible,
      filterType,
      formatDate,
      handleTableChange,
      confirmClear,
      clearRecords
    }
  }
}
</script>

<style scoped>
.login-records-container {
  padding: 20px;
}

.highlight-ip {
  font-weight: bold;
  color: #ff4d4f;
}

.card-extra {
  display: flex;
  align-items: center;
}

.filter-btns {
  margin-right: 12px;
}

.clear-btn {
  margin-left: 8px;
}
</style> 