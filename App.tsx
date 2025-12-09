import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  FileText, 
  CheckCircle, 
  Info, 
  Calendar, 
  ChevronDown, 
  PieChart, 
  Play,
  AlertTriangle,
  Target
} from 'lucide-react';

import { AppState, MarketType, AnalysisLevel, AnalystType, AnalysisConfig } from './types';
import { DEFAULT_MODELS, MARKET_OPTIONS, ANALYSIS_LEVELS, ANALYST_TEAMS } from './constants';
import { Sidebar } from './components/Sidebar';
import { generateStockAnalysisStream } from './services/geminiService';

const getBeijingDateISO = () => {
  const d = new Date();
  // China is UTC+8. We manually adjust to ensure the default date picker shows the Beijing date, 
  // not the local browser date which might be "yesterday" if in the US.
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const beijing = new Date(utc + (3600000 * 8));
  return beijing.toISOString().split('T')[0];
};

const initialState: AppState = {
  stock: {
    stockCode: '600508',
    marketType: MarketType.A_SHARE,
    date: getBeijingDateISO(),
  },
  analysis: {
    level: AnalysisLevel.L3_STANDARD,
    selectedAnalysts: [AnalystType.MARKET, AnalystType.FUNDAMENTAL, AnalystType.INSTITUTIONAL, AnalystType.EVENT],
    includeSentiment: true,
    includeRisk: true,
    fastModel: DEFAULT_MODELS.FAST,
    deepModel: DEFAULT_MODELS.DEEP,
  },
  isAnalyzing: false,
  result: '',
  error: null,
};

