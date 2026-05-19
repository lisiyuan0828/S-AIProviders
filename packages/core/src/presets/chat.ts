/**
 * Built-in chat-provider presets.
 *
 * The host app uses these to populate "quick add" UI / config templates.
 * Adding a new provider here is purely additive — no other code changes.
 */

import type { ProviderPreset } from '../types';

/**
 * ⭐ Tencent Cloud Token Plan (recommended default)
 * One subscription covers MiniMax / GLM / Kimi / etc. via OpenAI-compatible
 * /chat/completions. Note baseURL ends with /plan/v3.
 * Docs: https://cloud.tencent.com/document/product/1729
 */
export const TOKENPLAN_PRESET: ProviderPreset = {
  id: 'tokenplan',
  displayName: '腾讯云 Token Plan',
  protocol: 'openai-compatible',
  defaultBaseURL: 'https://api.lkeap.cloud.tencent.com/plan/v3',
  recommended: true,
  description:
    '一份套餐覆盖 MiniMax / GLM / Kimi 等热门第三方模型 · OpenAI 兼容 · Auto 智能路由',
  docsUrl: 'https://cloud.tencent.com/document/product/1729',
  builtinModels: [
    {
      id: 'tc-code-latest',
      label: 'Auto 智能路由',
      contextWindow: 128_000,
      description: '系统通过算法自动匹配最优模型（深度思考 / 文本生成）',
      capabilities: ['text'],
    },
    {
      id: 'minimax-m2.7',
      label: 'MiniMax-M2.7',
      contextWindow: 200_000,
      description:
        'MiniMax 自我进化大语言模型，具备卓越的软件工程能力和专业办公能力，支持复杂 Agent 交互与端到端项目交付',
      capabilities: ['text'],
    },
    {
      id: 'minimax-m2.5',
      label: 'MiniMax-M2.5',
      contextWindow: 200_000,
      description: '在编程、工具调用和搜索、办公等生产力场景达到或刷新行业 SOTA',
      capabilities: ['text'],
    },
    {
      id: 'glm-5.1',
      label: 'GLM-5.1',
      contextWindow: 128_000,
      description:
        '智谱最新旗舰模型，代码能力大大增强，长程任务显著提升，能够单次任务持续自主工作长达 8 小时',
      capabilities: ['text'],
    },
    {
      id: 'glm-5',
      label: 'GLM-5',
      contextWindow: 128_000,
      description:
        '智谱新一代旗舰基座模型，面向 Agentic Engineering 打造，Coding 与 Agent 能力开源 SOTA',
      capabilities: ['text'],
    },
    {
      id: 'kimi-k2.5',
      label: 'Kimi-K2.5',
      contextWindow: 128_000,
      description:
        'Kimi 迄今最全能模型，原生多模态架构，支持视觉与文本、思考与非思考模式、对话与 Agent 任务',
      capabilities: ['text', 'vision'],
    },
  ],
};

export const OPENAI_PRESET: ProviderPreset = {
  id: 'openai',
  displayName: 'OpenAI',
  protocol: 'openai-compatible',
  defaultBaseURL: 'https://api.openai.com/v1',
  description: 'OpenAI 官方',
  docsUrl: 'https://platform.openai.com/docs',
  builtinModels: [
    {
      id: 'gpt-4o',
      label: 'GPT-4o',
      contextWindow: 128_000,
      capabilities: ['text', 'vision', 'image-gen'],
    },
    {
      id: 'gpt-4o-mini',
      label: 'GPT-4o mini',
      contextWindow: 128_000,
      capabilities: ['text', 'vision'],
    },
    { id: 'o1-mini', label: 'o1-mini', contextWindow: 128_000, capabilities: ['text'] },
  ],
};

export const ANTHROPIC_PRESET: ProviderPreset = {
  id: 'anthropic',
  displayName: 'Anthropic',
  protocol: 'anthropic',
  defaultBaseURL: 'https://api.anthropic.com/v1',
  description: 'Claude 官方',
  docsUrl: 'https://docs.anthropic.com',
  builtinModels: [
    {
      id: 'claude-opus-4',
      label: 'Claude Opus 4',
      contextWindow: 200_000,
      capabilities: ['text', 'vision'],
    },
    {
      id: 'claude-sonnet-4',
      label: 'Claude Sonnet 4',
      contextWindow: 200_000,
      capabilities: ['text', 'vision'],
    },
  ],
};

