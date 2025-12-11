
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
  Target,
  ArrowRight,
  Download,
  Share2,
  Filter,
  Search,
  Layers,
  RefreshCw,
  Timer
} from 'lucide-react';

import { AppState, MarketType, AnalysisLevel, AnalystType, AnalysisConfig, AppMode } from './types';
import { DEFAULT_MODELS, MARKET_OPTIONS, ANALYSIS_LEVELS, ANALYST_TEAMS, SCREENER_STYLES, SECTOR_OPTIONS } from './constants';
import { Sidebar } from './components/Sidebar';
import { generateStockAnalysisStream, generateStockScreenerStream } from './services/geminiService';

const getBeijingDateISO = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const beijing = new Date(utc + (3600000 * 8));
  return beijing.toISOString().split('T')[0];
};

const initialState: AppState = {
  mode: AppMode.ANALYSIS, // Default to standard analysis
  stock: {
    stockCode: '600508',
    marketType: MarketType.A_SHARE,
    date: getBeijingDateISO(),
  },
  screener: {
    sector: SECTOR_OPTIONS[1].value, // Default to AI/Computing
    style: SCREENER_STYLES[0].value,
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
  isAutoRefresh: false,
  result: '',
  error: null,
  apiKey: '', // Initialize empty, will load from localStorage
};

// Custom Markdown Components for better readability and PDF Export compatibility
const MarkdownComponents = {
  h1: ({node, ...props}: any) => (
    <h1 className="text-3xl font-extrabold text-gray-900 mt-8 mb-6 pb-3 border-b-2 border-brand-500 flex items-center gap-3 tracking-tight break-after-avoid" style={{pageBreakAfter: 'avoid'}} {...props} />
  ),
  h2: ({node, ...props}: any) => (
    <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4 flex items-center gap-2 pl-3 border-l-4 border-brand-500 bg-gray-50/80 p-2 rounded-r-lg break-after-avoid" style={{pageBreakAfter: 'avoid'}} {...props} />
  ),
  h3: ({node, ...props}: any) => (
    <h3 className="text-lg font-semibold text-brand-700 mt-6 mb-2 flex items-center gap-2 break-after-avoid" style={{pageBreakAfter: 'avoid'}} {...props} />
  ),
  p: ({node, ...props}: any) => (
    <p className="mb-4 leading-7 text-gray-700 text-justify" {...props} />
  ),
  ul: ({node, ...props}: any) => (
    <ul className="space-y-2 mb-4 text-gray-700" {...props} />
  ),
  li: ({node, ...props}: any) => (
    <li className="flex items-start gap-2.5">
      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
      <span className="leading-relaxed">{props.children}</span>
    </li>
  ),
  table: ({node, ...props}: any) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-gray-200 shadow-sm bg-white print:border-gray-300 print:shadow-none break-inside-avoid" style={{pageBreakInside: 'avoid'}}>
      <table className="min-w-full divide-y divide-gray-200" {...props} />
    </div>
  ),
  thead: ({node, ...props}: any) => (
    <thead className="bg-gray-50 text-gray-700" {...props} />
  ),
  th: ({node, ...props}: any) => (
    <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap" {...props} />
  ),
  td: ({node, ...props}: any) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-t border-gray-100 tabular-nums font-medium" {...props} />
  ),
  blockquote: ({node, ...props}: any) => (
    <div className="relative my-6 pl-5 pr-5 py-4 bg-brand-50/50 border-l-4 border-brand-500 rounded-r-lg text-brand-900 shadow-sm print:bg-gray-50 print:shadow-none break-inside-avoid" style={{pageBreakInside: 'avoid'}}>
      <div className="absolute top-3 left-1 opacity-30 text-brand-600">
         <Info size={14} />
      </div>
      <blockquote className="italic font-medium text-sm leading-relaxed" {...props} />
    </div>
  ),
  strong: ({node, ...props}: any) => (
    <strong className="font-bold text-gray-900 bg-yellow-100/80 px-1 rounded mx-0.5 box-decoration-clone print:bg-transparent print:border-b print:border-gray-400" {...props} />
  ),
  a: ({node, ...props}: any) => (
    <a className="text-brand-600 hover:text-brand-800 underline underline-offset-2 transition-colors print:no-underline print:text-gray-900" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  hr: ({node, ...props}: any) => (
    <hr className="my-8 border-gray-200 border-dashed print:border-gray-300" {...props} />
  ),
};