function App() {
  const [state, setState] = useState<AppState>(initialState);
  const resultEndRef = useRef<HTMLDivElement>(null);
  
  // Auto scroll to bottom of result
  useEffect(() => {
    if (state.isAnalyzing && resultEndRef.current) {
      resultEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.result, state.isAnalyzing]);

  const handleStockChange = (key: keyof typeof initialState.stock, value: any) => {
    setState(prev => ({
      ...prev,
      stock: { ...prev.stock, [key]: value }
    }));
  };

  const handleAnalysisConfigChange = (newConfig: AnalysisConfig) => {
    setState(prev => ({ ...prev, analysis: newConfig }));
  };

  const toggleAnalyst = (id: AnalystType) => {
    const isSelected = state.analysis.selectedAnalysts.includes(id);
    
    let newSelection;
    if (isSelected) {
      // Don't allow deselecting everything, keep at least one
      if (state.analysis.selectedAnalysts.length <= 1) return;
      newSelection = state.analysis.selectedAnalysts.filter(a => a !== id);
    } else {
      newSelection = [...state.analysis.selectedAnalysts, id];
      
      // Auto-select FUNDAMENTAL when SOCIAL is selected
      // Social sentiment analysis is often most valuable when contrasted with fundamental reality
      if (id === AnalystType.SOCIAL && !newSelection.includes(AnalystType.FUNDAMENTAL)) {
        newSelection.push(AnalystType.FUNDAMENTAL);
      }
    }
    
    setState(prev => ({
      ...prev,
      analysis: { ...prev.analysis, selectedAnalysts: newSelection }
    }));
  };

  const handleStartAnalysis = async () => {
    if (!state.stock.stockCode) {
      alert("请输入股票代码");
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      result: '', 
      error: null 
    }));

    try {
      await generateStockAnalysisStream(state, (chunk) => {
        setState(prev => ({ ...prev, result: prev.result + chunk }));
      });
    } catch (err: any) {
        if (err.message && err.message.includes("API Key")) {
             setState(prev => ({ 
                ...prev, 
                error: "配置错误: 未检测到 API Key。请确保环境变量设置正确。" 
            }));
        } else {
             setState(prev => ({ ...prev, error: err.message || "分析过程中发生错误，请稍后重试。" }));
        }
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  return (
    <div className="min-h-screen font-sans text-gray-800 pb-20">
      
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">ProStock AI 投资参谋</h1>
            <p className="text-xs text-gray-500">多维度智能投研平台 | 机构级视角</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Main Content */}
          <div className="flex-1 space-y-8">
            
            {/* 1. Stock Info Section */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
              <div className="flex items-center gap-2 mb-6 text-brand-700 font-medium border-b border-gray-50 pb-3">
                <PieChart className="w-5 h-5" />
                <h2>股票信息</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     <span className="text-red-500 mr-1">*</span>股票代码
                   </label>
                   <div className="relative">
                     <input 
                        type="text" 
                        value={state.stock.stockCode}
                        onChange={(e) => handleStockChange('stockCode', e.target.value)}
                        placeholder="例: 600508 或 TSLA"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all uppercase"
                     />
                     <div className="absolute left-3 top-3.5 text-gray-400">
                        <CheckCircle className="w-5 h-5" />
                     </div>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">市场类型</label>
                   <div className="relative">
                     <select 
                        value={state.stock.marketType}
                        onChange={(e) => handleStockChange('marketType', e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer"
                     >
                       {MARKET_OPTIONS.map(opt => (
                         <option key={opt.value} value={opt.value}>{opt.label}</option>
                       ))}
                     </select>
                     <div className="absolute left-3 top-3.5 text-gray-400">
                        <span className={`w-4 h-4 rounded-sm block ${state.stock.marketType === MarketType.A_SHARE ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                     </div>
                     <ChevronDown className="absolute right-3 top-3.5 text-gray-400 w-5 h-5 pointer-events-none" />
                   </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">分析日期</label>
                   <div className="relative">
                     <input 
                        type="date"
                        value={state.stock.date}
                        onChange={(e) => handleStockChange('date', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-gray-600"
                     />
                     <Calendar className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                   </div>
                </div>
              </div>
            </section>

            {/* 2. Analysis Depth Section */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
               <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
               <div className="flex items-center gap-2 mb-6 text-red-700 font-medium border-b border-gray-50 pb-3">
                <Target className="w-5 h-5" />
                <h2>分析深度</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ANALYSIS_LEVELS.map(level => {
                  const isSelected = state.analysis.level === level.id;
                  return (
                    <div 
                      key={level.id}
                      onClick={() => setState(prev => ({ ...prev, analysis: { ...prev.analysis, level: level.id } }))}
                      className={`
                        cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4
                        ${isSelected ? `${level.color} border-current shadow-sm transform scale-[1.02]` : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 bg-white'}
                      `}
                    >
                      <div className={`p-2 rounded-lg bg-white shadow-sm ${isSelected ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                        {level.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                           <h3 className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{level.title}</h3>
                           {isSelected && <CheckCircle className="w-5 h-5 text-brand-600" />}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{level.desc}</p>
                        <span className="inline-block text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          预计耗时: {level.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Analyst Team Section */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
               <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
               <div className="flex items-center gap-2 mb-6 text-blue-700 font-medium border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2">
                   <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-blue-200 border-2 border-white flex items-center justify-center text-xs">A</div>
                      <div className="w-6 h-6 rounded-full bg-indigo-200 border-2 border-white flex items-center justify-center text-xs">B</div>
                      <div className="w-6 h-6 rounded-full bg-purple-200 border-2 border-white flex items-center justify-center text-xs">C</div>
                   </div>
                   <h2>配置您的分析团队</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ANALYST_TEAMS.map(analyst => {
                  const isSelected = state.analysis.selectedAnalysts.includes(analyst.id);
                  
                  return (
                    <div 
                      key={analyst.id}
                      onClick={() => toggleAnalyst(analyst.id)}
                      className={`
                        relative p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 cursor-pointer
                        ${isSelected 
                              ? 'bg-blue-50 border-blue-200 shadow-sm' 
                              : 'bg-white border-gray-100 hover:border-blue-100'
                        }
                      `}
                    >
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'bg-white shadow-sm text-brand-600' : 'bg-gray-100 text-gray-400'}
                      `}>
                        {analyst.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                           <h3 className={`font-medium text-sm ${isSelected ? 'text-brand-900' : 'text-gray-700'}`}>
                              {analyst.title}
                           </h3>
                           {analyst.id === AnalystType.INSTITUTIONAL && (
                             <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">NEW</span>
                           )}
                           {analyst.id === AnalystType.SOCIAL && isSelected && !state.analysis.selectedAnalysts.includes(AnalystType.FUNDAMENTAL) && (
                              <span className="text-[10px] text-brand-600 animate-pulse">+Fund</span>
                           )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{analyst.desc}</p>
                      </div>

                      <div className="flex-shrink-0">
                        {isSelected && <CheckCircle className="w-5 h-5 text-brand-600" />}
                        {!isSelected && <div className="w-5 h-5 rounded-full border-2 border-gray-200"></div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Warning/Footer for section */}
              <div className="mt-6 bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex items-center gap-2">
                 <Info className="w-4 h-4 text-gray-400" />
                 <span>选中的分析师将组成联合专家组，通过交叉验证提供更客观的投资建议。</span>
              </div>
            </section>

            {/* Action Button */}
            <div className="sticky bottom-6 z-20">
               <button
                 onClick={handleStartAnalysis}
                 disabled={state.isAnalyzing}
                 className={`
                    w-full py-4 px-6 rounded-xl shadow-xl shadow-brand-500/20 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.99]
                    ${state.isAnalyzing ? 'bg-brand-400 cursor-wait' : 'bg-brand-600 hover:bg-brand-700'}
                 `}
               >
                 {state.isAnalyzing ? (
                   <>
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     <span>分析生成中...</span>
                   </>
                 ) : (
                   <>
                     <Play className="w-5 h-5 fill-current" />
                     <span>开始智能分析</span>
                   </>
                 )}
               </button>
            </div>

            {/* ERROR DISPLAY */}
            {state.error && (
               <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3 animate-fade-in">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p>{state.error}</p>
               </div>
            )}

            {/* RESULT DISPLAY */}
            {(state.result || state.isAnalyzing) && (
              <section className="bg-white rounded-xl shadow-lg border border-brand-100 p-8 min-h-[400px] animate-fade-in-up">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                   <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${state.isAnalyzing ? 'bg-green-500 animate-pulse' : 'bg-brand-600'}`}></div>
                      <h2 className="text-xl font-bold text-gray-800">分析报告</h2>
                   </div>
                   {state.isAnalyzing && <span className="text-xs text-gray-400 font-mono">AI THINKING...</span>}
                </div>
                
                <div className="prose prose-blue prose-lg max-w-none text-gray-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {state.result}
                  </ReactMarkdown>
                  
                  {state.isAnalyzing && (
                    <div className="flex items-center gap-1 mt-4 text-gray-400">
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </div>
                  )}
                  <div ref={resultEndRef} />
                </div>
              </section>
            )}

          </div>

          {/* Right Sidebar */}
          <Sidebar 
            config={state.analysis} 
            onChange={handleAnalysisConfigChange}
          />

        </div>
      </main>
    </div>
  );
}

export default App;