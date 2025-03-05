const TraceModel = require('../models/trace');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

class TraceController {
  // 创建溯源记录并发送请求
  static async create(req, res) {
    try {
      const { baseUrl, key, model } = req.body;
      
      if (!baseUrl || !key || !model) {
        return res.status(400).json({ message: 'Base URL、API Key和模型ID不能为空' });
      }
      
      // 生成追踪ID
      const traceId = uuidv4();
      
      // 获取客户端IP和User-Agent
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      // 记录请求时间
      const requestTime = Date.now();
      
      // 构建图片URL
      const imageUrl = `${req.protocol}://${req.get('host')}/api/img?traceid=${traceId}`;
      
      // 构建OpenAI API请求
      const openaiRequest = {
        model,
        messages: [
          {
            role: 'system',
            content: '你是一个助手'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `这是一个溯源测试，请查看图片。当前时间: ${new Date().toISOString()}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        // 不使用流式响应，因为我们需要完整的响应内容进行存储
        stream: false
      };
      
      // 创建溯源记录
      const traceData = {
        traceId,
        baseUrl,
        key,
        model,
        ip,
        userAgent,
        headers: req.headers,
        requestBody: openaiRequest,
        requestTime
      };
      
      const trace = await TraceModel.create(traceData);
      
      try {
        // 发送请求到OpenAI API，增加超时时间为120秒
        const openaiResponse = await axios.post(`${baseUrl}/v1/chat/completions`, openaiRequest, {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000, // 增加到120秒
          maxContentLength: Infinity, // 允许大响应体
          maxBodyLength: Infinity // 允许大请求体
        });
        
        // 记录响应时间和响应体
        const responseTime = Date.now();
        await TraceModel.update(traceId, { 
          responseTime,
          responseBody: openaiResponse.data
        });
        
        // 获取更新后的溯源记录
        const updatedTrace = await TraceModel.getByTraceId(traceId);
        
        res.status(201).json(updatedTrace);
      } catch (error) {
        console.error('OpenAI API请求失败:', error);
        
        // 记录错误响应
        const responseTime = Date.now();
        const errorResponse = {
          error: {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          }
        };
        
        await TraceModel.update(traceId, { 
          responseTime,
          responseBody: errorResponse
        });
        
        // 获取更新后的溯源记录
        const updatedTrace = await TraceModel.getByTraceId(traceId);
        
        res.status(201).json(updatedTrace);
      }
    } catch (error) {
      console.error('创建溯源记录失败:', error);
      res.status(500).json({ message: '创建溯源记录失败', error: error.message });
    }
  }

  // 处理图片请求（用于溯源）
  static async handleImageRequest(req, res) {
    try {
      const { traceid } = req.query;
      
      if (!traceid) {
        return res.status(400).json({ message: '追踪ID不能为空' });
      }
      
      // 获取客户端IP和User-Agent
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      // 查找溯源记录
      const trace = await TraceModel.getByTraceId(traceid);
      
      if (trace) {
        // 如果记录存在但IP不同，说明是通过中转节点访问
        if (trace.ip !== ip) {
          console.log(`检测到中转节点访问: ${ip} (原IP: ${trace.ip})`);
          
          // 更新溯源记录（这里可以添加中转节点信息）
          // 为简化，这里不做更新，但实际应用中可以记录中转节点信息
        }
      }
      
      // 返回一个随机颜色的1x1像素图片
      const color = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      const svg = `<svg width="1" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1" fill="#${color}"/></svg>`;
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch (error) {
      console.error('处理图片请求失败:', error);
      res.status(500).json({ message: '处理图片请求失败', error: error.message });
    }
  }

  // 删除溯源记录
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await TraceModel.delete(id);
      res.json(result);
    } catch (error) {
      console.error('删除溯源记录失败:', error);
      
      if (error.message === '溯源记录不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '删除溯源记录失败', error: error.message });
    }
  }

  // 获取单个溯源记录
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const trace = await TraceModel.getById(id);
      res.json(trace);
    } catch (error) {
      console.error('获取溯源记录失败:', error);
      
      if (error.message === '溯源记录不存在') {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: '获取溯源记录失败', error: error.message });
    }
  }

  // 获取溯源记录列表（分页）
  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const traces = await TraceModel.getAll(page, limit);
      res.json(traces);
    } catch (error) {
      console.error('获取溯源记录列表失败:', error);
      res.status(500).json({ message: '获取溯源记录列表失败', error: error.message });
    }
  }

  // 根据模型ID获取溯源记录
  static async getByModel(req, res) {
    try {
      const { modelId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const traces = await TraceModel.getByModel(modelId, page, limit);
      res.json(traces);
    } catch (error) {
      console.error('获取模型溯源记录失败:', error);
      res.status(500).json({ message: '获取模型溯源记录失败', error: error.message });
    }
  }
}

module.exports = TraceController;