function App() {
  const [state, setState] = useState<AppState>(initialState);
  const resultEndRef = useRef<HTMLDivElement>(null);
  
  // Load API Key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('prostock_api_key');
    if (savedKey) {
      setState(prev => ({ ...prev, apiKey: savedKey }));
    }
  }, []);

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

  const handleScreenerChange = (key: keyof typeof initialState.screener, value: any) => {
    setState(prev => ({
      ...prev,
      screener: { ...prev.screener, [key]: value }
    }));
  };

  const handleAnalysisConfigChange = (newConfig: AnalysisConfig) => {
    setState(prev => ({ ...prev, analysis: newConfig }));
  };
  
  const handleApiKeyChange = (newKey: string) => {
    setState(prev => ({ ...prev, apiKey: newKey }));
    localStorage.setItem('prostock_api_key', newKey);
  };

  const toggleAnalyst = (id: AnalystType) => {
    const isSelected = state.analysis.selectedAnalysts.includes(id);
    
    let newSelection;
    if (isSelected) {
      if (state.analysis.selectedAnalysts.length <= 1) return;
      newSelection = state.analysis.selectedAnalysts.filter(a => a !== id);
    } else {
      newSelection = [...state.analysis.selectedAnalysts, id];
      if (id === AnalystType.SOCIAL && !newSelection.includes(AnalystType.FUNDAMENTAL)) {
        newSelection.push(AnalystType.FUNDAMENTAL);
      }
    }
    
    setState(prev => ({
      ...prev,
      analysis: { ...prev.analysis, selectedAnalysts: newSelection }
    }));
  };

  const handleExportPDF = async () => {
    const originalElement = document.getElementById('analysis-report');
    if (!originalElement) return;

    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') {
      alert('PDF 生成组件加载中，请稍后再试。');
      return;
    }

    // A4 width in pixels (96 DPI) is approx 794px.
    const A4_WIDTH_PX = 794;

    // 1. 创建容器：使用 Fixed 定位，强制左上角对齐，避免偏移
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = `${A4_WIDTH_PX}px`;
    container.style.zIndex = '-9999';
    container.style.backgroundColor = '#ffffff';
    container.style.margin = '0';
    container.style.boxSizing = 'border-box';
    
    // 2. 克隆内容
    const element = originalElement.cloneNode(true) as HTMLElement;
    
    // 3. 样式清洗与优化
    element.classList.remove('shadow-lg', 'rounded-2xl', 'border', 'shadow-sm', 'min-h-[400px]');
    
    // 强制样式重置
    element.style.width = '100%';
    element.style.height = 'auto';
    element.style.margin = '0';
    element.style.padding = '30px 40px'; // 适当的内边距模拟页边距
    element.style.boxSizing = 'border-box';
    element.style.overflow = 'visible';

    // 🔴 修复黄色蒙版问题：移除 clone 节点中所有 strong 标签的背景色
    const strongTags = element.querySelectorAll('strong');
    strongTags.forEach((el: HTMLElement) => {
        // 移除 Tailwind 的背景色类影响，强制透明
        el.style.backgroundColor = 'transparent'; 
        el.style.boxShadow = 'none';
        el.style.color = '#000000'; // 强制纯黑文字
        el.style.fontWeight = '800'; 
        el.style.padding = '0';
        el.style.margin = '0 2px';
        // 使用下划线代替背景色，避免 PDF 渲染遮挡
        el.style.textDecoration = 'underline'; 
        el.style.textDecorationColor = '#333';
        el.style.textUnderlineOffset = '3px';
        el.style.borderRadius = '0';
    });

    // 修复引用块样式
    const blockquotes = element.querySelectorAll('blockquote');
    blockquotes.forEach((bq: HTMLElement) => {
       bq.style.backgroundColor = '#f8fafc'; // 使用纯色背景代替透明度
       bq.style.borderLeft = '4px solid #2563eb';
    });

    // 修复表格宽度
    const tables = element.querySelectorAll('table');
    tables.forEach((t: any) => {
        t.style.width = '100%';
        t.style.tableLayout = 'auto';
        t.style.fontSize = '12px';
    });

    container.appendChild(element);
    document.body.appendChild(container);

    const filename = `ProStock_${state.mode === AppMode.ANALYSIS ? state.stock.stockCode : 'Screener'}_${state.stock.date}.pdf`;

    const opt = {
      margin: 0, // 已经在容器 padding 中处理
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        scrollY: 0,
        scrollX: 0,
        windowWidth: A4_WIDTH_PX,
        width: A4_WIDTH_PX,
        x: 0,
        y: 0
      },
      // 使用 px 单位并匹配宽度，确保所见即所得
      jsPDF: { unit: 'px', format: [A4_WIDTH_PX, 1123], orientation: 'portrait' }, 
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        await new Promise(resolve => setTimeout(resolve, 200));
        // @ts-ignore
        await window.html2pdf().set(opt).from(element).save();
    } catch (err: any) {
        console.error("PDF Export failed:", err);
        alert("导出 PDF 失败，请重试。");
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
  };

  const handleStartProcess = async () => {
    if (state.mode === AppMode.ANALYSIS && !state.stock.stockCode) {
      alert("请输入股票代码");
      return;
    }
    
    if (!state.apiKey && !process.env.API_KEY) {
      alert("请先在右侧侧边栏配置您的 Gemini API Key 才能开始使用。");
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      result: '', 
      error: null 
    }));

    try {
      if (state.mode === AppMode.ANALYSIS) {
        await generateStockAnalysisStream(state, (chunk) => {
            setState(prev => ({ ...prev, result: prev.result + chunk }));
        });
      } else {
        await generateStockScreenerStream(state, (chunk) => {
            setState(prev => ({ ...prev, result: prev.result + chunk }));
        });
      }
    } catch (err: any) {
        if (err.message && (err.message.includes("API Key") || err.message.includes("401"))) {
             setState(prev => ({ 
                ...prev, 
                error: "认证失败: API Key 无效或缺失。请在侧边栏检查您的 Key 设置。" 
            }));
        } else {
             setState(prev => ({ ...prev, error: err.message || "分析过程中发生错误，请稍后重试。" }));
        }
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  // Auto Refresh Logic
  // This ref ensures we can call the latest handleStartProcess inside the interval without staleness issues if dependencies were static,
  // although handleStartProcess depends on state, so we reconstruct the interval when state changes.
  // The logic: Start timer ONLY if auto-refresh is ON, NOT analyzing, and we HAVE a result (meaning a cycle just finished).
  useEffect(() => {
    let interval: any;
    if (state.isAutoRefresh && !state.isAnalyzing && state.result) {
      interval = setInterval(() => {
        handleStartProcess();
      }, 60000); // 60 seconds
    }
    return () => clearInterval(interval);
  }, [state.isAutoRefresh, state.isAnalyzing, state.result, state.mode, state.stock, state.screener, state.analysis, state.apiKey]);


  return (
    <div className="min-h-screen font-sans text-gray-800 pb-20 bg-gray-50/50">
      
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20 transform hover:rotate-6 transition-transform">
            <FileText className="w-5 h-5" />
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
            
            {/* INPUT SECTIONS (Hidden when printing/analyzing) */}
            <div className="space-y-8 print:hidden">

               {/* MODE TOGGLE TABS */}
               <div className="flex p-1 bg-gray-200 rounded-xl font-medium text-sm text-gray-500">
                  <button
                    onClick={() => setState(prev => ({ ...prev, mode: AppMode.ANALYSIS }))}
                    className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${state.mode === AppMode.ANALYSIS ? 'bg-white text-brand-700 shadow-sm' : 'hover:bg-gray-200/50 hover:text-gray-700'}`}
                  >
                    <Search className="w-4 h-4" />
                    个股深度分析
                  </button>
                  <button
                    onClick={() => setState(prev => ({ ...prev, mode: AppMode.SCREENER }))}
                    className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${state.mode === AppMode.SCREENER ? 'bg-white text-purple-700 shadow-sm' : 'hover:bg-gray-200/50 hover:text-gray-700'}`}
                  >
                    <Filter className="w-4 h-4" />
                    智能选股 (反向筛选)
                  </button>
               </div>

              {/* 1. Configuration Section (Conditional based on Mode) */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className={`absolute top-0 left-0 w-1 h-full ${state.mode === AppMode.ANALYSIS ? 'bg-brand-500' : 'bg-purple-500'}`}></div>
                
                {state.mode === AppMode.ANALYSIS ? (
                    // --- ANALYSIS MODE INPUTS ---
                    <>
                        <div className="flex items-center gap-2 mb-6 text-brand-700 font-medium border-b border-gray-50 pb-3">
                        <PieChart className="w-5 h-5" />
                        <h2>股票信息</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="text-red-500 mr-1">*</span>股票代码
                            </label>
                            <div className="relative group">
                            <input 
                                type="text" 
                                value={state.stock.stockCode}
                                onChange={(e) => handleStockChange('stockCode', e.target.value)}
                                placeholder="例: 600508 或 TSLA"
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all uppercase font-mono tracking-wide"
                            />
                            <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">市场类型</label>
                            <div className="relative group">
                            <select 
                                value={state.stock.marketType}
                                onChange={(e) => handleStockChange('marketType', e.target.value)}
                                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl appearance-none bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all cursor-pointer"
                            >
                                {MARKET_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <div className="absolute left-3 top-3.5 text-gray-400">
                                <span className={`w-4 h-4 rounded-sm block shadow-sm ${state.stock.marketType === MarketType.A_SHARE ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                            </div>
                            <ChevronDown className="absolute right-3 top-3.5 text-gray-400 w-5 h-5 pointer-events-none group-hover:text-gray-600" />
                            </div>
                        </div>
                        </div>
                    </>
                ) : (
                    // --- SCREENER MODE INPUTS ---
                    <>
                         <div className="flex items-center gap-2 mb-6 text-purple-700 font-medium border-b border-gray-50 pb-3">
                            <Layers className="w-5 h-5" />
                            <h2>选股策略配置</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <span className="text-purple-500 mr-1">*</span>关注赛道/板块
                                </label>
                                <div className="relative group">
                                <select 
                                    value={state.screener.sector}
                                    onChange={(e) => handleScreenerChange('sector', e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl appearance-none bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all cursor-pointer"
                                >
                                    {SECTOR_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                                    <Target className="w-5 h-5" />
                                </div>
                                <ChevronDown className="absolute right-3 top-3.5 text-gray-400 w-5 h-5 pointer-events-none group-hover:text-gray-600" />
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">量化/技术策略</label>
                                <div className="relative group">
                                <select 
                                    value={state.screener.style}
                                    onChange={(e) => handleScreenerChange('style', e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl appearance-none bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all cursor-pointer"
                                >
                                    {SCREENER_STYLES.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <div className="absolute left-3 top-3.5 text-gray-400">
                                    <Filter className="w-5 h-5" />
                                </div>
                                <ChevronDown className="absolute right-3 top-3.5 text-gray-400 w-5 h-5 pointer-events-none group-hover:text-gray-600" />
                                </div>
                            </div>

                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">目标市场</label>
                                <div className="relative group">
                                <select 
                                    value={state.stock.marketType}
                                    onChange={(e) => handleStockChange('marketType', e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl appearance-none bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all cursor-pointer"
                                >
                                    {MARKET_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <div className="absolute left-3 top-3.5 text-gray-400">
                                    <span className={`w-4 h-4 rounded-sm block shadow-sm ${state.stock.marketType === MarketType.A_SHARE ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                                </div>
                                <ChevronDown className="absolute right-3 top-3.5 text-gray-400 w-5 h-5 pointer-events-none group-hover:text-gray-600" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Strategy Description Hint */}
                        <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-start gap-2">
                             <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                             <p className="text-xs text-purple-800">
                                <span className="font-bold">策略说明: </span>
                                {SCREENER_STYLES.find(s => s.value === state.screener.style)?.desc}
                             </p>
                        </div>
                    </>
                )}
              </section>

              {/* 2. Analysis Depth Section (Only for Analysis Mode) */}
              {state.mode === AppMode.ANALYSIS && (
                  <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
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
                            <div className={`p-2.5 rounded-lg bg-white shadow-sm ${isSelected ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                            {level.icon}
                            </div>
                            <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{level.title}</h3>
                                {isSelected && <CheckCircle className="w-5 h-5 text-brand-600" />}
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{level.desc}</p>
                            <span className="inline-block text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                                {level.time}
                            </span>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                  </section>
              )}

              {/* 3. Analyst Team Section (Only for Analysis Mode) */}
              {state.mode === AppMode.ANALYSIS && (
                  <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="flex items-center gap-2 mb-6 text-blue-700 font-medium border-b border-gray-50 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] text-blue-700 font-bold">A</div>
                            <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] text-indigo-700 font-bold">B</div>
                            <div className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-[10px] text-purple-700 font-bold">C</div>
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
                            relative p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 cursor-pointer group
                            ${isSelected 
                                    ? 'bg-blue-50/60 border-blue-200 shadow-sm ring-1 ring-blue-100' 
                                    : 'bg-white border-gray-100 hover:border-blue-100 hover:shadow-sm'
                            }
                            `}
                        >
                            <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                            ${isSelected ? 'bg-white shadow-sm text-brand-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}
                            `}>
                            {analyst.icon}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className={`font-medium text-sm ${isSelected ? 'text-brand-900' : 'text-gray-700'}`}>
                                    {analyst.title}
                                </h3>
                                {analyst.id === AnalystType.INSTITUTIONAL && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-bold border border-purple-100">NEW</span>
                                )}
                                {analyst.id === AnalystType.SOCIAL && isSelected && !state.analysis.selectedAnalysts.includes(AnalystType.FUNDAMENTAL) && (
                                    <span className="text-[10px] text-brand-600 animate-pulse">+Fund</span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{analyst.desc}</p>
                            </div>

                            <div className="flex-shrink-0">
                            {isSelected && <CheckCircle className="w-5 h-5 text-brand-600" />}
                            {!isSelected && <div className="w-5 h-5 rounded-full border-2 border-gray-100 group-hover:border-blue-200"></div>}
                            </div>
                        </div>
                        );
                    })}
                    </div>
                  </section>
              )}

              {/* Action Button & Auto Refresh */}
              <div className="sticky bottom-6 z-20 space-y-3">
                 
                 {/* Live Monitor Toggle */}
                 <div className="flex justify-end">
                    <button 
                        onClick={() => setState(prev => ({ ...prev, isAutoRefresh: !prev.isAutoRefresh }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm border
                            ${state.isAutoRefresh 
                                ? 'bg-green-100 text-green-700 border-green-200' 
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {state.isAutoRefresh ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Timer className="w-3 h-3" />}
                        {state.isAutoRefresh ? '实时盯盘中 (每60s自动刷新)' : '开启实时盯盘 (60s刷新)'}
                    </button>
                 </div>

                <button
                  onClick={() => handleStartProcess()}
                  disabled={state.isAnalyzing}
                  className={`
                      w-full py-4 px-6 rounded-2xl shadow-xl shadow-brand-500/20 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.99]
                      ${state.isAnalyzing 
                         ? 'bg-brand-400 cursor-wait' 
                         : state.mode === AppMode.ANALYSIS 
                            ? 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                      }
                  `}
                >
                  {state.isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{state.isAutoRefresh && state.result ? 'AI 正在自动刷新...' : 'AI 正在计算中...'}</span>
                    </>
                  ) : (
                    <>
                      {state.mode === AppMode.ANALYSIS ? <Play className="w-5 h-5 fill-current" /> : <Filter className="w-5 h-5" />}
                      <span>{state.mode === AppMode.ANALYSIS ? '开始智能分析' : '开始筛选潜力股'}</span>
                      <ArrowRight className="w-5 h-5 opacity-50" />
                    </>
                  )}
                </button>
              </div>
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
              <section className="bg-white rounded-2xl shadow-lg border border-brand-100 min-h-[400px] animate-fade-in-up flex flex-col">
                
                {/* Result Controls (Non-printing) */}
                <div className="flex items-center justify-between border-b border-gray-100 p-6 bg-gray-50/50 rounded-t-2xl print:hidden">
                   <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${state.isAnalyzing ? 'bg-green-500 animate-pulse' : 'bg-brand-600'}`}></div>
                      <h2 className="text-xl font-bold text-gray-800">AI 分析报告</h2>
                      {state.isAnalyzing && <span className="text-xs text-gray-400 font-mono flex items-center gap-1">THINKING <span className="animate-pulse">...</span></span>}
                   </div>
                   {!state.isAnalyzing && state.result && (
                     <button 
                       onClick={handleExportPDF}
                       className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:text-brand-600 hover:border-brand-200 transition-colors shadow-sm"
                     >
                       <Download className="w-4 h-4" />
                       导出 PDF 报告
                     </button>
                   )}
                </div>
                
                {/* 
                  Printable Report Container 
                */}
                <div id="analysis-report" className="flex-1 p-8 md:p-12 bg-white rounded-b-2xl">
                  
                  {/* PDF Header (Always rendered but styled for report) */}
                  <div className="mb-8 pb-6 border-b-2 border-brand-600 flex justify-between items-end">
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-brand-700">
                         <FileText className="w-6 h-6" />
                         <span className="text-lg font-bold tracking-tight">ProStock AI</span>
                      </div>
                      <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tight">Investment Research</h1>
                    </div>
                    <div className="text-right">
                       <div className="text-4xl font-black text-gray-900 tracking-tighter">
                           {state.mode === AppMode.ANALYSIS ? state.stock.stockCode.toUpperCase() : 'SCREENER'}
                       </div>
                       <div className="text-sm text-gray-500 mt-1 font-mono">{state.stock.date}</div>
                    </div>
                  </div>

                  {/* Markdown Content Area */}
                  <div className="max-w-none text-gray-700 leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={MarkdownComponents}
                    >
                      {state.result}
                    </ReactMarkdown>
                    
                    {state.isAnalyzing && (
                      <div className="flex items-center gap-1 mt-6 text-gray-400 justify-center py-4 opacity-50">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                      </div>
                    )}
                    <div ref={resultEndRef} />
                  </div>

                  {/* PDF Footer */}
                  {!state.isAnalyzing && (
                    <div className="mt-16 pt-6 border-t border-gray-200 text-center">
                      <p className="text-xs text-gray-400 mb-2">Generated by ProStock AI • Professional Investment Assistant</p>
                      <p className="text-[10px] text-gray-300 leading-tight max-w-2xl mx-auto text-justify">
                        免责声明：本报告由人工智能生成，仅供参考，不构成任何投资建议。股市有风险，投资需谨慎。
                        Disclaimer: This report is generated by AI for informational purposes only and does not constitute investment advice.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>

          {/* Right Sidebar (Hidden when printing) */}
          <div className="print:hidden">
            <Sidebar 
              config={state.analysis}
              apiKey={state.apiKey}
              onApiKeyChange={handleApiKeyChange}
              onChange={handleAnalysisConfigChange}
            />
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;
