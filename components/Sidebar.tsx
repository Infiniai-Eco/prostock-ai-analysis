import React from 'react';
import { AnalysisConfig } from '../types';
import { Settings, Cpu } from 'lucide-react';

interface SidebarProps {
  config: AnalysisConfig;
  onChange: (newConfig: AnalysisConfig) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ config, onChange }) => {
  const updateConfig = (key: keyof AnalysisConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
      {/* Header Badge */}
      <div className="bg-brand-900 text-white rounded-t-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Settings className="w-5 h-5" />
          <span>高级配置</span>
        </div>
        <span className="text-xs bg-brand-700 px-2 py-1 rounded text-yellow-200 border border-yellow-500/30">
          可选设置
        </span>
      </div>

      <div className="bg-white rounded-b-xl shadow-sm border border-gray-100 p-5 space-y-8 -mt-4">
        
        {/* Model Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Cpu className="w-4 h-4" />
            <h3>AI 模型配置</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex justify-between">
                <span>快速分析模型</span>
                <span className="text-gray-300">i</span>
              </label>
              <select 
                value={config.fastModel}
                onChange={(e) => updateConfig('fastModel', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-gray-50 text-gray-700 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-flash-lite-latest">gemini-flash-lite-latest</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block flex justify-between">
                <span>深度决策模型</span>
                <span className="text-gray-300">i</span>
              </label>
              <select 
                 value={config.deepModel}
                 onChange={(e) => updateConfig('deepModel', e.target.value)}
                 className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-gray-50 text-gray-700 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              >
                <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
              </select>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
            <div className="flex gap-2">
              <span className="text-lg">💡</span>
              <p className="text-xs text-yellow-800 leading-relaxed">
                <span className="font-bold">模型推荐:</span> 标准分析使用快速模型用基础级，深度模型用标准级以上。
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Options */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Settings className="w-4 h-4" />
            <h3>分析选项</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm text-gray-700">情绪分析</div>
                <div className="text-xs text-gray-400">分析市场情绪和投资者心理</div>
              </div>
              <button 
                onClick={() => updateConfig('includeSentiment', !config.includeSentiment)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.includeSentiment ? 'bg-brand-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.includeSentiment ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm text-gray-700">风险评估</div>
                <div className="text-xs text-gray-400">包含详细的风险因素分析</div>
              </div>
              <button 
                onClick={() => updateConfig('includeRisk', !config.includeRisk)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.includeRisk ? 'bg-brand-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.includeRisk ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};