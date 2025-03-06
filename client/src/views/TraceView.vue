<template>
  <div class="trace-container">
    <h1>OpenAI API 溯源</h1>
    
    <a-card class="trace-form">
      <a-form :model="form" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }" @submit.prevent="startTrace">
        <a-form-item label="中转站URL" required>
          <a-input v-model:value="form.baseUrl" placeholder="例如: https://api.example.com" />
        </a-form-item>
        <a-form-item label="API Key" required>
          <a-input-password v-model:value="form.key" placeholder="输入API Key" />
        </a-form-item>
        <a-form-item label="模型" required>
          <a-input v-model:value="form.model" placeholder="例如: gpt-4o" />
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 4, span: 20 }">
          <a-button type="primary" @click="startTrace" :loading="loading">开始溯源</a-button>
        </a-form-item>
      </a-form>
    </a-card>
    
    <a-divider>溯源结果</a-divider>
    
    <TraceDetail :trace="currentTrace" />
    
    <a-divider>历史记录</a-divider>
    
    <div class="trace-history-header">
      <h3>溯源历史记录</h3>
      <a-button 
        type="danger" 
        :disabled="selectedTraces.length === 0" 
        @click="deleteSelectedTraces"
      >
        删除选中记录
      </a-button>
    </div>
    
    <a-table
      :loading="historyLoading"
      :dataSource="traceHistory.items"
      :columns="columns"
      :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
      style="width: 100%"
      @row-click="handleRowClick"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'requestTime'">
          {{ formatDate(record.requestTime) }}
        </template>
        <template v-if="column.key === 'responseTime'">
          {{ formatDate(record.responseTime) }}
        </template>
        <template v-if="column.key === 'ipPath'">
          {{ record.ipPath || record.ip }}
        </template>
        <template v-if="column.key === 'action'">
          <a-button type="primary" size="small" @click.stop="viewTrace(record)">查看</a-button>
          <a-button type="danger" size="small" style="margin-left: 8px" @click.stop="deleteTrace(record.id)">删除</a-button>
        </template>
      </template>
    </a-table>
    
    <div class="pagination">
      <a-pagination
        v-model:current="currentPage"
        v-model:pageSize="pageSize"
        :total="traceHistory.total"
        :pageSizeOptions="['10', '20', '50', '100']"
        showSizeChanger
        @change="handlePageChange"
        @showSizeChange="handleSizeChange"
        show-total
      />
    </div>
  </div>
</template>

<script>
import { message, Modal } from 'ant-design-vue';
import TraceDetail from '../components/TraceDetail.vue';
import { apiClient } from '../utils/api';

