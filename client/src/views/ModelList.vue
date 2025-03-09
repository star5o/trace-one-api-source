<template>
  <div class="model-list page-container">
    <a-card>
      <template #title>
        <div class="card-header">
          <span class="title">模型列表</span>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <a-spin tip="加载中..."></a-spin>
      </div>

      <div v-else-if="allModels.length === 0" class="empty-data">
        <a-empty description="暂无模型数据" />
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
        </div>
        <a-table
          :dataSource="filteredModels"
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
                @change="(checked) => updateReverseStatus(record.proxyId, record.groupId, record, checked)"
                size="small"
                :checkedChildren="'是'"
                :unCheckedChildren="'否'"
              />
            </template>
            <template v-else-if="column.key === 'inputPrice'">
              <span v-if="record.prices && (record.prices.inputPrice !== undefined || record.prices.input_price !== undefined)">
                {{ (record.prices.input_price || record.prices.inputPrice).toFixed(4) }} 美元/M tokens
                <br>
                <small>{{ ((record.prices.input_price || record.prices.inputPrice) * (record.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens</small>
              </span>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'outputPrice'">
              <span v-if="record.prices && (record.prices.outputPrice !== undefined || record.prices.output_price !== undefined)">
                {{ (record.prices.output_price || record.prices.outputPrice).toFixed(4) }} 美元/M tokens
                <br>
                <small>{{ ((record.prices.output_price || record.prices.outputPrice) * (record.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens</small>
              </span>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button
                size="small"
                type="primary"
                @click="sendToTrace(record)"
                >发送到溯源</a-button
              >
              <a-button
                size="small"
                @click="viewModelDetail(record.proxyId, record.groupId, record.id)"
                style="margin-left: 8px"
                >查看溯源记录</a-button
              >
              <a-button
                size="small"
                @click="editModelRemark(record)"
                style="margin-left: 8px"
                >编辑备注</a-button
              >
              <a-button
                size="small"
                @click="editModelPriceParams(record)"
                style="margin-left: 8px"
                >编辑价格参数</a-button
              >
            </template>
          </template>
        </a-table>
      </div>
    </a-card>

    <!-- 编辑模型备注对话框 -->
    <a-modal
      v-model:open="modelRemarkDialog.visible"
      :title="modelRemarkDialog.title"
      @ok="saveModelRemark"
    >
      <a-form :model="modelRemarkDialog.form" layout="vertical">
        <a-form-item label="备注" name="remark">
          <a-textarea
            v-model:value="modelRemarkDialog.form.remark"
            placeholder="请输入备注信息"
            :rows="4"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑模型价格参数对话框 -->
    <a-modal
      v-model:open="modelPriceDialog.visible"
      :title="modelPriceDialog.title"
      @ok="saveModelPriceParams"
    >
      <a-form :model="modelPriceDialog.form" layout="vertical">
        <a-form-item label="分组比例" name="groupRatio">
          <a-input-number
            v-model:value="modelPriceDialog.form.groupRatio"
            placeholder="请输入分组比例"
            style="width: 100%"
            :min="0"
            :step="0.01"
          />
        </a-form-item>
        <a-form-item label="模型比例" name="modelRatio">
          <a-input-number
            v-model:value="modelPriceDialog.form.modelRatio"
            placeholder="请输入模型比例"
            style="width: 100%"
            :min="0"
            :step="0.01"
          />
        </a-form-item>
        <a-form-item label="输出比例" name="completionRatio">
          <a-input-number
            v-model:value="modelPriceDialog.form.completionRatio"
            placeholder="请输入输出比例"
            style="width: 100%"
            :min="0"
            :step="0.01"
          />
        </a-form-item>
        <div class="price-preview" v-if="modelPriceDialog.form.groupRatio && modelPriceDialog.form.modelRatio && modelPriceDialog.form.completionRatio">
          <p>
            <strong>输入价格预览：</strong>
            {{ (modelPriceDialog.form.groupRatio * modelPriceDialog.form.modelRatio * 2).toFixed(4) }} 美元/M tokens
            <br>
            {{ (modelPriceDialog.form.groupRatio * modelPriceDialog.form.modelRatio * 2 * (modelPriceDialog.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens
          </p>
          <p>
            <strong>输出价格预览：</strong>
            {{ (modelPriceDialog.form.groupRatio * modelPriceDialog.form.modelRatio * 2 * modelPriceDialog.form.completionRatio).toFixed(4) }} 美元/M tokens
            <br>
            {{ (modelPriceDialog.form.groupRatio * modelPriceDialog.form.modelRatio * 2 * modelPriceDialog.form.completionRatio * (modelPriceDialog.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens
          </p>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import axios from "axios";

export default {
  name: "ModelList",
  setup() {
    const router = useRouter();
    const loading = ref(true);
    const allModels = ref([]);
    const modelSearchText = ref("");
    const proxies = ref([]);

    // 模型备注对话框
    const modelRemarkDialog = reactive({
      visible: false,
      title: "编辑模型备注",
      form: {
        proxyId: "",
        groupId: "",
        modelId: "",
        remark: ""
      }
    });

    // 模型价格参数对话框
    const modelPriceDialog = reactive({
      visible: false,
      title: "编辑模型价格参数",
      exchangeRate: 7.0,
      form: {
        proxyId: "",
        groupId: "",
        modelId: "",
        groupRatio: null,
        modelRatio: null,
        completionRatio: null
      }
    });

    // 表格列定义
    const modelColumns = [
      {
        title: "模型ID",
        dataIndex: "id",
        key: "id",
        width: 200,
        fixed: "left"
      },
      {
        title: "中转站",
        dataIndex: "proxyName",
        key: "proxyName",
        width: 150
      },
      {
        title: "BaseURL",
        dataIndex: "baseUrl",
        key: "baseUrl",
        width: 200,
        ellipsis: true
      },
      {
        title: "分组",
        dataIndex: "groupName",
        key: "groupName",
        width: 150
      },
      {
        title: "是否逆向",
        key: "isReverse",
        width: 100
      },
      {
        title: "备注",
        dataIndex: "remark",
        key: "remark",
        width: 200,
        ellipsis: true
      },
      {
        title: "输入价格",
        key: "inputPrice",
        width: 180
      },
      {
        title: "输出价格",
        key: "outputPrice",
        width: 180
      },
      {
        title: "操作",
        key: "action",
        width: 350,
        fixed: "right"
      }
    ];

    // 格式化日期
    const formatDate = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleString();
    };

    // 获取所有中转站
    const fetchProxies = async () => {
      try {
        const response = await axios.get("/api/proxies");
        proxies.value = response.data;
        return response.data;
      } catch (error) {
        console.error("获取中转站列表失败:", error);
        message.error("获取中转站列表失败");
        return [];
      }
    };
    
    // 获取单个中转站的详细信息
    const fetchProxyDetail = async (proxyId) => {
      try {
        const response = await axios.get(`/api/proxies/${proxyId}`);
        return response.data;
      } catch (error) {
        console.error(`获取中转站 ${proxyId} 详情失败:`, error);
        return null;
      }
    };

    // 获取所有模型
    const fetchAllModels = async () => {
      loading.value = true;
      try {
        const proxyList = await fetchProxies();
        const allModelsArray = [];

        for (const proxy of proxyList) {
          try {
            const proxyDetail = await axios.get(`/api/proxies/${proxy.id}`);
            const proxyData = proxyDetail.data;

            if (proxyData.groups && proxyData.groups.length > 0) {
              for (const group of proxyData.groups) {
                if (group.models && group.models.length > 0) {
                  for (const model of group.models) {
                    allModelsArray.push({
                      ...model,
                      proxyId: proxy.id,
                      proxyName: proxy.name,
                      baseUrl: proxy.baseUrl,
                      groupId: group.id,
                      groupName: group.name,
                      exchangeRate: proxy.exchangeRate || 7.0
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.error(`获取中转站 ${proxy.id} 详情失败:`, error);
          }
        }

        allModels.value = allModelsArray;
      } catch (error) {
        console.error("获取所有模型失败:", error);
        message.error("获取所有模型失败");
      } finally {
        loading.value = false;
      }
    };

    // 处理模型搜索
    const handleModelSearch = () => {
      // 搜索逻辑在 filteredModels 计算属性中实现
    };

    // 过滤后的模型列表
    const filteredModels = computed(() => {
      if (!modelSearchText.value) {
        return allModels.value;
      }
      
      const searchText = modelSearchText.value.toLowerCase();
      return allModels.value.filter(model => {
        return (
          model.id.toLowerCase().includes(searchText) ||
          (model.remark && model.remark.toLowerCase().includes(searchText)) ||
          (model.proxyName && model.proxyName.toLowerCase().includes(searchText)) ||
          (model.groupName && model.groupName.toLowerCase().includes(searchText))
        );
      });
    });

    // 更新模型的逆向状态
    const updateReverseStatus = async (proxyId, groupId, model, isReverse) => {
      try {
        await axios.put(`/api/models/${model.id}/reverse-status`, {
          proxy_id: proxyId,
          group_id: groupId,
          is_reverse: isReverse
        });
        
        // 更新本地数据
        const modelIndex = allModels.value.findIndex(
          m => m.id === model.id && m.groupId === groupId
        );
        
        if (modelIndex !== -1) {
          allModels.value[modelIndex].is_reverse = isReverse;
        }
        
        message.success("更新逆向状态成功");
      } catch (error) {
        console.error("更新逆向状态失败:", error);
        message.error("更新逆向状态失败");
      }
    };

    // 编辑模型备注
    const editModelRemark = (model) => {
      modelRemarkDialog.form = {
        proxyId: model.proxyId,
        groupId: model.groupId,
        modelId: model.id,
        remark: model.remark || ""
      };
      modelRemarkDialog.visible = true;
    };

    // 保存模型备注
    const saveModelRemark = async () => {
      try {
        const { modelId, remark } = modelRemarkDialog.form;
        
        await axios.put(`/api/models/${modelId}`, {
          remark
        });
        
        // 更新本地数据
        const modelIndex = allModels.value.findIndex(
          m => m.id === modelId
        );
        
        if (modelIndex !== -1) {
          allModels.value[modelIndex].remark = remark;
        }
        
        message.success("更新模型备注成功");
        modelRemarkDialog.visible = false;
      } catch (error) {
        console.error("更新模型备注失败:", error);
        message.error("更新模型备注失败");
      }
    };

    // 编辑模型价格参数
    const editModelPriceParams = (model) => {
      // 获取当前价格参数
      let groupRatio = null;
      let modelRatio = null;
      let completionRatio = null;
      
      if (model.prices) {
        groupRatio = model.prices.group_ratio;
        modelRatio = model.prices.model_ratio;
        completionRatio = model.prices.completion_ratio;
      }
      
      modelPriceDialog.form = {
        proxyId: model.proxyId,
        groupId: model.groupId,
        modelId: model.id,
        groupRatio,
        modelRatio,
        completionRatio
      };
      
      modelPriceDialog.exchangeRate = model.exchangeRate || 7.0;
      modelPriceDialog.visible = true;
    };

    // 保存模型价格参数
    const saveModelPriceParams = async () => {
      try {
        const { proxyId, groupId, modelId, groupRatio, modelRatio, completionRatio } = modelPriceDialog.form;
        
        if (!groupRatio || !modelRatio || !completionRatio) {
          message.error("请填写所有价格参数");
          return;
        }
        
        const priceData = {
          group_ratio: groupRatio,
          model_ratio: modelRatio,
          completion_ratio: completionRatio
        };
        
        await axios.put(`/api/models/${modelId}/price-params`, priceData);
        
        // 更新本地数据
        const modelIndex = allModels.value.findIndex(
          m => m.id === modelId && m.groupId === groupId
        );
        
        if (modelIndex !== -1) {
          // 计算输入和输出价格
          const inputPrice = groupRatio * modelRatio * 2;
          const outputPrice = inputPrice * completionRatio;
          
          if (!allModels.value[modelIndex].prices) {
            allModels.value[modelIndex].prices = {};
          }
          
          // 更新价格参数
          allModels.value[modelIndex].prices.group_ratio = groupRatio;
          allModels.value[modelIndex].prices.model_ratio = modelRatio;
          allModels.value[modelIndex].prices.completion_ratio = completionRatio;
          
          // 更新计算结果
          allModels.value[modelIndex].prices.input_price = inputPrice;
          allModels.value[modelIndex].prices.output_price = outputPrice;
        }
        
        message.success("更新价格参数成功");
        modelPriceDialog.visible = false;
      } catch (error) {
        console.error("更新价格参数失败:", error);
        message.error("更新价格参数失败: " + (error.response?.data?.message || error.message || "未知错误"));
      }
    };

    // 发送到溯源
    const sendToTrace = (model) => {
      // 从 proxies 中找到对应的中转站和分组
      const proxy = proxies.value.find(p => p.id === model.proxyId);
      if (!proxy) {
        message.error("找不到对应的中转站信息");
        return;
      }
      
      // 查找分组信息
      let groupName = model.groupName;
      let groupKey = "";
      
      if (proxy.groups) {
        const group = proxy.groups.find(g => g.id === model.groupId);
        if (group) {
          groupKey = group.key;
        }
      }
      
      router.push({
        path: "/trace",
        query: {
          baseUrl: proxy.baseUrl,
          key: groupKey,
          model: model.id,
          groupName: groupName
        }
      });
    };

    // 查看模型详情
    const viewModelDetail = (proxyId, groupId, modelId) => {
      // 找到当前代理和分组
      const proxy = proxies.value.find(p => p.id === proxyId);
      if (proxy) {
        const group = proxy.groups?.find(g => g.id === groupId);
        if (group) {
          router.push({
            path: `/model-detail/${proxyId}/${groupId}/${modelId}`,
            query: {
              groupName: group.name
            }
          });
          return;
        }
      }
      // 如果找不到分组信息，使用原来的方式
      router.push(`/model-detail/${proxyId}/${groupId}/${modelId}`);
    };

    onMounted(() => {
      fetchAllModels();
    });

    return {
      loading,
      allModels,
      modelSearchText,
      modelColumns,
      filteredModels,
      modelRemarkDialog,
      modelPriceDialog,
      formatDate,
      handleModelSearch,
      updateReverseStatus,
      editModelRemark,
      saveModelRemark,
      editModelPriceParams,
      saveModelPriceParams,
      sendToTrace,
      viewModelDetail
    };
  }
};
</script>

<style scoped>
.model-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.empty-data {
  padding: 40px 0;
  text-align: center;
}

.price-preview {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}
</style>
