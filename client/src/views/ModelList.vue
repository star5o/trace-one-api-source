<template>
  <div class="model-list-container">
    <a-card title="模型列表" :bordered="false">
      <template #extra>
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索模型"
          style="width: 200px"
          @search="handleSearch"
        />
      </template>
      
      <a-spin :spinning="loading">
        <a-table
          :columns="columns"
          :data-source="filteredModels"
          :pagination="{ pageSize: 10 }"
          :row-key="record => record.id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'proxyName'">
              {{ record.proxyName }}
            </template>
            <template v-else-if="column.key === 'groupName'">
              {{ record.groupName }}
            </template>
            <template v-else-if="column.key === 'baseUrl'">
              {{ record.baseUrl }}
            </template>
            <template v-else-if="column.key === 'inputPrice'">
              <span v-if="record.calculatedPrices && (record.calculatedPrices.inputPrice !== undefined)">
                {{ record.calculatedPrices.inputPrice.toFixed(4) }} 美元/M tokens
                <br>
                <small>{{ (record.calculatedPrices.inputPrice * (record.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens</small>
              </span>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'outputPrice'">
              <span v-if="record.calculatedPrices && (record.calculatedPrices.outputPrice !== undefined)">
                {{ record.calculatedPrices.outputPrice.toFixed(4) }} 美元/M tokens
                <br>
                <small>{{ (record.calculatedPrices.outputPrice * (record.exchangeRate || 7.0)).toFixed(4) }} 人民币/M tokens</small>
              </span>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button
                size="small"
                type="primary"
                @click="sendToTrace(record)"
              >发送到溯源</a-button>
              <a-button
                size="small"
                @click="viewModelDetail(record)"
                style="margin-left: 8px"
              >查看溯源记录</a-button>
              <a-button
                size="small"
                @click="editModelRemark(record)"
                style="margin-left: 8px"
              >编辑备注</a-button>
              <a-button
                size="small"
                @click="editModelPriceParams(record)"
                style="margin-left: 8px"
              >编辑价格参数</a-button>
            </template>
          </template>
        </a-table>
      </a-spin>
    </a-card>

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
        <a-form-item label="模型名称" name="modelId">
          <a-input v-model:value="priceParamsForm.modelId" disabled />
        </a-form-item>
        <a-form-item label="分组倍率" name="groupRatio">
          <a-input-number 
            v-model:value="priceParamsForm.groupRatio" 
            :min="0.01" 
            :max="100" 
            :step="0.01" 
            style="width: 100%" 
          />
        </a-form-item>
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
            <p>输入价格 = 分组倍率 × 模型倍率 × 2</p>
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
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { message, Modal } from "ant-design-vue";
import { apiClient } from "../utils/api";

export default {
  name: "ModelList",
  setup() {
    const router = useRouter();
    
    // 表格数据和加载状态
    const allModels = ref([]);
    const loading = ref(true);
    const searchText = ref("");
    
    // 表格列定义
    const columns = [
      {
        title: "模型ID",
        dataIndex: "id",
        key: "id",
        width: 150,
      },
      {
        title: "所属中转站",
        key: "proxyName",
        width: 120,
      },
      {
        title: "所属分组",
        key: "groupName",
        width: 120,
      },
      {
        title: "Base URL",
        key: "baseUrl",
        width: 200,
      },
      {
        title: "输入价格",
        key: "inputPrice",
        width: 150,
      },
      {
        title: "输出价格",
        key: "outputPrice",
        width: 150,
      },
      {
        title: "备注",
        dataIndex: "remark",
        key: "remark",
        width: 200,
      },
      {
        title: "操作",
        key: "action",
        width: 300,
      },
    ];
    
    // 获取所有模型数据
    const fetchAllModels = async () => {
      loading.value = true;
      try {
        // 先获取所有中转站
        const proxyResponse = await apiClient.get('/proxies');
        const proxies = proxyResponse.data;
        
        const allModelsList = [];
        
        // 遍历所有中转站，获取其下的所有模型
        for (const proxy of proxies) {
          const proxyDetailResponse = await apiClient.get(`/proxies/${proxy.id}`);
          const proxyDetail = proxyDetailResponse.data;
          
          if (proxyDetail.groups && proxyDetail.groups.length > 0) {
            for (const group of proxyDetail.groups) {
              if (group.models && group.models.length > 0) {
                for (const model of group.models) {
                  // 计算价格
                  const calculatedPrices = calculateModelPrices(model, group);
                  
                  // 添加中转站和分组信息到模型对象
                  allModelsList.push({
                    ...model,
                    proxyId: proxy.id,
                    proxyName: proxy.name,
                    baseUrl: proxy.baseUrl,
                    exchangeRate: proxy.exchangeRate || 7.0,
                    groupId: group.id,
                    groupName: group.name,
                    calculatedPrices
                  });
                }
              }
            }
          }
        }
        
        allModels.value = allModelsList;
      } catch (error) {
        console.error('获取模型列表失败:', error);
        message.error('获取模型列表失败');
      } finally {
        loading.value = false;
      }
    };
    
    // 计算模型价格
    const calculateModelPrices = (model, group) => {
      // 默认值
      let groupRatio = 1;
      let modelRatio = 1;
      let completionRatio = 1;
      
      // 从分组获取分组倍率
      if (group.price_data) {
        try {
          const groupPriceData = typeof group.price_data === 'string' 
            ? JSON.parse(group.price_data) 
            : group.price_data;
          
          if (groupPriceData && groupPriceData.group_ratio) {
            groupRatio = parseFloat(groupPriceData.group_ratio);
          }
        } catch (e) {
          console.error('解析分组价格数据失败:', e);
        }
      }
      
      // 从模型获取模型倍率和补全倍率
      if (model.price_data) {
        try {
          const modelPriceData = typeof model.price_data === 'string' 
            ? JSON.parse(model.price_data) 
            : model.price_data;
          
          if (modelPriceData) {
            if (modelPriceData.model_ratio) {
              modelRatio = parseFloat(modelPriceData.model_ratio);
            }
            if (modelPriceData.completion_ratio) {
              completionRatio = parseFloat(modelPriceData.completion_ratio);
            }
          }
        } catch (e) {
          console.error('解析模型价格数据失败:', e);
        }
      }
      
      // 计算输入和输出价格
      const inputPrice = groupRatio * modelRatio * 2;
      const outputPrice = inputPrice * completionRatio;
      
      return {
        groupRatio,
        modelRatio,
        completionRatio,
        inputPrice,
        outputPrice
      };
    };
    
    // 根据搜索文本过滤模型
    const filteredModels = computed(() => {
      if (!searchText.value) {
        return allModels.value;
      }
      
      const search = searchText.value.toLowerCase();
      return allModels.value.filter(model => {
        return (
          (model.id && model.id.toLowerCase().includes(search)) ||
          (model.proxyName && model.proxyName.toLowerCase().includes(search)) ||
          (model.remark && model.remark.toLowerCase().includes(search))
        );
      });
    });
    
    // 处理搜索
    const handleSearch = () => {
      // 搜索文本改变时自动触发过滤，不需要额外操作
    };
    
    // 发送到溯源
    const sendToTrace = (model) => {
      router.push({
        path: `/trace/${model.proxyId}/${model.groupId}/${model.id}`,
        query: {
          proxyName: model.proxyName,
          groupName: model.groupName,
        },
      });
    };
    
    // 查看溯源记录
    const viewModelDetail = (model) => {
      router.push({
        path: `/model-detail/${model.proxyId}/${model.groupId}/${model.id}`,
        query: {
          groupName: model.groupName,
        },
      });
    };
    
    // 编辑模型备注
    const editModelRemark = (model) => {
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
            
            // 更新当前模型的备注
            model.remark = modelRemarkInput;
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
    const priceParamsFormRef = ref(null);
    const priceParamsDialog = reactive({
      visible: false,
      currentModel: null
    });
    
    // 价格参数表单
    const priceParamsForm = reactive({
      modelId: '',
      groupRatio: 1,
      modelRatio: 1,
      completionRatio: 1
    });
    
    // 价格参数表单验证规则
    const priceParamsRules = {
      groupRatio: [
        { required: true, message: '请输入分组倍率', trigger: 'blur' },
        { type: 'number', min: 0.01, message: '倍率必须大于0.01', trigger: 'blur' }
      ],
      modelRatio: [
        { required: true, message: '请输入模型倍率', trigger: 'blur' },
        { type: 'number', min: 0.01, message: '倍率必须大于0.01', trigger: 'blur' }
      ],
      completionRatio: [
        { required: true, message: '请输入补全倍率', trigger: 'blur' },
        { type: 'number', min: 0.01, message: '倍率必须大于0.01', trigger: 'blur' }
      ]
    };
    
    // 计算输入价格
    const calculateInputPrice = () => {
      const inputPrice = priceParamsForm.groupRatio * priceParamsForm.modelRatio * 2;
      return inputPrice.toFixed(4);
    };
    
    // 计算输出价格
    const calculateOutputPrice = () => {
      const inputPrice = priceParamsForm.groupRatio * priceParamsForm.modelRatio * 2;
      const outputPrice = inputPrice * priceParamsForm.completionRatio;
      return outputPrice.toFixed(4);
    };
    
    // 编辑模型价格参数
    const editModelPriceParams = (model) => {
      priceParamsDialog.currentModel = model;
      
      // 初始化表单数据
      priceParamsForm.modelId = model.id;
      
      // 从模型中获取价格参数
      if (model.prices) {
        priceParamsForm.groupRatio = model.prices.group_ratio || 1;
        priceParamsForm.modelRatio = model.prices.model_ratio || 1;
        priceParamsForm.completionRatio = model.prices.completion_ratio || 1;
      } else {
        // 默认值
        priceParamsForm.groupRatio = 1;
        priceParamsForm.modelRatio = 1;
        priceParamsForm.completionRatio = 1;
      }
      
      priceParamsDialog.visible = true;
    };
    
    // 提交价格参数表单
    const submitPriceParamsForm = async () => {
      if (!priceParamsFormRef.value) return;
      
      try {
        await priceParamsFormRef.value.validate();
        
        const { currentModel } = priceParamsDialog;
        
        if (!currentModel) {
          message.error('模型信息不完整');
          return;
        }
        
        // 准备要保存的价格参数数据
        const priceData = {
          group_ratio: priceParamsForm.groupRatio,
          model_ratio: priceParamsForm.modelRatio,
          completion_ratio: priceParamsForm.completionRatio
        };
        
        try {
          // 发送请求更新模型的价格参数
          await apiClient.put(`/models/${currentModel.id}/price-params`, priceData);
          
          // 更新前端模型对象的价格信息
          const inputPrice = priceParamsForm.groupRatio * priceParamsForm.modelRatio * 2;
          const outputPrice = inputPrice * priceParamsForm.completionRatio;
          
          if (!currentModel.prices) {
            currentModel.prices = {};
          }
          
          // 更新价格参数
          currentModel.prices.group_ratio = priceParamsForm.groupRatio;
          currentModel.prices.model_ratio = priceParamsForm.modelRatio;
          currentModel.prices.completion_ratio = priceParamsForm.completionRatio;
          
          // 更新计算结果
          currentModel.prices.input_price = inputPrice;
          currentModel.prices.output_price = outputPrice;
          
          message.success('价格参数更新成功');
          priceParamsDialog.visible = false;
        } catch (error) {
          console.error('更新价格参数失败:', error);
          message.error('更新价格参数失败: ' + (error.response?.data?.message || error.message || '未知错误'));
        }
      } catch (e) {
        // 表单验证失败
      }
    };
    
    onMounted(() => {
      fetchAllModels();
    });
    
    return {
      allModels,
      filteredModels,
      loading,
      columns,
      searchText,
      handleSearch,
      sendToTrace,
      viewModelDetail,
      editModelRemark,
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
.model-list-container {
  padding: 24px;
}

.ant-table-wrapper {
  margin-top: 16px;
}
</style>
