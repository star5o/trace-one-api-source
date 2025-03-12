<template>
  <div class="proxy-list page-container">
    <a-card>
      <template #title>
        <div class="card-header">
          <span class="title">中转站列表</span>
          <a-button type="primary" @click="openAddProxyDialog"
            >添加中转站</a-button
          >
        </div>
      </template>

      <div v-if="proxyList.length === 0" class="empty-data">
        <a-empty description="暂无中转站数据" />
      </div>

      <div v-else class="proxy-table">
        <a-table :dataSource="proxyList" :columns="proxyColumns" bordered>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'exchangeRate'">
              {{ record.exchangeRate ? `${record.exchangeRate} 人民币/美元` : '7.0 人民币/美元' }}
            </template>
            <template v-else-if="column.key === 'groupCount'">
              {{ record.groups ? record.groups.length : 0 }}
            </template>
            <template v-else-if="column.key === 'modelCount'">
              {{ getModelCount(record) }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button size="small" @click="viewProxyDetail(record)"
                >查看详情</a-button
              >
              <a-button
                size="small"
                type="primary"
                @click="openEditProxyDialog(record)"
                style="margin-left: 8px"
                >编辑</a-button
              >
              <a-button 
                size="small"
                type="primary"
                @click="fetchGroupsAndPricesForProxy(record)" 
                style="margin-left: 8px"
                >一键获取分组、模型和价格</a-button
              >
              <a-button
                size="small"
                danger
                @click="confirmDeleteProxy(record)"
                style="margin-left: 8px"
                >删除</a-button
              >
              <a-button
                size="small"
                danger
                @click="confirmClearProxy(record)"
                style="margin-left: 8px"
                >清空分组和模型</a-button
              >
            </template>
          </template>
        </a-table>
      </div>
    </a-card>

    <!-- 中转站详情对话框 -->
    <a-modal
      v-model:open="proxyDetailDrawer.visible"
      :title="proxyDetailDrawer.title"
      width="90%"
      style="top: 20px"
      :footer="null"
      :destroyOnClose="false"
      :maskClosable="false"
      class="proxy-detail-modal"
    >
      <div v-if="currentProxy" class="proxy-detail-content">
        <a-tabs v-model:activeKey="proxyDetailDrawer.activeTab">
          <a-tab-pane key="models" tab="模型列表">
            <div
              v-if="!currentProxy.groups || !hasModels(currentProxy)"
              class="empty-data"
            >
              <a-empty description="暂无模型数据" />
            </div>

            <div v-else>
              <a-collapse>
                <a-collapse-panel
                  v-for="group in currentProxy.groups"
                  :key="group.id"
                  :header="group.name"
                >
                  <div
                    v-if="!group.models || group.models.length === 0"
                    class="empty-data"
                  >
                    <a-empty description="暂无模型数据" />
                    <a-button
                      type="primary"
                      @click="refreshModels(currentProxy, group)"
                      >刷新模型</a-button
                    >
                  </div>

                  <div v-else class="model-table">
                    <div class="model-actions">
                      <div class="model-search">
                        <a-input-search
                          v-model:value="modelSearchText"
                          placeholder="搜索模型名称或ID"
                          style="width: 300px; margin-bottom: 16px"
                          @change="handleModelSearch"
                          allowClear
                        />
                      </div>
                      <div class="model-buttons">
                        <a-button 
                          type="primary" 
                          @click="refreshModels(currentProxy, group)"
                        >
                          刷新模型
                        </a-button>
                      </div>
                    </div>
                    <a-table
                      :dataSource="getFilteredModels(group.models)"
                      :columns="modelColumns"
                      :scroll="{ x: 'max-content' }"
                      bordered
                    >
                      <template #bodyCell="{ column, record }">
                        <template v-if="column.key === 'created'">
                          {{ formatDate(record.created * 1000) }}
                        </template>
                        <template v-else-if="column.key === 'isReverse'">
                          <a-switch
                            :checked="!!record.is_reverse"
                            @change="(checked) => updateReverseStatus(currentProxy, group, record, checked)"
                            size="small"
                            :checkedChildren="'是'"
                            :unCheckedChildren="'否'"
                          />
                        </template>
                        <template v-else-if="column.key === 'remark'">
                          {{ record.remark || "" }}
                        </template>
                        <template v-else-if="column.key === 'inputPrice'">
                          <span v-if="record.input_price !== undefined">
                            {{ record.input_price.toFixed(4) }} 美元/M tokens
                            <br>
                            <small>{{ (record.input_price * (currentProxy.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens</small>
                          </span>
                          <span v-else>-</span>
                        </template>
                        <template v-else-if="column.key === 'outputPrice'">
                          <span v-if="record.output_price !== undefined">
                            {{ record.output_price.toFixed(4) }} 美元/M tokens
                            <br>
                            <small>{{ (record.output_price * (currentProxy.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens</small>
                          </span>
                          <span v-else>-</span>
                        </template>
                        <template v-else-if="column.key === 'action'">
                          <a-button
                            size="small"
                            type="primary"
                            @click="sendToTrace(currentProxy, group, record)"
                            >发送到溯源</a-button
                          >
                          <a-button
                            size="small"
                            @click="
                              viewModelDetail(
                                currentProxy.id,
                                group.id,
                                record.id
                              )
                            "
                            style="margin-left: 8px"
                            >查看溯源记录</a-button
                          >
                          <a-button
                            size="small"
                            @click="
                              editModelRemark(currentProxy, group, record)
                            "
                            style="margin-left: 8px"
                            >编辑备注</a-button
                          >
                          <a-button
                            size="small"
                            @click="
                              editModelPriceParams(currentProxy, group, record)
                            "
                            style="margin-left: 8px"
                            >编辑价格参数</a-button
                          >
                        </template>
                      </template>
                    </a-table>
                  </div>
                </a-collapse-panel>
              </a-collapse>
            </div>
          </a-tab-pane>
          <a-tab-pane key="info" tab="基本信息">
            <a-descriptions :column="2" bordered>
              <a-descriptions-item label="名称">{{
                currentProxy.name
              }}</a-descriptions-item>
              <a-descriptions-item label="Base URL">{{
                currentProxy.baseUrl
              }}</a-descriptions-item>
              <a-descriptions-item label="汇率">{{
                currentProxy.exchangeRate ? `${currentProxy.exchangeRate} 人民币/美元` : '7.0 人民币/美元'
              }}</a-descriptions-item>
              <a-descriptions-item label="创建时间">{{
                formatDate(currentProxy.createdAt)
              }}</a-descriptions-item>
              <a-descriptions-item label="更新时间">{{
                formatDate(currentProxy.updatedAt)
              }}</a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>

          <a-tab-pane key="groups" tab="分组管理">
            <div class="action-bar">
              <a-button type="primary" @click="openAddGroupDialog"
                >添加分组</a-button
              >
            </div>

            <div
              v-if="!currentProxy.groups || currentProxy.groups.length === 0"
              class="empty-data"
            >
              <a-empty description="暂无分组数据" />
            </div>

            <div v-else class="group-table">
              <a-table
                :dataSource="currentProxy.groups"
                :columns="groupColumns"
                :scroll="{ x: 'max-content' }"
                bordered
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'modelCount'">
                    {{ record.models ? record.models.length : 0 }}
                  </template>
                  <template v-else-if="column.key === 'remark'">
                    {{ record.remark || "" }}
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-button
                      size="small"
                      @click="refreshModels(currentProxy, record)"
                      >刷新模型</a-button
                    >
                    <a-button
                      size="small"
                      type="primary"
                      @click="openEditGroupDialog(record)"
                      style="margin-left: 8px"
                      >编辑</a-button
                    >
                    <a-button
                      size="small"
                      danger
                      @click="confirmDeleteGroup(record)"
                      style="margin-left: 8px"
                      >删除</a-button
                    >
                  </template>
                </template>
              </a-table>
            </div>
          </a-tab-pane>
        </a-tabs>
        <div class="modal-footer">
          <a-button type="primary" @click="proxyDetailDrawer.visible = false"
            >关闭</a-button
          >
        </div>
      </div>
    </a-modal>

    <!-- 添加/编辑中转站对话框 -->
    <a-modal
      v-model:open="proxyDialog.visible"
      :title="proxyDialog.isEdit ? '编辑中转站' : '添加中转站'"
      width="500px"
      @ok="submitProxyForm"
    >
      <a-form
        ref="proxyFormRef"
        :model="proxyForm"
        :rules="proxyRules"
        layout="horizontal"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item label="名称" name="name">
          <a-input
            v-model:value="proxyForm.name"
            placeholder="请输入中转站名称"
          />
        </a-form-item>
        <a-form-item label="Base URL" name="baseUrl">
          <a-input
            v-model:value="proxyForm.baseUrl"
            placeholder="请输入中转站Base URL"
          />
        </a-form-item>
        <a-form-item label="汇率" name="exchangeRate" extra="人民币兑换1美元的汇率，默认为7.0">
          <a-input-number
            v-model:value="proxyForm.exchangeRate"
            placeholder="请输入汇率"
            :min="0.1"
            :step="0.01"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="Cookie" name="cookie" extra="获取分组、模型和价格时使用的Cookie">
          <a-textarea
            v-model:value="proxyForm.cookie"
            placeholder="请输入Cookie（可选）"
            :rows="3"
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="proxyDialog.visible = false">取消</a-button>
        <a-button type="primary" @click="submitProxyForm">确定</a-button>
      </template>
    </a-modal>

    <!-- 添加/编辑分组对话框 -->
    <a-modal
      v-model:open="groupDialog.visible"
      :title="groupDialog.isEdit ? '编辑分组' : '添加分组'"
      width="500px"
      @ok="submitGroupForm"
    >
      <a-form
        ref="groupFormRef"
        :model="groupForm"
        :rules="groupRules"
        layout="horizontal"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item label="分组名称" name="name">
          <a-input
            v-model:value="groupForm.name"
            placeholder="请输入分组名称"
          />
        </a-form-item>
        <a-form-item label="API Key" name="key">
          <a-input-password
            v-model:value="groupForm.key"
            placeholder="请输入API Key"
          />
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-input v-model:value="groupForm.remark" placeholder="请输入备注" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="groupDialog.visible = false">取消</a-button>
        <a-button type="primary" @click="submitGroupForm">确定</a-button>
      </template>
    </a-modal>

    <!-- 编辑模型价格参数对话框 -->
    <a-modal
      v-model:open="priceParamsDialog.visible"
      title="编辑价格参数"
      width="500px"
      @ok="submitPriceParamsForm"
    >
      <a-form
        ref="priceParamsFormRef"
        :model="priceParamsForm"
        :rules="priceParamsRules"
        layout="horizontal"
        :label-col="{ span: 8 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-item label="模型倍率" name="modelRatio">
          <a-input-number 
            v-model:value="priceParamsForm.modelRatio" 
            :min="0.01" 
            :max="100" 
            :step="0.01" 
            style="width: 100%" 
          />
        </a-form-item>
        <a-form-item label="补全倍率" name="completionRatio">
          <a-input-number 
            v-model:value="priceParamsForm.completionRatio" 
            :min="0.01" 
            :max="100" 
            :step="0.01" 
            style="width: 100%" 
          />
        </a-form-item>
        <a-form-item label="计算结果" name="calculatedPrices">
          <div>
            <p>输入价格 = 模型倍率 × 2</p>
            <p><strong>{{ calculateInputPrice() }} 美元/M tokens</strong></p>
            <p>输出价格 = 输入价格 × 补全倍率</p>
            <p><strong>{{ calculateOutputPrice() }} 美元/M tokens</strong></p>
          </div>
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="priceParamsDialog.visible = false">取消</a-button>
        <a-button type="primary" @click="submitPriceParamsForm">确定</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed, h } from "vue";
import { useRouter } from "vue-router";
import { message, Modal } from "ant-design-vue";
import { EditOutlined } from "@ant-design/icons-vue";
import axios from "axios";
import { apiClient, API_BASE_URL } from "../utils/api";

export default {
  name: "ProxyList",
  components: {
    EditOutlined,
  },
  setup() {
    const router = useRouter();

    const proxyList = ref([]);
    const currentProxy = ref(null);

    // 定义中转站表格列
    const proxyColumns = [
      {
        title: "名称",
        dataIndex: "name",
        key: "name",
        width: 120,
      },
      {
        title: "Base URL",
        dataIndex: "baseUrl",
        key: "baseUrl",
        width: 200,
      },
      {
        title: "汇率",
        key: "exchangeRate",
        width: 100,
      },
      {
        title: "分组数量",
        key: "groupCount",
        width: 100,
      },
      {
        title: "模型数量",
        key: "modelCount",
        width: 100,
      },
      {
        title: "操作",
        key: "action",
        width: 350,
      },
    ];

    // 定义分组表格列
    const groupColumns = [
      {
        title: "分组名称",
        dataIndex: "name",
        key: "name",
        width: 120,
      },
      {
        title: "API Key",
        dataIndex: "key",
        key: "key",
        width: 200,
        ellipsis: true,
      },
      {
        title: "模型数量",
        key: "modelCount",
        width: 100,
      },
      {
        title: "备注",
        key: "remark",
        width: 150,
        ellipsis: true,
      },
      {
        title: "操作",
        key: "action",
        width: 350,
      },
    ];

    // 定义模型表格列
    const modelColumns = [
      {
        title: "模型ID",
        dataIndex: "id",
        key: "id",
        width: 200,
      },
      {
        title: "创建时间",
        key: "created",
        width: 150,
      },
      {
        title: "是否逆向",
        key: "isReverse",
        width: 100,
      },
      {
        title: "备注",
        key: "remark",
        width: 100,
        ellipsis: true,
      },
      {
        title: "输入价格",
        key: "inputPrice",
        width: 120,
      },
      {
        title: "输出价格",
        key: "outputPrice",
        width: 120,
      },
      {
        title: "操作",
        key: "action",
        width: 350,
      },
    ];

    // 中转站详情抽屉
    const proxyDetailDrawer = reactive({
      visible: false,
      title: "",
      activeTab: "info",
    });

    // 中转站表单
    const proxyFormRef = ref(null);
    const proxyForm = reactive({
      id: null,
      name: "",
      baseUrl: "",
      exchangeRate: 7.0,
      cookie: "",
    });

    const proxyRules = {
      name: [
        { required: true, message: "请输入中转站名称", trigger: "blur" },
        { min: 2, max: 50, message: "长度在 2 到 50 个字符", trigger: "blur" },
      ],
      baseUrl: [
        { required: true, message: "请输入中转站Base URL", trigger: "blur" },
        {
          pattern: /^https?:\/\/.+/i,
          message: "请输入有效的URL地址",
          trigger: "blur",
        },
      ],
      exchangeRate: [
        { required: true, message: "请输入汇率", trigger: "blur" },
        { type: "number", message: "汇率必须是数字", trigger: "blur" },
        { type: "number", min: 0.01, message: "汇率必须大于0.01", trigger: "blur" },
      ],
    };

    const proxyDialog = reactive({
      visible: false,
      isEdit: false,
    });

    // 分组表单
    const groupFormRef = ref(null);
    const groupForm = reactive({
      id: null,
      proxyId: null,
      name: "",
      key: "",
      remark: "",
    });

    const groupRules = {
      name: [
        { required: true, message: "请输入分组名称", trigger: "blur" },
        { min: 2, max: 50, message: "长度在 2 到 50 个字符", trigger: "blur" },
      ],
      key: [{ required: true, message: "请输入API Key", trigger: "blur" }],
      remark: [
        { max: 200, message: "备注长度不能超过200个字符", trigger: "blur" },
      ],
    };

    const groupDialog = reactive({
      visible: false,
      isEdit: false,
    });

    // 获取中转站列表
    const fetchProxyList = async () => {
      try {
        const response = await apiClient.get("/proxies");
        proxyList.value = response.data;
      } catch (error) {
        console.error("获取中转站列表失败:", error);
        message.error("获取中转站列表失败");
      }
    };

    // 格式化日期
    const formatDate = (timestamp) => {
      if (!timestamp) return "未知";
      const date = new Date(timestamp);
      return date.toLocaleString();
    };

    // 获取模型总数
    const getModelCount = (proxy) => {
      if (!proxy.groups) return 0;
      return proxy.groups.reduce((count, group) => {
        return count + (group.models ? group.models.length : 0);
      }, 0);
    };

    // 判断是否有模型
    const hasModels = (proxy) => {
      if (!proxy.groups) return false;
      return proxy.groups.some(
        (group) => group.models && group.models.length > 0
      );
    };

    // 查看中转站详情
    const viewProxyDetail = (proxy) => {
      currentProxy.value = proxy;
      proxyDetailDrawer.title = `${proxy.name} 详情`;
      proxyDetailDrawer.visible = true;
      proxyDetailDrawer.activeTab = "models"; // 默认打开模型列表面板
    };

    // 打开添加中转站对话框
    const openAddProxyDialog = () => {
      proxyForm.id = null;
      proxyForm.name = "";
      proxyForm.baseUrl = "";
      proxyForm.exchangeRate = 7.0;
      proxyForm.cookie = "";
      proxyDialog.isEdit = false;
      proxyDialog.visible = true;
    };

    // 打开编辑中转站对话框
    const openEditProxyDialog = (proxy) => {
      proxyForm.id = proxy.id;
      proxyForm.name = proxy.name;
      proxyForm.baseUrl = proxy.baseUrl;
      proxyForm.exchangeRate = proxy.exchangeRate || 7.0;
      proxyForm.cookie = proxy.cookie || "";
      proxyDialog.isEdit = true;
      proxyDialog.visible = true;
    };

    // 提交中转站表单
    const submitProxyForm = async () => {
      if (!proxyFormRef.value) return;

      try {
        await proxyFormRef.value.validate();

        try {
          if (proxyDialog.isEdit) {
            // 编辑中转站
            await apiClient.put(`/proxies/${proxyForm.id}`, {
              name: proxyForm.name,
              baseUrl: proxyForm.baseUrl,
              exchangeRate: proxyForm.exchangeRate,
              cookie: proxyForm.cookie,
            });
            message.success("中转站更新成功");
          } else {
            // 添加中转站
            await apiClient.post("/proxies", {
              name: proxyForm.name,
              baseUrl: proxyForm.baseUrl,
              exchangeRate: proxyForm.exchangeRate,
              cookie: proxyForm.cookie,
            });
            message.success("中转站添加成功");
          }
          proxyDialog.visible = false;
          fetchProxyList();
        } catch (error) {
          console.error("保存中转站失败:", error);
          message.error("保存中转站失败");
        }
      } catch (e) {
        // 表单验证失败
      }
    };

    // 确认清空中转站的分组和模型
    const confirmClearProxy = (proxy) => {
      Modal.confirm({
        title: "警告",
        content: `确定要清空中转站 "${proxy.name}" 的所有分组和模型吗？此操作将删除该中转站的所有分组和模型数据，但保留中转站本身。`,
        okText: "确定",
        cancelText: "取消",
        okType: "danger",
        onOk: async () => {
          try {
            await apiClient.delete(`/proxies/${proxy.id}/groups-and-models`);
            message.success("分组和模型清空成功");
            fetchProxyList();
            if (
              proxyDetailDrawer.visible &&
              currentProxy.value &&
              currentProxy.value.id === proxy.id
            ) {
              // 刷新当前显示的中转站详情
              const response = await apiClient.get(`/proxies/${proxy.id}`);
              currentProxy.value = response.data;
            }
          } catch (error) {
            console.error("清空分组和模型失败:", error);
            message.error("清空分组和模型失败");
          }
        },
      });
    };
    
    // 确认删除中转站
    const confirmDeleteProxy = (proxy) => {
      Modal.confirm({
        title: "警告",
        content: `确定要删除中转站 "${proxy.name}" 吗？此操作将永久删除该中转站及其所有分组和模型数据。`,
        okText: "确定",
        cancelText: "取消",
        okType: "danger",
        onOk: async () => {
          try {
            await apiClient.delete(`/proxies/${proxy.id}`);
            message.success("中转站删除成功");
            fetchProxyList();
            if (
              proxyDetailDrawer.visible &&
              currentProxy.value &&
              currentProxy.value.id === proxy.id
            ) {
              proxyDetailDrawer.visible = false;
            }
          } catch (error) {
            console.error("删除中转站失败:", error);
            message.error("删除中转站失败");
          }
        },
      });
    };

    // 打开添加分组对话框
    const openAddGroupDialog = () => {
      groupForm.id = null;
      groupForm.proxyId = currentProxy.value.id;
      groupForm.name = "";
      groupForm.key = "";
      groupForm.remark = "";
      groupDialog.isEdit = false;
      groupDialog.visible = true;
    };

    // 打开编辑分组对话框
    const openEditGroupDialog = (group) => {
      groupForm.id = group.id;
      groupForm.proxyId = group.proxyId;
      groupForm.name = group.name;
      groupForm.key = group.key;
      groupForm.remark = group.remark;
      groupDialog.isEdit = true;
      groupDialog.visible = true;
    };

    // 提交分组表单
    const submitGroupForm = async () => {
      if (!groupFormRef.value) return;

      try {
        await groupFormRef.value.validate();

        try {
          if (groupDialog.isEdit) {
            // 编辑分组
            await apiClient.put(`/groups/${groupForm.id}`, {
              name: groupForm.name,
              key: groupForm.key,
              remark: groupForm.remark,
            });
            message.success("分组更新成功");
          } else {
            // 添加分组
            await apiClient.post("/groups", {
              proxyId: groupForm.proxyId,
              name: groupForm.name,
              key: groupForm.key,
              remark: groupForm.remark,
            });
            message.success("分组添加成功");
          }
          groupDialog.visible = false;
          fetchProxyList();
          // 更新当前显示的中转站详情
          if (currentProxy.value) {
            const response = await apiClient.get(
              `/proxies/${currentProxy.value.id}`
            );
            currentProxy.value = response.data;
          }
        } catch (error) {
          console.error("保存分组失败:", error);
          message.error("保存分组失败");
        }
      } catch (e) {
        // 表单验证失败
      }
    };

    // 确认删除分组
    const confirmDeleteGroup = (group) => {
      Modal.confirm({
        title: "警告",
        content: `确定要删除分组 "${group.name}" 吗？此操作将永久删除该分组及其所有模型数据。`,
        okText: "确定",
        cancelText: "取消",
        okType: "danger",
        onOk: async () => {
          try {
            await apiClient.delete(`/groups/${group.id}`);
            message.success("分组删除成功");
            fetchProxyList();
            // 更新当前显示的中转站详情
            if (currentProxy.value) {
              const response = await apiClient.get(
                `/proxies/${currentProxy.value.id}`
              );
              currentProxy.value = response.data;
            }
          } catch (error) {
            console.error("删除分组失败:", error);
            message.error("删除分组失败");
          }
        },
      });
    };

    // 刷新模型列表
    const refreshModels = async (proxy, group) => {
      try {
        message.info("正在刷新模型列表，请稍候...");
        await apiClient.post(`/groups/${group.id}/refresh-models`);
        message.success("模型列表刷新成功");
        fetchProxyList();
        // 更新当前显示的中转站详情
        if (currentProxy.value) {
          const response = await apiClient.get(
            `/proxies/${currentProxy.value.id}`
          );
          currentProxy.value = response.data;
        }
      } catch (error) {
        console.error("刷新模型列表失败:", error);
        message.error("刷新模型列表失败");
      }
    };
    
    // 为操作列中的按钮提供的方法，接收代理记录作为参数
    const fetchGroupsAndPricesForProxy = async (proxy) => {
      try {
        message.info("正在一键获取分组、模型和价格，请稍候...");
        fetchingPrices.value = true;
        
        // 调用合并后的API，一次性获取分组和价格信息
        const response = await apiClient.post(`/proxies/${proxy.id}/fetch-groups-and-prices`);
        
        // 更新中转站列表
        await fetchProxyList();
        
        // 如果当前正在查看该代理的详情，更新详情信息
        if (currentProxy.value && currentProxy.value.id === proxy.id) {
          const detailResponse = await apiClient.get(`/proxies/${proxy.id}`);
          currentProxy.value = detailResponse.data;
        }
        
        const groupsAdded = response.data?.groupsAdded || 0;
        message.success(`一键获取成功！新增 ${groupsAdded} 个分组，并获取了模型和价格信息`);
      } catch (error) {
        console.error("一键获取分组、模型和价格失败:", error);
        message.error("一键获取分组、模型和价格失败");
      } finally {
        fetchingPrices.value = false;
      }
    };

    // 自动获取分组 (保留兼容性，直接使用 fetchGroupsAndPrices)

    // 发送到溯源页面
    const sendToTrace = (proxy, group, model) => {
      router.push({
        path: "/trace",
        query: {
          baseUrl: proxy.baseUrl,
          key: group.key,
          model: model.id,
          groupName: group.name,
        },
      });
    };

    // 查看模型详情
    const viewModelDetail = (proxyId, groupId, modelId) => {
      // 找到当前代理和分组
      const proxy = proxyList.value.find((p) => p.id === proxyId);
      if (proxy) {
        const group = proxy.groups.find((g) => g.id === groupId);
        if (group) {
          router.push({
            path: `/model-detail/${proxyId}/${groupId}/${modelId}`,
            query: {
              groupName: group.name,
            },
          });
          return;
        }
      }
      // 如果找不到分组信息，使用原来的方式
      router.push(`/model-detail/${proxyId}/${groupId}/${modelId}`);
    };

    // 编辑模型备注
    const editModelRemark = (proxy, group, model) => {
      Modal.confirm({
        title: "编辑模型备注",
        content: (h) =>
          h("div", [
            h("p", "请输入模型备注"),
            h("a-input", {
              ref: "modelRemarkInput",
              value: model.remark || "",
              onChange: (e) => (modelRemarkInput = e.target.value),
            }),
          ]),
        okText: "确定",
        cancelText: "取消",
        onOk: async () => {
          try {
            if (!modelRemarkInput || modelRemarkInput.trim() === "") {
              message.error("备注不能为空");
              return Promise.reject();
            }

            await apiClient.put(`/models/${model.id}`, {
              remark: modelRemarkInput,
            });
            message.success("模型备注更新成功");
            // 更新当前显示的中转站详情
            if (currentProxy.value) {
              const response = await apiClient.get(
                `/proxies/${currentProxy.value.id}`
              );
              currentProxy.value = response.data;
            }
          } catch (error) {
            console.error("更新模型备注失败:", error);
            message.error("更新模型备注失败");
            return Promise.reject();
          }
        },
      });
    };

    // 用于存储模型备注输入值
    let modelRemarkInput = "";
    
    // 价格参数对话框
    const priceParamsDialog = reactive({
      visible: false,
      title: "编辑价格参数",
      currentProxy: null,
      currentGroup: null,
      currentModel: null,
    });

    // 价格参数表单
    const priceParamsFormRef = ref(null);
    const priceParamsForm = reactive({
      modelRatio: 1.0,
      completionRatio: 1.0,
    });

    const priceParamsRules = {
      modelRatio: [
        { required: true, message: "请输入模型倍率", trigger: "blur" },
        { type: "number", min: 0.01, message: "倍率必须大于0.01", trigger: "blur" },
      ],
      completionRatio: [
        { required: true, message: "请输入补全倍率", trigger: "blur" },
        { type: "number", min: 0.01, message: "倍率必须大于0.01", trigger: "blur" },
      ],
    };
    
    // 计算输入价格
    const calculateInputPrice = () => {
      if (!priceParamsForm.modelRatio) {
        return "-";
      }
      return (priceParamsForm.modelRatio * 2).toFixed(4);
    };
    
    // 计算输出价格
    const calculateOutputPrice = () => {
      if (!priceParamsForm.modelRatio || !priceParamsForm.completionRatio) {
        return "-";
      }
      return (priceParamsForm.modelRatio * 2 * priceParamsForm.completionRatio).toFixed(4);
    };
    
    // 编辑模型价格参数
    const editModelPriceParams = (proxy, group, model) => {
      priceParamsDialog.currentProxy = proxy;
      priceParamsDialog.currentGroup = group;
      priceParamsDialog.currentModel = model;
      
      priceParamsForm.modelRatio = model.model_ratio || 1.0;
      priceParamsForm.completionRatio = model.completion_ratio || 1.0;
      
      priceParamsDialog.visible = true;
    };

    // 提交价格参数表单
    const submitPriceParamsForm = async () => {
      try {
        await priceParamsFormRef.value.validate();
        
        const { currentProxy, currentGroup, currentModel } = priceParamsDialog;
        const { modelRatio, completionRatio } = priceParamsForm;
        
        await axios.put(`/api/models/${currentModel.id}/price-params`, {
          model_ratio: modelRatio,
          completion_ratio: completionRatio
        });
        
        // 更新本地数据
        const groupIndex = currentProxy.groups.findIndex(g => g.id === currentGroup.id);
        if (groupIndex !== -1) {
          const modelIndex = currentProxy.groups[groupIndex].models.findIndex(m => m.id === currentModel.id);
          if (modelIndex !== -1) {
            const model = currentProxy.groups[groupIndex].models[modelIndex];
            model.model_ratio = modelRatio;
            model.completion_ratio = completionRatio;
          }
        }
        
        // 重新获取所有价格数据
        await fetchGroupsAndPricesForProxy(currentProxy);
        
        message.success("更新价格参数成功");
        priceParamsDialog.visible = false;
      } catch (error) {
        console.error("更新价格参数失败:", error);
        message.error("更新价格参数失败: " + (error.response?.data?.message || error.message || "未知错误"));
      }
    };

    // 模型搜索文本
    const modelSearchText = ref("");
    
    // 处理模型搜索
    const handleModelSearch = () => {
      // 搜索文本改变时自动触发过滤，不需要额外操作
    };
    
    // 获取过滤后的模型列表
    const getFilteredModels = (models) => {
      if (!modelSearchText.value) {
        return models;
      }
      
      const searchText = modelSearchText.value.toLowerCase();
      return models.filter(model => {
        return (
          (model.id && model.id.toLowerCase().includes(searchText)) ||
          (model.name && model.name.toLowerCase().includes(searchText)) ||
          (model.remark && model.remark.toLowerCase().includes(searchText))
        );
      });
    };
    
    // 价格获取状态
    const fetchingPrices = ref(false);
    
    // 更新模型逆向状态
    const updateReverseStatus = async (proxy, group, model, isReverse) => {
      try {
        await apiClient.put(`/models/${model.id}/reverse-status`, {
          proxy_id: proxy.id,
          group_id: group.id,
          is_reverse: isReverse
        });
        
        // 更新前端模型对象
        model.is_reverse = isReverse;
        
        message.success(`中转站 ${proxy.name} 的分组 ${group.name} 中的模型 ${model.id} 的逆向状态已更新为 ${isReverse ? '是' : '否'}`);
      } catch (error) {
        console.error('更新模型逆向状态失败:', error);
        message.error('更新模型逆向状态失败');
      }
    };
    
    // 获取模型价格信息的通用函数
    const fetchModelPricesBase = async (proxy, specificGroup = null) => {
      if (!proxy || !proxy.id) {
        message.error("中转站信息不完整");
        return;
      }
      
      fetchingPrices.value = true;
      
      try {
        const response = await apiClient.get(`/proxies/${proxy.id}/model-prices`);
        
        if (response.data && response.data.success && response.data.modelPrices) {
          const modelPrices = response.data.modelPrices;
          let updatedCount = 0;
          
          // 要处理的分组列表
          const groupsToProcess = specificGroup ? [specificGroup] : (proxy.groups || []);
          
          if (groupsToProcess.length > 0) {
            groupsToProcess.forEach(group => {
              // 找到当前分组的价格信息
              const groupPrices = modelPrices[group.key];
              
              if (groupPrices && group.models && group.models.length > 0) {
                // 更新模型价格信息
                group.models.forEach(model => {
                  if (groupPrices[model.id]) {
                    model.prices = groupPrices[model.id];
                    updatedCount++;
                  }
                });
              } else if (groupPrices && specificGroup) {
                message.warning("当前分组没有模型数据");
              } else if (specificGroup) {
                message.warning(`未找到分组 ${group.name} 的价格信息`);
              }
            });
            
            if (updatedCount > 0) {
              message.success(specificGroup 
                ? "模型价格获取成功" 
                : `成功获取 ${updatedCount} 个模型的价格信息`);
            } else if (!specificGroup) {
              message.warning("没有获取到任何模型的价格信息");
            }
          } else {
            message.warning("当前中转站没有分组数据");
          }
        } else {
          message.error("获取模型价格失败: " + (response.data?.error || "未知错误"));
        }
      } catch (error) {
        console.error("获取模型价格失败:", error);
        message.error("获取模型价格失败: " + (error.response?.data?.message || error.message || "未知错误"));
      } finally {
        fetchingPrices.value = false;
      }
    };
    
    // 获取所有模型价格信息
    const fetchAllModelPrices = async (proxy) => {
      return fetchModelPricesBase(proxy);
    };
    
    // 获取单个分组的模型价格信息
    const fetchModelPrices = async (proxy, group) => {
      return fetchModelPricesBase(proxy, group);
    };

    onMounted(() => {
      fetchProxyList();
    });

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
      confirmClearProxy,
      openAddGroupDialog,
      openEditGroupDialog,
      submitGroupForm,
      proxyColumns,
      groupColumns,
      modelColumns,
      confirmDeleteGroup,
      refreshModels,
      fetchGroupsAndPricesForProxy,
      sendToTrace,
      viewModelDetail,
      editModelRemark,
      modelSearchText,
      handleModelSearch,
      getFilteredModels,
      fetchAllModelPrices,
      fetchModelPrices,
      fetchingPrices,
      updateReverseStatus,
      // 价格参数相关
      priceParamsFormRef,
      priceParamsDialog,
      priceParamsForm,
      priceParamsRules,
      calculateInputPrice,
      calculateOutputPrice,
      editModelPriceParams,
      submitPriceParamsForm,
    };
  },
};
</script>

<style scoped>
.proxy-table,
.group-table,
.model-table {
  margin-top: 20px;
}

.model-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.model-buttons {
  display: flex;
  gap: 8px;
}
.model-remark {
  display: flex;
  align-items: center;
}
.model-remark .ant-btn {
  margin-left: 10px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 中转站详情模态对话框样式 */
.proxy-detail-modal {
  max-width: 95%;
}

:deep(.ant-modal-content) {
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
}

:deep(.ant-modal-body) {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.proxy-detail-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.proxy-detail-content .ant-tabs {
  flex: 1;
}

.modal-footer {
  margin-top: 24px;
  text-align: right;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.empty-data {
  padding: 20px 0;
  text-align: center;
}

.action-bar {
  margin-bottom: 16px;
}
</style>
