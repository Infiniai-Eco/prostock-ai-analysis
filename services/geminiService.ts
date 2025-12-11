
import { GoogleGenAI } from "@google/genai";
import { AppState, AnalysisLevel, AnalystType, MarketType } from '../types';
import { SCREENER_STYLES, SECTOR_OPTIONS } from '../constants';

const getModelForLevel = (level: AnalysisLevel, config: AppState['analysis']) => {
  if (level >= AnalysisLevel.L4_DEEP) {
    return config.deepModel;
  }
  return config.fastModel;
};

const getBeijingDateParts = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const beijing = new Date(utc + (3600000 * 8));
  return {
    year: beijing.getFullYear(),
    month: beijing.getMonth() + 1,
    day: beijing.getDate(),
    time: beijing.toLocaleTimeString('zh-CN', { hour12: false }),
    full: beijing.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
  };
};

const buildSystemInstruction = (state: AppState): string => {
  const dateInfo = getBeijingDateParts();
  
  return `你是一个世界级的金融投资顾问团队。
  
  🔴 **数据时效性严格协议 (Data Freshness Protocol) - 最高优先级**:
  1. **当前绝对时间**: 现在是 **${dateInfo.year}年${dateInfo.month}月${dateInfo.day}日**。
  2. **严禁旧数据**: 绝不允许将 2024 年或更早的数据描述为“当前”、“最新”或“实时”。
  3. **强制标注日期**: 在引用任何价格、PE、资金流向数据时，**必须**在括号内标注具体数据来源日期。
     - *正确示例*: "最新股价: 25.50 (来源: 2025-03-01)"
     - *错误示例*: "最新股价: 25.50" (未标注，可能引用了旧数据)
  4. **搜索策略**: 你必须优先搜索包含 "${dateInfo.year}" 和 "${dateInfo.month}月" 的资讯。
  
  **角色配置**:
  你由以下专家团队组成:
  ${state.analysis.selectedAnalysts.join(', ')}。
  
  **分析师互动机制**:
  1. **深度合成**: 识别不同分析师之间的冲突或共振。
  2. **辩论模式**: 风险专家必须挑战成长专家的观点。
  
  **排版与可读性规则**:
  1. **结构**: 以“🎯 核心结论仪表盘”开始。
  2. **标题**: 纯中文 H2 (##)。
  3. **列表**: 使用无序列表 (-)，禁止长文本。
  4. **表格**: 财务数据必须使用 Markdown 表格。
  
  **语言要求**: 正文全中文，仅 Summary 用英文。
  `;
};

