
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

// New: App Operation Mode
export enum AppMode {
  ANALYSIS = 'ANALYSIS', // Standard Stock Analysis
  SCREENER = 'SCREENER', // Reverse Stock Selection
}

export interface StockConfig {
  stockCode: string;
  marketType: MarketType;
  date: string;
}

export interface ScreenerConfig {
  sector: string; // e.g., "AI", "EV", "Consumer"
  style: string;  // e.g., "Undervalued", "Growth", "Dividend"
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
  mode: AppMode; // Added mode
  stock: StockConfig;
  screener: ScreenerConfig; // Added screener config
  analysis: AnalysisConfig;
  isAnalyzing: boolean;
  isAutoRefresh: boolean; // Added auto-refresh state
  result: string;
  error: string | null;
  apiKey: string;
}