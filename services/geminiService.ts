import { GoogleGenAI } from "@google/genai";
import { AppState, AnalysisLevel, AnalystType, MarketType } from '../types';

const getModelForLevel = (level: AnalysisLevel, config: AppState['analysis']) => {
  if (level >= AnalysisLevel.L4_DEEP) {
    return config.deepModel;
  }
  return config.fastModel;
};

const getBeijingTime = () => {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
};

const buildSystemInstruction = (state: AppState): string => {
  return `You are a world-class financial investment advisory team. 
  Your goal is to provide a professional, data-driven, and objective analysis of a specific stock.
  
  Role Configuration:
  You act as a composite team comprising:
  ${state.analysis.selectedAnalysts.join(', ')}.
  
  Tone: Professional, Objective, Analytical, Cautious but Decisive.
  Language: Simplified Chinese (Main Content) & English (Executive Summary only).
  
  Format: Return the response in clean Markdown. Use headers, bullet points, and tables where appropriate.
  Do not include generic disclaimers at the start. Put a standard investment risk disclaimer at the very end (in Chinese).
  `;
};

const buildPrompt = (state: AppState): string => {
  const { stock, analysis } = state;
  const currentBeijingTime = getBeijingTime();

  const marketLabel = {
    [MarketType.A_SHARE]: 'A-Share (China)',
    [MarketType.HK_SHARE]: 'Hong Kong Stock Exchange',
    [MarketType.US_SHARE]: 'US Market',
  }[stock.marketType];

  let prompt = `Please conduct a ${AnalysisLevel[analysis.level]} analysis for:
  Stock Code/Symbol: ${stock.stockCode}
  Market: ${marketLabel}
  Analysis Date Reference: ${stock.date}
  Current Real-time Reference (Beijing Time): ${currentBeijingTime}

  CRITICAL TIMEZONE & DATA INSTRUCTIONS:
  1. **Timezone**: For A-Shares and HK Stocks, ALL time references MUST be in Beijing Time (UTC+8). Do not use US Eastern Time.
  2. **Search Strategy**: You MUST search using CHINESE keywords to find local data sources (simulating Baidu/Eastmoney data quality).
     - For A-Shares: Search for "${stock.stockCode} 最新股价", "${stock.stockCode} 实时资金流向", "${stock.stockCode} 今日研报".
     - For HK Shares: Search for "${stock.stockCode} 港股 实时行情".
  3. **Real-time Check**: Confirm the price is from the current trading session in Beijing (${currentBeijingTime}). If market is closed, use the latest close.

  Required Sections based on selected Analysts:
  `;

  if (analysis.selectedAnalysts.includes(AnalystType.MARKET)) {
    prompt += `- **Macro & Sector Strategy**: Market cycle stage, industry ranking, and beta sensitivity.\n`;
  }
  
  if (analysis.selectedAnalysts.includes(AnalystType.FUNDAMENTAL)) {
    prompt += `- **Fundamental Deep Dive**: Revenue growth quality, Profit margins trend, PE/PEG valuation relative to peers, and Competitive Moat.\n`;
  }
  
  if (analysis.selectedAnalysts.includes(AnalystType.INSTITUTIONAL)) {
    prompt += `- **Institutional & Smart Money Flow**: 
       * For US Stocks: Look for recent 13F filings summary, Insider buying/selling, and Major ETF flows.
       * For A-Shares/HK: Look for Northbound/Southbound capital trends (北向/南向资金), Institutional holdings changes. Search specifically for "主力资金流向" or "机构持仓".\n`;
  }

  if (analysis.selectedAnalysts.includes(AnalystType.TECHNICAL)) {
    prompt += `- **Technical Setup**: Key Moving Averages (20/50/200 day), RSI Divergence, MACD status, and volume analysis.\n`;
  }
  
  if (analysis.selectedAnalysts.includes(AnalystType.EVENT)) {
    prompt += `- **Catalysts & Events**: Upcoming earnings dates, recent regulatory impacts, or product launches.\n`;
  }
  
  if (analysis.selectedAnalysts.includes(AnalystType.SOCIAL)) {
    prompt += `- **Sentiment & Retail Psychology**:
       * For US Stocks: Summarize sentiment from Reddit (WSB/Investing) and Twitter/X finance discussions.
       * For A-Shares: Summarize sentiment from Eastmoney Guba (东方财富股吧) and Xueqiu (雪球).
       * **Divergence Check**: Explicitly contrast retail sentiment with fundamental reality.
       * Assess the "Fear & Greed" state of this specific stock.\n`;
  }

  if (analysis.includeSentiment) {
    prompt += `\nSpecial Section: Quantitative Sentiment Analysis (Bullish/Bearish Score 0-100)`;
  }
  if (analysis.includeRisk) {
    prompt += `\nSpecial Section: Comprehensive Risk Assessment (Regulatory, Market, Operational)`;
  }

  prompt += `
  
  IMPORTANT: 
  1. You MUST use the 'googleSearch' tool to find the LATEST real-time price, today's news, and recent financial reports.
  2. Do not hallucinate prices. If you cannot find the exact real-time price, state the last close price found and explicitly mention the time of data.
  3. Structure the final conclusion with a clear rating: **STRONG BUY**, **BUY**, **HOLD**, **SELL**, or **STRONG SELL**.

  REQUIRED OUTPUT STRUCTURE:
  1. The main body of the analysis MUST be in **Simplified Chinese**.
  2. Use Tables for Financial Data.
  3. AT THE END of the report (after the Chinese conclusion/disclaimer), you MUST provide a section titled "## English Executive Summary".
  4. The English Executive Summary should concisely recap the investment thesis, key risks, and target price/rating for international reference.
  `;

  return prompt;
};

export const generateStockAnalysisStream = async (
  state: AppState,
  onChunk: (text: string) => void
) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = getModelForLevel(state.analysis.level, state.analysis);
  
  // Use thinking config for deeper levels to simulate "multi-round debate"
  // Note: thinkingConfig is only supported on gemini-2.5 series.
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
        tools: [{ googleSearch: {} }], // CRITICAL: Enable Google Search for real-time stock data
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
    throw new Error(error.message || "Analysis failed to generate.");
  }
};