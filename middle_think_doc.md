各种二开版本不一样，没有请求对的会返回 404 或其他错误
new api 的网站可用：
/api/user/self/groups 获取用户能用的分组，需要提供 int new-api-user 的 id，放到请求头里
/api/user/models 获取用户能用的模型，需要提供 int new-api-user 的 id，放到请求头里
/api/pricing 获取模型价格
voapi（比如 aiiai）：
/api/models/price 获取模型价格
/api/groups 获取所有分组
RixAPI:
/api/pricing 里有所有分组和模型
/api/level/ 里也有所有分组,只有设置了 tier 的站才有

# 分组列表格式

/api/pricing 的不同返回格式：

voAPI:
bltcy aiiai1

```json
{
  "data": [
    {
      "key": "ssvip",
      "name": "官方优质(ssvip)-可用本平台所有模型",
      "visible": true,
      "desc": "支持所有模型-最快最稳"
    },
    {
      "key": "origin",
      "name": "企业分组(origin)-OpenAI全模型官方原价",
      "visible": true,
      "desc": "官方原价，不计成本维护该分组稳定性"
    },
    {
      "key": "default",
      "name": "官方+合作厂商(default)",
      "visible": true,
      "desc": "例如 OpenAI+企业版Azure-综合体验"
    },
    {
      "key": "svip",
      "name": "合作厂商(svip)",
      "visible": true,
      "desc": "例如 企业版Azure-综合体验"
    },
    {
      "key": "vvip",
      "name": "逆向按次(vvip)",
      "visible": true,
      "desc": "纯官方逆向-长文本价格优惠"
    },
    {
      "key": "vip",
      "name": "逆向按量(vip)",
      "visible": true,
      "desc": "纯官方逆向-价格优惠"
    }
  ],
  "message": "",
  "success": true
}
```

RixAPI：

```json
{"data":{
    "model_group":{
         "Azure": {
                "Description": "Azure企业渠道，仅包含OpenAI模型，高速无审核。",
                "DisplayName": "微软通道",
                "GroupRatio": 1,
                "ModelPrice": Object{...}
            },
            "官转": {
                "DisplayName": "官+az渠道",
                "GroupRatio": 3,
                "ModelPrice": Object{...}
            },
            ...
    }
}
}
```

new-api
chataiapi gala

{"data":{
"usable_group": {
"Claude 官转": "Claude 官转-假一罚百",
"auto": "自动分组，最优价格",
"az": "纯 Az 模型分组",
"deepseek": "deepseek 模型分组",
"default": "用户分组",
"gemini_exp": "gemini 实验模型分组",
"gemini_exp_1114/1121/1206": "gemini 稀缺模型分组",
"openai_gpt": "gpt 模型分组",
"vip": "提前沟通分组",
"逆向全模型": "各种逆向大模型"
}
}}

# 价格计算方式

输入价格（每 M token 多少美元）=分组倍率 × 模型倍率 × 2
输出价格（每 M token 多少美元）=分组倍率 × 模型倍率 × 2 × 补全倍率
每个不同的中转站有不同的汇率计算方式，多少人民币1美元需要用户来填写。
不同的中转站有不同的价格获取格式：
①new-api 的
baseurl/api/pricing

```json
{
  "data": [
    {
      "model_name": "o1-mini",
      "quota_type": 0,
      "model_ratio": 1.5,
      "model_price": 0,
      "owner_by": "",
      "completion_ratio": 4,
      "enable_groups": ["gpt-vip"]
    },
    {
      "model_name": "o3-mini-medium",
      "quota_type": 0,
      "model_ratio": 37.5,
      "model_price": 0,
      "owner_by": "",
      "completion_ratio": 4,
      "enable_groups": ["gpt-vip"]
    }
  ],
  "group_ratio": {
    "Deepseek": 1,
    "Gemini": 0.5,
    "claudeguankey": 3.5,
    "cur-claude": 0.6,
    "default": 1,
    "gpt-vip": 3.5,
    "grok": 1,
    "vip": 2
  },
  "success": true,
  "usable_group": {
    "": "用户分组",
    "Deepseek": "Deepseek极速满血版",
    "Gemini": "Gemini",
    "claudeguankey": "Claude官key",
    "cur-claude": "cursor逆向",
    "default": "别选，无可用模型",
    "gpt-vip": "gpt官key",
    "grok": "grok",
    "vip": "vip分组"
  }
}
```
data数组里：model_name 为模型名称，enable_groups 代表这个模型能在哪几个分组里面使用。
usable_group 为分组列表。
group_ratio 为每个分组的分组倍率，model_ratio 为模型倍率，completion_ratio 为补全倍率

②Rix-api 的
baseurl/api/pricing

```json
{
    "data": {
        "group_special": {
            "babbage-002": [
                "Azure",
                "default",
                "Enterprise",
                "Official"
            ],
            "bagel-34b": [
                "default"
            ]
        },
        "model_completion_ratio": {
            "claude-2": 3,
            "claude-2.0": 3,
            "claude-2.1": 3,
            "claude-3-5-haiku-20241022": 5,
            "claude-3-5-haiku-latest": 5,
            "claude-3-5-sonnet-20240620": 5
        },
        "model_group": {
            "Azure": {
                "Description": "Azure企业渠道，仅包含OpenAI模型，高速无审核。",
                "DisplayName": "微软通道",
                "GroupRatio": 1,
                "ModelPrice": {
                     "deepseek-chat": {
                        "isPrice": false,
                        "price": 1
                    },
                    "deepseek-reasoner": {
                        "isPrice": false,
                        "price": 2
                    }
                }
            },
            "Official": {
                "Description": "仅包含OpenAI和Anthropic官方模型，Claude额外有1.33倍。",
                "DisplayName": "官转通道",
                "GroupRatio": 3,
                "ModelPrice": {
                     "deepseek-chat": {
                        "isPrice": false,
                        "price": 1
                    },
                    "deepseek-reasoner": {
                        "isPrice": false,
                        "price": 2
                    }
                }
            },
            ...
        }
    }
}
```
group_special 代表这个模型能在哪几个分组里面使用，model_completion_ratio 代表这个模型的补全倍率。model_group 为分组列表，每个分组的GroupRatio 代表分组倍率，ModelPrice 里的每个模型的price代表模型倍率

③VoAPI的
baseurl/api/models/price
```json
{
    "data": {
        "models": [
            {
                "key": "o1",
                "name": "o1",
                "provider": "open-ai",
                "tags": "对话,推理",
                "price_type": "",
                "desc": "\u003cdiv\u003eo1 完整版，会花费更多时间思考（形成思路链）才能得出答案，这让它更适合执行复杂的推理任务，尤其是科学和数学任务\u003c/div\u003e",
                "status": 0,
                "completion_ratio": 4,
                "group_price": {
                    "default": {
                        "type": 0,
                        "price": 15
                    },
                    "ssvip": {
                        "type": 0,
                        "price": 22.5
                    },
                    "svip": {
                        "type": 0,
                        "price": 7.5
                    },
                    "vip": {
                        "type": 1,
                        "price": 0.4
                    },
                    "vvip": {
                        "type": 1,
                        "price": 0.4
                    }
                }
            },
            ...
        ]
    }
}
```

models 为模型列表，key 为模型名称，每个模型的 completion_ratio 代表补全倍率，group_price里每个分组的price 代表分组倍率 × 模型倍率的结果
