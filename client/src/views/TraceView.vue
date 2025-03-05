<template>
  <div class="trace-container">
    <h1>OpenAI API 溯源</h1>
    
    <el-card class="trace-form">
      <el-form :model="form" label-width="120px" @submit.prevent="startTrace">
        <el-form-item label="中转站URL" required>
          <el-input v-model="form.baseUrl" placeholder="例如: https://api.example.com"></el-input>
        </el-form-item>
        <el-form-item label="API Key" required>
          <el-input v-model="form.key" placeholder="输入API Key" show-password></el-input>
        </el-form-item>
        <el-form-item label="模型" required>
          <el-input v-model="form.model" placeholder="例如: gpt-4-vision-preview"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="startTrace" :loading="loading">开始溯源</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-divider content-position="center">溯源结果</el-divider>
    
    <TraceDetail :trace="currentTrace" />
    
    <el-divider content-position="center">历史记录</el-divider>
    
    <div class="trace-history-header">
      <h3>溯源历史记录</h3>
      <el-button 
        type="danger" 
        :disabled="selectedTraces.length === 0" 
        @click="deleteSelectedTraces"
      >
        删除选中记录
      </el-button>
    </div>
    
    <el-table
      v-loading="historyLoading"
      :data="traceHistory.items"
      style="width: 100%"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55"></el-table-column>
      <el-table-column prop="id" label="ID" width="280"></el-table-column>
      <el-table-column prop="baseUrl" label="中转站URL"></el-table-column>
      <el-table-column prop="model" label="模型"></el-table-column>
      <el-table-column label="请求时间" width="180">
        <template #default="scope">
          {{ formatDate(scope.row.requestTime) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="scope">
          <el-button type="text" @click.stop="viewTrace(scope.row)">查看</el-button>
          <el-popconfirm
            title="确定要删除这条溯源记录吗？"
            @confirm="deleteTrace(scope.row.id)"
            @click.stop
          >
            <template #reference>
              <el-button type="text" style="color: #F56C6C;">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
    
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="traceHistory.total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      ></el-pagination>
    </div>
  </div>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus';
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
        model: 'gpt-4-vision-preview'
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
      selectedTraces: []
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
        ElMessage.warning('请填写所有必填字段');
        return;
      }
      
      this.loading = true;
      
      try {
        const response = await apiClient.post('/traces', this.form);
        this.currentTrace = response.data;
        ElMessage.success('溯源成功');
        this.fetchTraceHistory();
      } catch (error) {
        console.error('溯源失败:', error);
        ElMessage.error('溯源失败: ' + (error.response?.data?.message || error.message));
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
        ElMessage.error('获取溯源历史失败: ' + (error.response?.data?.message || error.message));
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
        ElMessage.error('获取溯源详情失败: ' + (error.response?.data?.message || error.message));
      }
    },
    async deleteTrace(id) {
      try {
        await apiClient.delete(`/traces/${id}`);
        ElMessage.success('删除成功');
        
        // 如果删除的是当前查看的记录，清空当前记录
        if (this.currentTrace && this.currentTrace.id === id) {
          this.currentTrace = null;
        }
        
        // 刷新列表
        this.fetchTraceHistory();
      } catch (error) {
        console.error('删除溯源记录失败:', error);
        ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message));
      }
    },
    handleSelectionChange(selection) {
      this.selectedTraces = selection;
    },
    async deleteSelectedTraces() {
      if (this.selectedTraces.length === 0) {
        return;
      }
      
      try {
        await ElMessageBox.confirm(
          `确定要删除选中的 ${this.selectedTraces.length} 条记录吗？`,
          '删除确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );
        
        // 逐个删除选中的记录
        const deletePromises = this.selectedTraces.map(trace => 
          apiClient.delete(`/traces/${trace.id}`)
        );
        
        await Promise.all(deletePromises);
        
        ElMessage.success(`成功删除 ${this.selectedTraces.length} 条记录`);
        
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
          ElMessage.error('批量删除失败: ' + (error.response?.data?.message || error.message));
        }
      }
    },
    handleRowClick(row) {
      this.viewTrace(row);
    },
    handleSizeChange(size) {
      this.pageSize = size;
      this.fetchTraceHistory();
    },
    handleCurrentChange(page) {
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