const buildPrompt = (state: AppState): string => {
  const { stock, analysis } = state;
  const dateInfo = getBeijingDateParts();

  const marketLabel = {
    [MarketType.A_SHARE]: 'A股 (中国)',
    [MarketType.HK_SHARE]: '港股 (香港)',
    [MarketType.US_SHARE]: '美股 (美国)',
  }[stock.marketType];

  let prompt = `请为以下股票撰写一份 ${AnalysisLevel[analysis.level]} 深度分析报告：
  股票代码: ${stock.stockCode}
  市场类型: ${marketLabel}
  当前实时时间 (北京时间): ${dateInfo.full}

  🔴 **关键指令 (CRITICAL) - 必须严格遵守**:
  1. **强制使用 ${dateInfo.year} 最新数据**: 你必须通过 Google Search 获取 **${dateInfo.year}年${dateInfo.month}月** 的最新实时数据。
  2. **拒绝陈旧信息**: 如果搜索结果全是 2024 年的旧闻，你必须明确警告用户“缺乏 ${dateInfo.year} 年最新催化剂”，而不是用旧闻充数。
  3. **强制搜索关键词**:
     - "${stock.stockCode} 股价 ${dateInfo.year}年${dateInfo.month}月"
     - "${stock.stockCode} 最新研报 ${dateInfo.year}"
     - "${stock.stockCode} 资金流向 ${dateInfo.year}年${dateInfo.month}月"
     - "${stock.stockCode} ${dateInfo.year} Q1 业绩预告"

  **必须包含的输出结构**:

  # 🚀 ${stock.stockCode} 深度分析报告 (${dateInfo.year}特别版)

  ## 🎯 核心结论仪表盘
  - **数据基准日**: ${dateInfo.year}年${dateInfo.month}月${dateInfo.day}日
  - **最新价格**: [价格] (⚠️必填: 数据日期)
  - **综合评级**: [强力买入 / 买入 / 持有 / 减持 / 卖出]
  - **核心逻辑**: [一句话概括]
  - **主要风险**: [一句话概括]

  ---

  `;

  if (analysis.selectedAnalysts.includes(AnalystType.MARKET)) {
    prompt += `## 📈 宏观与行业策略
    - **周期阶段**: ${dateInfo.year}年行业处于什么位置？
    - **行业地位**: 最新市场份额变化。
    > **分析师点评**: [行业洞察]\n\n`;
  }
  
  if (analysis.selectedAnalysts.includes(AnalystType.FUNDAMENTAL)) {
    prompt += `## 📊 基本面透视
    - **${dateInfo.year} 业绩展望**: 营收/净利润最新预测。
    - **估值分析**: 基于 ${dateInfo.year} 预测 EPS 的动态 PE。
    
    | 核心指标 | 最新数值 | 同比增长 | 行业平均 |
    | :--- | :--- | :--- | :--- |
    | 营收 | | | |
    | 净利润 | | | |
    | 动态市盈率(PE) | | | |
    \n`;
  }
  
  if (analysis.selectedAnalysts.includes(AnalystType.INSTITUTIONAL)) {
    prompt += `## 🏦 机构与资金动向
       * **美股**: ${dateInfo.year} 最新 13F 持仓变化, 内部人交易。
       * **A股/港股**: **${dateInfo.month}月** 北向/南向资金流向, 最新龙虎榜。
       
    > **聪明钱 (Smart Money)**: 近期资金是在流入还是流出？\n`;
  }

  if (analysis.selectedAnalysts.includes(AnalystType.TECHNICAL)) {
    prompt += `## 🕯️ 技术面分析
    - **趋势判断**: 当前股价相对于 MA20/MA50/MA200 的位置。
    - **关键点位**: **本周** 的支撑位与阻力位。
    - **量价分析**: 近期成交量异动。\n`;
  }
  
  if (analysis.selectedAnalysts.includes(AnalystType.EVENT)) {
    prompt += `## 📰 事件驱动与催化剂 (${dateInfo.year}最新)
    - **近期**: ${dateInfo.month}月发生的关键事件。
    - **未来**: 接下来的财报日或产品发布会。\n`;
  }
  
  if (analysis.selectedAnalysts.includes(AnalystType.SOCIAL)) {
    prompt += `## 💬 舆情与市场情绪
       * 散户情绪 (贪婪/恐慌) - 基于最新发帖。
       * **预期差**: 市场当前的主流观点是什么？
       * 数据源: 股吧/雪球/Reddit/X (限制在最近一周).\n`;
  }

  // Synthesis Section
  prompt += `## 🧩 综合博弈分析
  * **信号共振**: 技术面、基本面和资金面在 ${dateInfo.month}月 是否一致？
  * **信号背离**: 哪里存在矛盾？
  * **情景推演**:
    - *牛市剧本*: 股价上涨需要什么条件？
    - *熊市剧本*: 什么情况会破坏逻辑？
  \n`;

  // Trading Signals Section - Fully Chinese Instructions
  prompt += `## 🔀 交易信号与操作建议
  基于 ${dateInfo.year}年${dateInfo.month}月 的最新数据，给出操作建议：
  - **操作评级**: [买入 / 增持 / 持有 / 减仓 / 卖出]
  - **适合周期**: [短线 / 中线 / 长线]
  - **建议入场区**: [具体价格范围]
  - **目标价格**:
    * **保守目标**: [价格]
    * **激进目标**: [价格]
  - **止损位**: [价格] (逻辑失效点)
  \n`;

  if (analysis.includeSentiment) {
    prompt += `\n## 🌡️ 量化情绪评分 (0-100)\n`;
  }
  if (analysis.includeRisk) {
    prompt += `\n## ⚠️ 风险因素提示
    请列出 3-5 个 **${dateInfo.year}年特有** 的风险点。**必须**归类：
    *   **市场风险**
    *   **经营风险**
    *   **财务风险**
    *   **政策风险**
    
    格式示例:
    - **[风险类别]**: 具体描述...
    \n`;
  }

  prompt += `
  
  ---
  ## 📝 最终总结 (Final Verdict)
  用一句话给出清晰的投资结论。

  ## 🇺🇸 Executive Summary
  (Concise recap for international investors in English)
  `;

  return prompt;
};

// --- SCREENER LOGIC ---

