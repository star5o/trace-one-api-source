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
          <div class="model-filters">
            <a-space>
              <a-select
                v-model:value="sortOption"
                style="width: 180px"
                placeholder="按价格排序"
                @change="handleSortChange"
              >
                <a-select-option value="default">默认排序</a-select-option>
                <a-select-option value="inputPriceAsc">输入价格升序</a-select-option>
                <a-select-option value="inputPriceDesc">输入价格降序</a-select-option>
                <a-select-option value="outputPriceAsc">输出价格升序</a-select-option>
                <a-select-option value="outputPriceDesc">输出价格降序</a-select-option>
              </a-select>
              <a-select
                v-model:value="reverseFilter"
                style="width: 150px"
                placeholder="选择是否逆向"
                @change="handleReverseFilterChange"
              >
                <a-select-option value="all">全部模型</a-select-option>
                <a-select-option value="reverse">逆向模型</a-select-option>
                <a-select-option value="nonReverse">非逆向模型</a-select-option>
              </a-select>
            </a-space>
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
              <span v-if="record.input_price !== undefined">
                {{ record.input_price.toFixed(4) }} 美元/M tokens
                <br>
                <small>{{ (record.input_price * (record.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens</small>
              </span>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'outputPrice'">
              <span v-if="record.output_price !== undefined">
                {{ record.output_price.toFixed(4) }} 美元/M tokens
                <br>
                <small>{{ (record.output_price * (record.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens</small>
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
        <div class="price-preview" v-if="modelPriceDialog.form.modelRatio && modelPriceDialog.form.completionRatio">
          <p>
            <strong>输入价格预览：</strong>
            {{ (modelPriceDialog.form.modelRatio * 2).toFixed(4) }} 美元/M tokens
            <br>
            <small>{{ (modelPriceDialog.form.modelRatio * 2 * (modelPriceDialog.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens</small>
          </p>
          <p>
            <strong>输出价格预览：</strong>
            {{ (modelPriceDialog.form.modelRatio * 2 * modelPriceDialog.form.completionRatio).toFixed(4) }} 美元/M tokens
            <br>
            <small>{{ (modelPriceDialog.form.modelRatio * 2 * modelPriceDialog.form.completionRatio * (modelPriceDialog.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens</small>
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
    const sortOption = ref("default");
    const reverseFilter = ref("all");
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

    // 处理排序选项变化
    const handleSortChange = (value) => {
      sortOption.value = value;
    };

    // 处理逆向筛选变化
    const handleReverseFilterChange = (value) => {
      reverseFilter.value = value;
    };

    // 过滤后的模型列表
    const filteredModels = computed(() => {
      // 先根据搜索文本过滤
      let filtered = allModels.value;
      
      if (modelSearchText.value) {
        const searchText = modelSearchText.value.toLowerCase();
        filtered = filtered.filter(model => {
          return (
            model.id.toLowerCase().includes(searchText) ||
            (model.remark && model.remark.toLowerCase().includes(searchText)) ||
            (model.proxyName && model.proxyName.toLowerCase().includes(searchText)) ||
            (model.groupName && model.groupName.toLowerCase().includes(searchText))
          );
        });
      }
      
      // 根据逆向状态过滤
      if (reverseFilter.value !== 'all') {
        filtered = filtered.filter(model => {
          if (reverseFilter.value === 'reverse') {
            return !!model.is_reverse;
          } else {
            return !model.is_reverse;
          }
        });
      }
      
      // 根据选择的排序方式排序
      if (sortOption.value !== 'default') {
        filtered = [...filtered]; // 创建副本以避免直接修改原数组
        
        filtered.sort((a, b) => {
          // 获取价格数据
          const aInputPrice = a.input_price || 0;
          const bInputPrice = b.input_price || 0;
          const aOutputPrice = a.output_price || 0;
          const bOutputPrice = b.output_price || 0;
          
          // 获取汇率
          const aExchangeRate = a.exchangeRate || 7.0;
          const bExchangeRate = b.exchangeRate || 7.0;
          
          // 计算人民币价格
          const aInputPriceRMB = aInputPrice * aExchangeRate;
          const bInputPriceRMB = bInputPrice * bExchangeRate;
          const aOutputPriceRMB = aOutputPrice * aExchangeRate;
          const bOutputPriceRMB = bOutputPrice * bExchangeRate;
          
          // 根据排序选项进行排序
          switch (sortOption.value) {
            case 'inputPriceAsc':
              return aInputPriceRMB - bInputPriceRMB;
            case 'inputPriceDesc':
              return bInputPriceRMB - aInputPriceRMB;
            case 'outputPriceAsc':
              return aOutputPriceRMB - bOutputPriceRMB;
            case 'outputPriceDesc':
              return bOutputPriceRMB - aOutputPriceRMB;
            default:
              return 0;
          }
        });
      }
      
      return filtered;
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
      modelPriceDialog.form = {
        proxyId: model.proxyId,
        groupId: model.groupId,
        modelId: model.id,
        modelRatio: model.model_ratio || 1.0,
        completionRatio: model.completion_ratio || 1.0
      };
      
      modelPriceDialog.exchangeRate = model.exchangeRate || 7.0;
      modelPriceDialog.visible = true;
    };

    // 保存模型价格参数
    const saveModelPriceParams = async () => {
      try {
        const { modelId, modelRatio, completionRatio } = modelPriceDialog.form;
        
        if (!modelRatio || !completionRatio) {
          message.error("请填写所有价格参数");
          return;
        }
        
        if (modelRatio <= 0 || completionRatio <= 0) {
          message.error("价格参数必须大于0");
          return;
        }
        
        await axios.put(`/api/models/${modelId}/price-params`, {
          model_ratio: modelRatio,
          completion_ratio: completionRatio
        });
        
        // 更新本地数据
        const modelIndex = allModels.value.findIndex(m => m.id === modelId);
        
        if (modelIndex !== -1) {
          const model = allModels.value[modelIndex];
          model.model_ratio = modelRatio;
          model.completion_ratio = completionRatio;
          
          // 更新价格（需要从后端获取group_ratio）
          await fetchAllModels();
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
      
      // 构建 URL
      const url = router.resolve({
        path: "/trace",
        query: {
          baseUrl: proxy.baseUrl,
          key: groupKey,
          model: model.id,
          groupName: groupName
        }
      }).href;
      
      // 在新窗口中打开
      window.open(url, '_blank');
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
      sortOption,
      reverseFilter,
      modelColumns,
      filteredModels,
      modelRemarkDialog,
      modelPriceDialog,
      formatDate,
      handleModelSearch,
      handleSortChange,
      handleReverseFilterChange,
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
  flex-wrap: wrap;
  align-items: center;
}

.model-search {
  margin-bottom: 8px;
}

.model-filters {
  margin-bottom: 8px;
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