export const GEMINI_PRESET: ProviderPreset = {
  id: 'gemini',
  displayName: 'Google Gemini',
  protocol: 'gemini',
  defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta',
  description: 'Google 官方',
  docsUrl: 'https://ai.google.dev/gemini-api/docs',
  builtinModels: [
    {
      id: 'gemini-2.5-pro',
      label: 'Gemini 2.5 Pro',
      contextWindow: 1_000_000,
      capabilities: ['text', 'vision', 'image-gen'],
    },
    {
      id: 'gemini-2.5-flash',
      label: 'Gemini 2.5 Flash',
      contextWindow: 1_000_000,
      capabilities: ['text', 'vision', 'image-gen'],
    },
  ],
};

export const DEEPSEEK_PRESET: ProviderPreset = {
  id: 'deepseek',
  displayName: 'DeepSeek',
  protocol: 'openai-compatible',
  defaultBaseURL: 'https://api.deepseek.com/v1',
  description: 'DeepSeek 官方',
  docsUrl: 'https://platform.deepseek.com/docs',
  builtinModels: [
    { id: 'deepseek-chat', label: 'DeepSeek Chat', capabilities: ['text'] },
    { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner', capabilities: ['text'] },
  ],
};

export const KIMI_PRESET: ProviderPreset = {
  id: 'kimi',
  displayName: 'Moonshot Kimi',
  protocol: 'openai-compatible',
  defaultBaseURL: 'https://api.moonshot.cn/v1',
  description: '月之暗面 Kimi',
  docsUrl: 'https://platform.moonshot.cn/docs',
  builtinModels: [
    {
      id: 'moonshot-v1-128k',
      label: 'Moonshot v1 128k',
      contextWindow: 128_000,
      capabilities: ['text'],
    },
    {
      id: 'moonshot-v1-128k-vision-preview',
      label: 'Moonshot v1 128k Vision',
      contextWindow: 128_000,
      capabilities: ['text', 'vision'],
      description: '支持图像理解的视觉模型',
    },
  ],
};

export const QWEN_PRESET: ProviderPreset = {
  id: 'qwen',
  displayName: '通义千问',
  protocol: 'openai-compatible',
  defaultBaseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  description: '阿里云通义千问（OpenAI 兼容模式）',
  docsUrl: 'https://help.aliyun.com/zh/dashscope/',
  builtinModels: [
    { id: 'qwen-max', label: 'Qwen Max', capabilities: ['text'] },
    { id: 'qwen-plus', label: 'Qwen Plus', capabilities: ['text'] },
    { id: 'qwen-turbo', label: 'Qwen Turbo', capabilities: ['text'] },
    {
      id: 'qwen-vl-max',
      label: 'Qwen-VL Max',
      capabilities: ['text', 'vision'],
      description: '视觉语言大模型，支持图像理解',
    },
  ],
};

export const DOUBAO_PRESET: ProviderPreset = {
  id: 'doubao',
  displayName: '字节豆包/火山方舟',
  protocol: 'openai-compatible',
  defaultBaseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  description: '字节火山方舟（豆包 / Doubao）',
  docsUrl: 'https://www.volcengine.com/docs/82379',
  builtinModels: [
    { id: 'doubao-pro-32k', label: 'Doubao Pro 32k', contextWindow: 32_000, capabilities: ['text'] },
    { id: 'doubao-lite-32k', label: 'Doubao Lite 32k', contextWindow: 32_000, capabilities: ['text'] },
    {
      id: 'doubao-vision-pro-32k',
      label: 'Doubao Vision Pro 32k',
      contextWindow: 32_000,
      capabilities: ['text', 'vision'],
      description: '豆包视觉理解模型',
    },
  ],
};

export const ZHIPU_PRESET: ProviderPreset = {
  id: 'zhipu',
  displayName: '智谱 GLM',
  protocol: 'openai-compatible',
  defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4',
  description: '智谱 AI GLM 系列',
  docsUrl: 'https://open.bigmodel.cn/dev/api',
  builtinModels: [
    { id: 'glm-4-plus', label: 'GLM-4 Plus', capabilities: ['text'] },
    { id: 'glm-4-air', label: 'GLM-4 Air', capabilities: ['text'] },
    {
      id: 'glm-4v-plus',
      label: 'GLM-4V Plus',
      capabilities: ['text', 'vision'],
      description: '智谱视觉理解模型',
    },
  ],
};

export const CHAT_PRESETS: ProviderPreset[] = [
  TOKENPLAN_PRESET,
  OPENAI_PRESET,
  ANTHROPIC_PRESET,
  GEMINI_PRESET,
  DEEPSEEK_PRESET,
  KIMI_PRESET,
  QWEN_PRESET,
  DOUBAO_PRESET,
  ZHIPU_PRESET,
];