export default {
  name: 'TraceView',
  components: {
    TraceDetail
  },
  data() {
    return {
      form: {
        baseUrl: '',
        key: '',
        model: 'gpt-4o'
      },
      loading: false,
      currentTrace: null,
      traceHistory: {
        items: [],
        total: 0,
        page: 1,
        limit: 10
      },
      historyLoading: false,
      currentPage: 1,
      pageSize: 10,
      selectedTraces: [],
      selectedRowKeys: [],
      columns: [
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 280
        },
        {
          title: '中转站URL',
          dataIndex: 'baseUrl',
          key: 'baseUrl'
        },
        {
          title: '模型',
          dataIndex: 'model',
          key: 'model'
        },
        {
          title: '请求时间',
          dataIndex: 'requestTime',
          key: 'requestTime',
          width: 180
        },
        {
          title: '响应时间',
          dataIndex: 'responseTime',
          key: 'responseTime',
          width: 180
        },
        {
          title: 'IP路径',
          dataIndex: 'ipPath',
          key: 'ipPath',
          minWidth: 200
        },
        {
          title: '操作',
          key: 'action',
          width: 120
        }
      ]
    };
  },
  created() {
    this.fetchTraceHistory();
    this.parseQueryParams();
  },
  methods: {
    parseQueryParams() {
      // 从URL获取查询参数
      const urlParams = new URLSearchParams(window.location.search);
      
      // 填充表单
      if (urlParams.has('baseUrl')) {
        this.form.baseUrl = urlParams.get('baseUrl');
      }
      
      if (urlParams.has('key')) {
        this.form.key = urlParams.get('key');
      }
      
      if (urlParams.has('model')) {
        this.form.model = urlParams.get('model');
      }
    },
    async startTrace() {
      if (!this.form.baseUrl || !this.form.key || !this.form.model) {
        message.warning('请填写所有必填字段');
        return;
      }
      
      this.loading = true;
      
      try {
        const response = await apiClient.post('/traces', this.form);
        this.currentTrace = response.data;
        message.success('溯源成功');
        this.fetchTraceHistory();
      } catch (error) {
        console.error('溯源失败:', error);
        message.error('溯源失败: ' + (error.response?.data?.message || error.message));
      } finally {
        this.loading = false;
      }
    },
    async fetchTraceHistory() {
      this.historyLoading = true;
      
      try {
        const response = await apiClient.get('/traces', {
          params: {
            page: this.currentPage,
            limit: this.pageSize
          }
        });
        
        this.traceHistory = response.data;
      } catch (error) {
        console.error('获取溯源历史失败:', error);
        message.error('获取溯源历史失败: ' + (error.response?.data?.message || error.message));
      } finally {
        this.historyLoading = false;
      }
    },
    async viewTrace(trace) {
      try {
        const response = await apiClient.get(`/traces/${trace.id}`);
        this.currentTrace = response.data;
      } catch (error) {
        console.error('获取溯源详情失败:', error);
        message.error('获取溯源详情失败: ' + (error.response?.data?.message || error.message));
      }
    },
    async deleteTrace(id) {
      try {
        await apiClient.delete(`/traces/${id}`);
        message.success('删除成功');
        
        // 如果删除的是当前查看的记录，清空当前记录
        if (this.currentTrace && this.currentTrace.id === id) {
          this.currentTrace = null;
        }
        
        // 刷新列表
        this.fetchTraceHistory();
      } catch (error) {
        console.error('删除溯源记录失败:', error);
        message.error('删除失败: ' + (error.response?.data?.message || error.message));
      }
    },
    onSelectChange(selectedRowKeys, selectedRows) {
      this.selectedRowKeys = selectedRowKeys;
      this.selectedTraces = selectedRows;
    },
    async deleteSelectedTraces() {
      if (this.selectedTraces.length === 0) {
        return;
      }
      
      try {
        await new Promise((resolve, reject) => {
          Modal.confirm({
            title: '删除确认',
            content: `确定要删除选中的 ${this.selectedTraces.length} 条记录吗？`,
            okText: '确定',
            cancelText: '取消',
            onOk: () => resolve(),
            onCancel: () => reject('cancel')
          });
        });
        
        // 逐个删除选中的记录
        const deletePromises = this.selectedTraces.map(trace => 
          apiClient.delete(`/traces/${trace.id}`)
        );
        
        await Promise.all(deletePromises);
        
        message.success(`成功删除 ${this.selectedTraces.length} 条记录`);
        
        // 如果当前查看的记录在删除列表中，清空当前记录
        if (this.currentTrace && this.selectedTraces.some(t => t.id === this.currentTrace.id)) {
          this.currentTrace = null;
        }
        
        // 清空选中列表并刷新
        this.selectedTraces = [];
        this.fetchTraceHistory();
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量删除失败:', error);
          message.error('批量删除失败: ' + (error.response?.data?.message || error.message));
        }
      }
    },
    handleRowClick(row) {
      this.viewTrace(row);
    },
    handleSizeChange(page, size) {
      this.pageSize = size;
      this.currentPage = 1; // 当改变每页条数时，重置为第一页
      this.fetchTraceHistory();
    },
    handlePageChange(page, pageSize) {
      this.currentPage = page;
      this.fetchTraceHistory();
    },
    formatDate(timestamp) {
      if (!timestamp) return '未知';
      const date = new Date(parseInt(timestamp));
      return date.toLocaleString();
    }
  }
};
</script>

<style scoped>
.trace-container {
  padding: 20px;
}

.trace-form {
  margin-bottom: 20px;
}

.trace-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
