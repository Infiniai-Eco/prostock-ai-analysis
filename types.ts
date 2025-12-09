export enum MarketType {
  A_SHARE = 'A_SHARE',
  HK_SHARE = 'HK_SHARE',
  US_SHARE = 'US_SHARE',
}

export enum AnalysisLevel {
  L1_QUICK = 1,
  L2_BASIC = 2,
  L3_STANDARD = 3,
  L4_DEEP = 4,
  L5_COMPREHENSIVE = 5,
}

export enum AnalystType {
  MARKET = 'MARKET',
  FUNDAMENTAL = 'FUNDAMENTAL',
  EVENT = 'EVENT', // Renamed from NEWS for better clarity
  SOCIAL = 'SOCIAL',
  TECHNICAL = 'TECHNICAL',
  INSTITUTIONAL = 'INSTITUTIONAL' // New Analyst
}

export interface StockConfig {
  stockCode: string;
  marketType: MarketType;
  date: string;
}

export interface AnalysisConfig {
  level: AnalysisLevel;
  selectedAnalysts: AnalystType[];
  includeSentiment: boolean;
  includeRisk: boolean;
  fastModel: string;
  deepModel: string;
}

export interface AppState {
  stock: StockConfig;
  analysis: AnalysisConfig;
  isAnalyzing: boolean;
  result: string;
  error: string | null;
}