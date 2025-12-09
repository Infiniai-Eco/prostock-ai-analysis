import React from 'react';
import { AnalysisLevel, AnalystType, MarketType } from './types';
import { 
  Zap, 
  Activity, 
  Target, 
  Search, 
  Trophy, 
  TrendingUp, 
  BookOpen, 
  Newspaper, 
  MessageCircle, 
  BarChart2,
  Landmark
} from 'lucide-react';

export const DEFAULT_MODELS = {
  FAST: 'gemini-2.5-flash',
  DEEP: 'gemini-3-pro-preview',
};

export const MARKET_OPTIONS = [
  { value: MarketType.A_SHARE, label: '🇨🇳 A股市场' },
  { value: MarketType.HK_SHARE, label: '🇭🇰 港股市场' },
  { value: MarketType.US_SHARE, label: '🇺🇸 美股市场' },
];

export const ANALYSIS_LEVELS = [
  {
    id: AnalysisLevel.L1_QUICK,
    title: '1级 - 快速分析',
    desc: '基础数据概览，快速决策',
    time: '2-5秒',
    icon: <Zap className="w-6 h-6 text-yellow-500" />,
    color: 'border-yellow-200 bg-yellow-50'
  },
  {
    id: AnalysisLevel.L2_BASIC,
    title: '2级 - 基础分析',
    desc: '常规投资决策',
    time: '5-10秒',
    icon: <Activity className="w-6 h-6 text-red-400" />,
    color: 'border-red-200 bg-red-50'
  },
  {
    id: AnalysisLevel.L3_STANDARD,
    title: '3级 - 标准分析',
    desc: '技术+基本面，推荐',
    time: '10-20秒',
    icon: <Target className="w-6 h-6 text-brand-500" />,
    color: 'border-brand-200 bg-brand-50'
  },
  {
    id: AnalysisLevel.L4_DEEP,
    title: '4级 - 深度分析',
    desc: '多轮辩论，深度研究',
    time: '30-60秒',
    icon: <Search className="w-6 h-6 text-cyan-500" />,
    color: 'border-cyan-200 bg-cyan-50'
  },
  {
    id: AnalysisLevel.L5_COMPREHENSIVE,
    title: '5级 - 全面分析',
    desc: '最全面的分析报告',
    time: '1-2分钟',
    icon: <Trophy className="w-6 h-6 text-amber-600" />,
    color: 'border-amber-200 bg-amber-50'
  },
];

export const ANALYST_TEAMS = [
  {
    id: AnalystType.MARKET,
    title: '市场策略师',
    desc: '分析宏观环境、行业周期及市场Beta系数',
    icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
  },
  {
    id: AnalystType.FUNDAMENTAL,
    title: '基本面专家',
    desc: '深度挖掘财报、估值模型(DCF/PE)及护城河',
    icon: <BookOpen className="w-5 h-5 text-indigo-600" />,
  },
  {
    id: AnalystType.INSTITUTIONAL,
    title: '机构追踪者',
    desc: '追踪主力资金、北向资金、ETF动向及内部交易',
    icon: <Landmark className="w-5 h-5 text-purple-600" />,
  },
  {
    id: AnalystType.EVENT,
    title: '事件驱动分析',
    desc: '评估公告、并购重组、政策变化等催化剂',
    icon: <Newspaper className="w-5 h-5 text-emerald-600" />,
  },
  {
    id: AnalystType.TECHNICAL,
    title: '技术分析师',
    desc: '解读K线形态、量价关系及关键支撑阻力位',
    icon: <BarChart2 className="w-5 h-5 text-orange-600" />,
  },
  {
    id: AnalystType.SOCIAL,
    title: '舆情与心理',
    desc: '分析散户情绪、恐惧贪婪指数及社媒热度',
    icon: <MessageCircle className="w-5 h-5 text-pink-600" />,
  },
];