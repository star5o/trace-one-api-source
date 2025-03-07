


各种二开版本不一样，没有请求对的会返回404或其他错误
new api的网站可用：
    /api/user/self/groups 获取用户能用的分组，需要提供int new-api-user的id，放到请求头里
    /api/user/models 获取用户能用的模型，需要提供int new-api-user的id，放到请求头里
    /api/pricing 获取模型价格
voapi（比如aiiai）：
    /api/models/price 获取模型价格
    /api/groups 获取所有分组
RixAPI:
    /api/pricing 里有所有分组和模型
    /api/level/ 里也有所有分组,只有设置了tier的站才有

/api/pricing的不同返回格式：

voAPI:
bltcy aiiai1 
```json
{"data":[{"key":"ssvip","name":"官方优质(ssvip)-可用本平台所有模型","visible":true,"desc":"支持所有模型-最快最稳"},{"key":"origin","name":"企业分组(origin)-OpenAI全模型官方原价","visible":true,"desc":"官方原价，不计成本维护该分组稳定性"},{"key":"default","name":"官方+合作厂商(default)","visible":true,"desc":"例如 OpenAI+企业版Azure-综合体验"},{"key":"svip","name":"合作厂商(svip)","visible":true,"desc":"例如 企业版Azure-综合体验"},{"key":"vvip","name":"逆向按次(vvip)","visible":true,"desc":"纯官方逆向-长文本价格优惠"},{"key":"vip","name":"逆向按量(vip)","visible":true,"desc":"纯官方逆向-价格优惠"}],"message":"","success":true}
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
```json

{"data":[{"model_name":"gemini-2.0-flash","quota_type":0,"model_ratio":0.0625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["gemini_exp"]},{"model_name":"claude-3-5-haiku-20241022","quota_type":0,"model_ratio":0.4,"model_price":0,"owner_by":"","completion_ratio":5,"enable_groups":["bobo","Claude官转","eveeve","zhiguo"]},{"model_name":"claude-3-5-sonnet-20240620","quota_type":0,"model_ratio":1.5,"model_price":0,"owner_by":"","completion_ratio":5,"enable_groups":["bobo","Claude官转","eveeve","zhiguo"]},{"model_name":"gemini-1.5-pro","quota_type":0,"model_ratio":0.625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["default","gemini_exp"]},{"model_name":"gemini-1.5-pro-002","quota_type":0,"model_ratio":0.625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["default","gemini_exp"]},{"model_name":"gemini-2.0-flash-lite-preview-02-05","quota_type":0,"model_ratio":0.625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["gemini_exp"]},{"model_name":"gemini-2.0-flash-thinking-exp-01-21","quota_type":0,"model_ratio":0.625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["gemini_exp"]},{"model_name":"gemini-2.0-pro-exp-02-05","quota_type":0,"model_ratio":1.25,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["gemini_exp"]},{"model_name":"claude-3-7-sonnet-20250219","quota_type":0,"model_ratio":1.5,"model_price":0,"owner_by":"","completion_ratio":5,"enable_groups":["bobo","Claude官转","eveeve","zhiguo"]},{"model_name":"claude-3-opus-20240229","quota_type":0,"model_ratio":7.5,"model_price":0,"owner_by":"","completion_ratio":5,"enable_groups":["bobo","Claude官转","eveeve","zhiguo"]},{"model_name":"claude-3-sonnet-20240229","quota_type":0,"model_ratio":1.5,"model_price":0,"owner_by":"","completion_ratio":5,"enable_groups":["bobo","Claude官转","eveeve","zhiguo"]},{"model_name":"deepseek-chat","quota_type":0,"model_ratio":1,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["deepseek","vip"]},{"model_name":"deepseek-reasoner","quota_type":0,"model_ratio":2,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["deepseek","vip"]},{"model_name":"gemini-1.5-flash-8b","quota_type":0,"model_ratio":0.03125,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["default","gemini_exp"]},{"model_name":"gemini-2.0-flash-exp","quota_type":0,"model_ratio":0.625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["gemini_exp"]},{"model_name":"gemini-2.0-flash-thinking-exp","quota_type":0,"model_ratio":0.625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["gemini_exp"]},{"model_name":"claude-3-5-sonnet-20241022","quota_type":0,"model_ratio":1.5,"model_price":0,"owner_by":"","completion_ratio":5,"enable_groups":["bobo","Claude官转","eveeve","zhiguo"]},{"model_name":"deepseek-r1","quota_type":0,"model_ratio":2,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["deepseek","vip"]},{"model_name":"gemini-1.5-flash-002","quota_type":0,"model_ratio":0.0625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["default","gemini_exp"]},{"model_name":"gemini-1.5-flash-latest","quota_type":0,"model_ratio":0.0625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["default","gemini_exp"]},{"model_name":"gemini-1.5-pro-001","quota_type":0,"model_ratio":0.625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["default","gemini_exp"]},{"model_name":"gemini-1.5-pro-latest","quota_type":0,"model_ratio":0.625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["default","gemini_exp"]},{"model_name":"gemini-2.0-flash-lite","quota_type":0,"model_ratio":0.625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["gemini_exp"]},{"model_name":"gemini-2.0-flash-thinking-exp-1219","quota_type":0,"model_ratio":0.625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["gemini_exp"]},{"model_name":"claude-3-7-sonnet-20250219-thinking","quota_type":0,"model_ratio":1.5,"model_price":0,"owner_by":"","completion_ratio":5,"enable_groups":["bobo","Claude官转","eveeve","zhiguo"]},{"model_name":"claude-3-haiku-20240307","quota_type":0,"model_ratio":0.125,"model_price":0,"owner_by":"","completion_ratio":5,"enable_groups":["bobo","Claude官转","eveeve","zhiguo"]},{"model_name":"deepseek-v3","quota_type":0,"model_ratio":1,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["deepseek","vip"]},{"model_name":"gemini-1.5-flash","quota_type":0,"model_ratio":0.0625,"model_price":0,"owner_by":"","completion_ratio":4,"enable_groups":["default","gemini_exp"]}],"group_ratio":{"Claude官转":33,"az":4,"deepseek":2,"default":2,"gemini_exp":3,"gemini_exp_1114/1121/1206":3,"openai_gpt":4,"vip":4,"逆向全模型":3},"success":true,"usable_group":{"Claude官转":"Claude官转-假一罚百","auto":"自动分组，最优价格","az":"纯Az模型分组","deepseek":"deepseek模型分组","default":"用户分组","gemini_exp":"gemini实验模型分组","gemini_exp_1114/1121/1206":"gemini稀缺模型分组","openai_gpt":"gpt模型分组","vip":"提前沟通分组","逆向全模型":"各种逆向大模型"}}
```

{"data":{
     "usable_group": {
        "Claude官转": "Claude官转-假一罚百",
        "auto": "自动分组，最优价格",
        "az": "纯Az模型分组",
        "deepseek": "deepseek模型分组",
        "default": "用户分组",
        "gemini_exp": "gemini实验模型分组",
        "gemini_exp_1114/1121/1206": "gemini稀缺模型分组",
        "openai_gpt": "gpt模型分组",
        "vip": "提前沟通分组",
        "逆向全模型": "各种逆向大模型"
    }
}}