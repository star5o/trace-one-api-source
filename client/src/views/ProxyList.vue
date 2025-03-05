<template>
  <div class="proxy-list page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">中转站列表</span>
          <el-button type="primary" @click="openAddProxyDialog">添加中转站</el-button>
        </div>
      </template>
      
      <div v-if="proxyList.length === 0" class="empty-data">
        <el-empty description="暂无中转站数据" />
      </div>
      
      <div v-else class="proxy-table">
        <el-table :data="proxyList" style="width: 100%" border>
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column prop="baseUrl" label="Base URL" min-width="200" />
          <el-table-column label="分组数量" min-width="100">
            <template #default="scope">
              {{ scope.row.groups ? scope.row.groups.length : 0 }}
            </template>
          </el-table-column>
          <el-table-column label="模型数量" min-width="100">
            <template #default="scope">
              {{ getModelCount(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="250">
            <template #default="scope">
              <el-button size="small" @click="viewProxyDetail(scope.row)">查看详情</el-button>
              <el-button size="small" type="primary" @click="openEditProxyDialog(scope.row)">编辑</el-button>
              <el-button size="small" type="danger" @click="confirmDeleteProxy(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 中转站详情抽屉 -->
    <el-drawer v-model="proxyDetailDrawer.visible" :title="proxyDetailDrawer.title" size="50%">
      <div v-if="currentProxy">
        <el-tabs v-model="proxyDetailDrawer.activeTab">
          <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="名称">{{ currentProxy.name }}</el-descriptions-item>
              <el-descriptions-item label="Base URL">{{ currentProxy.baseUrl }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDate(currentProxy.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="更新时间">{{ formatDate(currentProxy.updatedAt) }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          
          <el-tab-pane label="分组管理" name="groups">
            <div class="action-bar">
              <el-button type="primary" @click="openAddGroupDialog">添加分组</el-button>
            </div>
            
            <div v-if="!currentProxy.groups || currentProxy.groups.length === 0" class="empty-data">
              <el-empty description="暂无分组数据" />
            </div>
            
            <div v-else class="group-table">
              <el-table :data="currentProxy.groups" style="width: 100%" border>
                <el-table-column prop="name" label="分组名称" min-width="120" />
                <el-table-column prop="key" label="API Key" min-width="200" show-overflow-tooltip />
                <el-table-column label="模型数量" min-width="100">
                  <template #default="scope">
                    {{ scope.row.models ? scope.row.models.length : 0 }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="250">
                  <template #default="scope">
                    <el-button size="small" @click="refreshModels(currentProxy, scope.row)">刷新模型</el-button>
                    <el-button size="small" type="primary" @click="openEditGroupDialog(scope.row)">编辑</el-button>
                    <el-button size="small" type="danger" @click="confirmDeleteGroup(scope.row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="模型列表" name="models">
            <div v-if="!currentProxy.groups || !hasModels(currentProxy)" class="empty-data">
              <el-empty description="暂无模型数据" />
            </div>
            
            <div v-else>
              <el-collapse>
                <el-collapse-item v-for="group in currentProxy.groups" :key="group.id" :title="group.name">
                  <div v-if="!group.models || group.models.length === 0" class="empty-data">
                    <el-empty description="暂无模型数据" />
                    <el-button type="primary" @click="refreshModels(currentProxy, group)">刷新模型</el-button>
                  </div>
                  
                  <div v-else class="model-table">
                    <el-table :data="group.models" style="width: 100%" border>
                      <el-table-column prop="id" label="模型ID" min-width="200" />
                      <el-table-column prop="created" label="创建时间" min-width="150">
                        <template #default="scope">
                          {{ formatDate(scope.row.created * 1000) }}
                        </template>
                      </el-table-column>
                      <el-table-column label="操作" width="250">
                        <template #default="scope">
                          <el-button size="small" type="primary" @click="sendToTrace(currentProxy, group, scope.row)">发送到溯源</el-button>
                          <el-button size="small" @click="viewModelDetail(currentProxy.id, group.id, scope.row.id)">查看溯源记录</el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>

    <!-- 添加/编辑中转站对话框 -->
    <el-dialog 
      v-model="proxyDialog.visible" 
      :title="proxyDialog.isEdit ? '编辑中转站' : '添加中转站'"
      width="500px"
    >
      <el-form 
        ref="proxyFormRef"
        :model="proxyForm" 
        :rules="proxyRules" 
        label-width="100px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="proxyForm.name" placeholder="请输入中转站名称" />
        </el-form-item>
        <el-form-item label="Base URL" prop="baseUrl">
          <el-input v-model="proxyForm.baseUrl" placeholder="请输入中转站Base URL" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="proxyDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="submitProxyForm">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加/编辑分组对话框 -->
    <el-dialog 
      v-model="groupDialog.visible" 
      :title="groupDialog.isEdit ? '编辑分组' : '添加分组'"
      width="500px"
    >
      <el-form 
        ref="groupFormRef"
        :model="groupForm" 
        :rules="groupRules" 
        label-width="100px"
      >
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="groupForm.name" placeholder="请输入分组名称" />
        </el-form-item>
        <el-form-item label="API Key" prop="key">
          <el-input v-model="groupForm.key" placeholder="请输入API Key" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="groupDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="submitGroupForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'ProxyList',
  setup() {
    const router = useRouter()
    const API_BASE_URL = 'http://localhost:3000/api'
    
    const proxyList = ref([])
    const currentProxy = ref(null)
    
    // 中转站详情抽屉
    const proxyDetailDrawer = reactive({
      visible: false,
      title: '',
      activeTab: 'info'
    })
    
    // 中转站表单
    const proxyFormRef = ref(null)
    const proxyForm = reactive({
      id: null,
      name: '',
      baseUrl: ''
    })
    
    const proxyRules = {
      name: [
        { required: true, message: '请输入中转站名称', trigger: 'blur' },
        { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
      ],
      baseUrl: [
        { required: true, message: '请输入中转站Base URL', trigger: 'blur' },
        { pattern: /^https?:\/\/.+/i, message: '请输入有效的URL地址', trigger: 'blur' }
      ]
    }
    
    const proxyDialog = reactive({
      visible: false,
      isEdit: false
    })
    
    // 分组表单
    const groupFormRef = ref(null)
    const groupForm = reactive({
      id: null,
      proxyId: null,
      name: '',
      key: ''
    })
    
    const groupRules = {
      name: [
        { required: true, message: '请输入分组名称', trigger: 'blur' },
        { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
      ],
      key: [
        { required: true, message: '请输入API Key', trigger: 'blur' }
      ]
    }
    
    const groupDialog = reactive({
      visible: false,
      isEdit: false
    })
    
    // 获取中转站列表
    const fetchProxyList = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/proxies`)
        proxyList.value = response.data
      } catch (error) {
        console.error('获取中转站列表失败:', error)
        ElMessage.error('获取中转站列表失败')
      }
    }
    
    // 格式化日期
    const formatDate = (timestamp) => {
      if (!timestamp) return '未知'
      const date = new Date(timestamp)
      return date.toLocaleString()
    }
    
    // 获取模型总数
    const getModelCount = (proxy) => {
      if (!proxy.groups) return 0
      return proxy.groups.reduce((count, group) => {
        return count + (group.models ? group.models.length : 0)
      }, 0)
    }
    
    // 判断是否有模型
    const hasModels = (proxy) => {
      if (!proxy.groups) return false
      return proxy.groups.some(group => group.models && group.models.length > 0)
    }
    
    // 查看中转站详情
    const viewProxyDetail = (proxy) => {
      currentProxy.value = proxy
      proxyDetailDrawer.title = `${proxy.name} 详情`
      proxyDetailDrawer.visible = true
      proxyDetailDrawer.activeTab = 'info'
    }
    
    // 打开添加中转站对话框
    const openAddProxyDialog = () => {
      proxyForm.id = null
      proxyForm.name = ''
      proxyForm.baseUrl = ''
      proxyDialog.isEdit = false
      proxyDialog.visible = true
    }
    
    // 打开编辑中转站对话框
    const openEditProxyDialog = (proxy) => {
      proxyForm.id = proxy.id
      proxyForm.name = proxy.name
      proxyForm.baseUrl = proxy.baseUrl
      proxyDialog.isEdit = true
      proxyDialog.visible = true
    }
    
    // 提交中转站表单
    const submitProxyForm = async () => {
      if (!proxyFormRef.value) return
      
      await proxyFormRef.value.validate(async (valid) => {
        if (valid) {
          try {
            if (proxyDialog.isEdit) {
              // 编辑中转站
              await axios.put(`${API_BASE_URL}/proxies/${proxyForm.id}`, {
                name: proxyForm.name,
                baseUrl: proxyForm.baseUrl
              })
              ElMessage.success('中转站更新成功')
            } else {
              // 添加中转站
              await axios.post(`${API_BASE_URL}/proxies`, {
                name: proxyForm.name,
                baseUrl: proxyForm.baseUrl
              })
              ElMessage.success('中转站添加成功')
            }
            proxyDialog.visible = false
            fetchProxyList()
          } catch (error) {
            console.error('保存中转站失败:', error)
            ElMessage.error('保存中转站失败')
          }
        }
      })
    }
    
    // 确认删除中转站
    const confirmDeleteProxy = (proxy) => {
      ElMessageBox.confirm(
        `确定要删除中转站 "${proxy.name}" 吗？此操作将永久删除该中转站及其所有分组和模型数据。`,
        '警告',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(async () => {
        try {
          await axios.delete(`${API_BASE_URL}/proxies/${proxy.id}`)
          ElMessage.success('中转站删除成功')
          fetchProxyList()
          if (proxyDetailDrawer.visible && currentProxy.value && currentProxy.value.id === proxy.id) {
            proxyDetailDrawer.visible = false
          }
        } catch (error) {
          console.error('删除中转站失败:', error)
          ElMessage.error('删除中转站失败')
        }
      }).catch(() => {
        // 取消删除
      })
    }
    
    // 打开添加分组对话框
    const openAddGroupDialog = () => {
      groupForm.id = null
      groupForm.proxyId = currentProxy.value.id
      groupForm.name = ''
      groupForm.key = ''
      groupDialog.isEdit = false
      groupDialog.visible = true
    }
    
    // 打开编辑分组对话框
    const openEditGroupDialog = (group) => {
      groupForm.id = group.id
      groupForm.proxyId = group.proxyId
      groupForm.name = group.name
      groupForm.key = group.key
      groupDialog.isEdit = true
      groupDialog.visible = true
    }
    
    // 提交分组表单
    const submitGroupForm = async () => {
      if (!groupFormRef.value) return
      
      await groupFormRef.value.validate(async (valid) => {
        if (valid) {
          try {
            if (groupDialog.isEdit) {
              // 编辑分组
              await axios.put(`${API_BASE_URL}/groups/${groupForm.id}`, {
                name: groupForm.name,
                key: groupForm.key
              })
              ElMessage.success('分组更新成功')
            } else {
              // 添加分组
              await axios.post(`${API_BASE_URL}/groups`, {
                proxyId: groupForm.proxyId,
                name: groupForm.name,
                key: groupForm.key
              })
              ElMessage.success('分组添加成功')
            }
            groupDialog.visible = false
            fetchProxyList()
            // 更新当前显示的中转站详情
            if (currentProxy.value) {
              const response = await axios.get(`${API_BASE_URL}/proxies/${currentProxy.value.id}`)
              currentProxy.value = response.data
            }
          } catch (error) {
            console.error('保存分组失败:', error)
            ElMessage.error('保存分组失败')
          }
        }
      })
    }
    
    // 确认删除分组
    const confirmDeleteGroup = (group) => {
      ElMessageBox.confirm(
        `确定要删除分组 "${group.name}" 吗？此操作将永久删除该分组及其所有模型数据。`,
        '警告',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(async () => {
        try {
          await axios.delete(`${API_BASE_URL}/groups/${group.id}`)
          ElMessage.success('分组删除成功')
          fetchProxyList()
          // 更新当前显示的中转站详情
          if (currentProxy.value) {
            const response = await axios.get(`${API_BASE_URL}/proxies/${currentProxy.value.id}`)
            currentProxy.value = response.data
          }
        } catch (error) {
          console.error('删除分组失败:', error)
          ElMessage.error('删除分组失败')
        }
      }).catch(() => {
        // 取消删除
      })
    }
    
    // 刷新模型列表
    const refreshModels = async (proxy, group) => {
      try {
        ElMessage.info('正在刷新模型列表，请稍候...')
        await axios.post(`${API_BASE_URL}/groups/${group.id}/refresh-models`)
        ElMessage.success('模型列表刷新成功')
        fetchProxyList()
        // 更新当前显示的中转站详情
        if (currentProxy.value) {
          const response = await axios.get(`${API_BASE_URL}/proxies/${currentProxy.value.id}`)
          currentProxy.value = response.data
        }
      } catch (error) {
        console.error('刷新模型列表失败:', error)
        ElMessage.error('刷新模型列表失败')
      }
    }
    
    // 发送到溯源页面
    const sendToTrace = (proxy, group, model) => {
      router.push({
        path: '/trace',
        query: {
          baseUrl: proxy.baseUrl,
          key: group.key,
          model: model.id
        }
      })
    }
    
    // 查看模型详情
    const viewModelDetail = (proxyId, groupId, modelId) => {
      router.push(`/model-detail/${proxyId}/${groupId}/${modelId}`)
    }
    
    onMounted(() => {
      fetchProxyList()
    })
    
    return {
      proxyList,
      currentProxy,
      proxyDetailDrawer,
      proxyFormRef,
      proxyForm,
      proxyRules,
      proxyDialog,
      groupFormRef,
      groupForm,
      groupRules,
      groupDialog,
      formatDate,
      getModelCount,
      hasModels,
      viewProxyDetail,
      openAddProxyDialog,
      openEditProxyDialog,
      submitProxyForm,
      confirmDeleteProxy,
      openAddGroupDialog,
      openEditGroupDialog,
      submitGroupForm,
      confirmDeleteGroup,
      refreshModels,
      sendToTrace,
      viewModelDetail
    }
  }
}
</script>

<style scoped>
.proxy-table, .group-table, .model-table {
  margin-top: 20px;
}
</style>