const buildScreenerPrompt = (state: AppState): string => {
  const { screener, stock } = state; 
  const dateInfo = getBeijingDateParts();
  
  const marketLabel = {
    [MarketType.A_SHARE]: 'A股 (中国)',
    [MarketType.HK_SHARE]: '港股 (香港)',
    [MarketType.US_SHARE]: '美股 (美国)',
  }[stock.marketType];

  // Resolve human readable labels for prompt
  const sectorLabel = SECTOR_OPTIONS.find(s => s.value === screener.sector)?.label || screener.sector;
  const styleLabel = SCREENER_STYLES.find(s => s.value === screener.style)?.label || screener.style;
  const styleDesc = SCREENER_STYLES.find(s => s.value === screener.style)?.desc || "";

  return `
  角色: 你是一位资深的量化基金经理 (Quant Portfolio Manager)，拥有 **${dateInfo.year}年** 实时市场数据权限。
  任务: 根据用户设定的策略模型，在 **${dateInfo.year}年${dateInfo.month}月** 的最新市场环境中，筛选出 3-5 只最符合的股票。
  
  🔴 **最高指令 (CRITICAL)**:
  1. **全中文输出**。
  2. **严禁旧数据**: 必须基于 ${dateInfo.year}年${dateInfo.month}月 的实时行情和资金流向。
  
  📊 **筛选模型配置**:
  - **目标市场**: ${marketLabel}
  - **核心赛道**: ${sectorLabel}
  - **量化策略**: ${styleLabel}
  - **策略逻辑**: "${styleDesc}" (请严格遵循此逻辑进行筛选)
  
  🔎 **执行步骤**:
  1. **宏观扫描**: 确认 ${sectorLabel} 板块在 ${dateInfo.year}年${dateInfo.month}月 的行业景气度。
  2. **策略过滤 (Google Search)**: 
     - 搜索关键词示例: "${marketLabel} ${sectorLabel} 龙头股 ${dateInfo.year} 涨幅", "${marketLabel} ${screener.style} 选股 ${dateInfo.year} ${dateInfo.month}月".
     - 如果策略是“高股息”，重点搜索股息率和现金流。
     - 如果策略是“GARP”，重点搜索 PEG 和 业绩增速。
  3. **个股精选**: 选出 3-5 只最强的标的。
  
  **输出格式要求**:
  
  # 🎯 智能选股报告 (${dateInfo.year}量化版)
  
  ## 📋 模型参数
  - **市场**: ${marketLabel}
  - **赛道**: ${sectorLabel}
  - **策略**: ${styleLabel}
  
  ## 🏆 精选标的池 (数据截至: ${dateInfo.year}-${dateInfo.month})
  
  | 代码 | 名称 | 最新价 | 核心指标匹配度 |
  | :--- | :--- | :--- | :--- |
  | [代码] | [名称] | [价格] | [例如: PEG=0.8, 业绩增30%] |
  | ... | ... | ... | ... |
  
  ## 💡 深度逻辑点评
  
  ### 1. [股票名称] ([代码])
  - **入选理由**: 为什么它完美符合 "${styleLabel}"？
  - **量化指标**: (列出符合策略的关键数据，如PE, ROE, 股息率等)
  - **${dateInfo.year}核心催化剂**: 本月有什么资金或事件驱动？
  - **主要风险**: 潜在的破坏逻辑的因素。
  
  ### 2. ...
  
  ---
  
  ## 📝 组合操作建议
  给出针对该股票组合的仓位配置建议 (例如: 等权重配置 或 龙头重仓)。
  `;
};

export const generateStockScreenerStream = async (
  state: AppState,
  onChunk: (text: string) => void
) => {
  const effectiveKey = state.apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("Missing API Key.");

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const dateInfo = getBeijingDateParts();
  
  // Screener requires a smart model with good search capabilities
  const modelName = 'gemini-3-pro-preview'; 
  
  const systemInstruction = `你是一位专业的基金经理。你必须利用 Google Search 查找 ${dateInfo.year}年${dateInfo.month}月 的最新市场数据。严禁使用 2024 年的旧数据作为当前依据。请全程使用中文回答。`;
  const userPrompt = buildScreenerPrompt(state);

  try {
    const streamResult = await ai.models.generateContentStream({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }], // Search is mandatory for screening
      }
    });

    for await (const chunk of streamResult) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error: any) {
    console.error("Gemini Screener API Error:", error);
     if (error.message?.includes('401') || error.message?.includes('API key')) {
      throw new Error("API Key 无效或已过期，请检查侧边栏设置。");
    }
    throw new Error(error.message || "Screening failed.");
  }
};

export const generateStockAnalysisStream = async (
  state: AppState,
  onChunk: (text: string) => void
) => {
  // Priority: User Input > Process.env
  const effectiveKey = state.apiKey || process.env.API_KEY;

  if (!effectiveKey) {
    throw new Error("Missing API Key. Please enter your Gemini API Key in the settings sidebar.");
  }

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const modelName = getModelForLevel(state.analysis.level, state.analysis);
  
  const isDeep = state.analysis.level >= AnalysisLevel.L4_DEEP;
  const supportsThinking = modelName.includes('2.5'); 
  
  const systemInstruction = buildSystemInstruction(state);
  const userPrompt = buildPrompt(state);

  try {
    const streamResult = await ai.models.generateContentStream({
      model: modelName,
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        thinkingConfig: (isDeep && supportsThinking) ? { thinkingBudget: 4096 } : undefined,
      }
    });

    for await (const chunk of streamResult) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('401') || error.message?.includes('API key')) {
      throw new Error("API Key 无效或已过期，请检查侧边栏设置。");
    }
    throw new Error(error.message || "Analysis failed to generate.");
  }
};
