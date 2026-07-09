import React from 'react';
import { ShieldCheck, Activity, ChevronRight, Info } from 'lucide-react';

interface HomeProps {
  onSelectAgent: (agent: 'claims' | 'cancellation') => void;
}

export function Home({ onSelectAgent }: HomeProps) {
  const handleCancellationClick = () => {
    alert('해당 에이전트는 현재 준비 중입니다.');
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[80vh] px-4 md:px-8 py-10">
      
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
          어떤 작업을 진행하시겠습니까?
        </h1>
        <p className="text-gray-500 text-lg font-medium">
          이용하실 보상가이드 AI 에이전트를 선택해 주세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* 1번: 보상 심사 에이전트 */}
        <button
          onClick={() => onSelectAgent('claims')}
          className="group relative flex flex-col items-start p-8 md:p-10 bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300 text-left cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 border border-blue-100 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
            <ShieldCheck className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
            보상 심사 및 면·부책 판단<br/>에이전트
          </h2>
          <p className="text-sm font-semibold text-blue-500 tracking-wider uppercase mb-4">
            Claims Judgment Agent
          </p>
          <p className="text-gray-500 text-sm leading-relaxed font-light mb-8 flex-grow">
            고객의 사고 경위를 바탕으로 해당 약관을 분석하고, 보험금 지급 여부 및 상세 면·부책 근거를 자동으로 산출합니다.
          </p>
          
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mt-auto">
            시작하기 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 2번: 해약 리스크 안내 에이전트 */}
        <button
          onClick={handleCancellationClick}
          className="group relative flex flex-col items-start p-8 md:p-10 bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 hover:-translate-y-1 transition-all duration-300 text-left cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="w-16 h-16 bg-gray-50 text-gray-500 rounded-2xl flex items-center justify-center mb-8 border border-gray-100 shadow-inner group-hover:bg-gray-100 transition-colors duration-300">
            <Activity className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
            고객 맞춤형 해약 리스크 안내<br/>에이전트
          </h2>
          <p className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
            Personalized Cancellation Risk Notification Agent
          </p>
          <p className="text-gray-500 text-sm leading-relaxed font-light mb-8 flex-grow">
            고객의 계약 상태를 분석하여, 불필요한 해약 방지를 위한 선제적 안내 및 유지 상담 가이드를 제공합니다.
          </p>
          
          <div className="flex items-center gap-2 text-gray-400 font-bold text-sm mt-auto">
            준비 중입니다 <ChevronRight className="w-4 h-4" />
          </div>
        </button>

      </div>

      {/* 부드러운 디스클레이머 */}
      <div className="mt-20 w-full max-w-3xl px-6 py-5 bg-gray-50/50 rounded-2xl border border-gray-100/50 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
          <Info className="w-5 h-5" />
        </div>
        <p className="text-[13px] text-gray-500 font-light leading-relaxed break-keep">
          본 서비스가 제공하는 AI 분석 결과는 <strong className="font-semibold text-gray-700">업무 참고용</strong>으로만 활용되어야 합니다. AI는 완벽하지 않을 수 있으며, 최종 지급 결정 및 법적 책임은 심사 담당자 및 회사에 있습니다.
        </p>
      </div>

    </div>
  );
}
