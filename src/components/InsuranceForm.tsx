import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind 클래스 병합을 위한 간단한 cn 유틸리티
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FormData {
  product_name: string;
  accident_detail: string;
  testMode: 'random' | 'approve' | 'reject';
  is_followup?: boolean;
  dynamicAnswers?: Record<string, string | string[]>;
  askedFormConfig?: DynamicFormConfig | null;
}

import { DynamicFormConfig } from './AnalysisResult';
import { DynamicFormRenderer } from './DynamicFormRenderer';

interface InsuranceFormProps {
  onSubmit: (data: FormData) => void;
  disabled: boolean;
  timestamp?: number;
  initialData?: FormData;
  productName: string;
  askedForm?: DynamicFormConfig;
}

export function InsuranceForm({ onSubmit, disabled, timestamp, initialData, productName, askedForm }: InsuranceFormProps) {
  const [details, setDetails] = useState(initialData?.accident_detail || '');
  const [testMode, setTestMode] = useState<'random' | 'approve' | 'reject'>(initialData?.testMode || 'random');
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (e?: React.FormEvent, dynamicAnswers?: Record<string, string | string[]>) => {
    if (e) e.preventDefault();
    if (!details.trim()) {
      alert('사고 및 청구 내용을 입력해주세요.');
      return;
    }
    setIsEditing(false);

    onSubmit({ 
      product_name: productName, 
      accident_detail: details, 
      testMode,
      is_followup: !!dynamicAnswers || !!initialData?.dynamicAnswers,
      dynamicAnswers: dynamicAnswers || initialData?.dynamicAnswers,
      askedFormConfig: askedForm || initialData?.askedFormConfig
    });
  };

  const isFormDisabled = disabled && !isEditing;

  return (
    <div className={cn(
      "bg-white rounded-[20px] sm:rounded-[24px] shadow-sm border border-gray-100 p-5 sm:p-8 md:p-12 w-full max-w-2xl mx-auto transition-all duration-500"
    )}>
      <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight break-keep text-balance">
        보상 청구 내용을 입력하세요.
      </h1>

      {askedForm && !isFormDisabled && (
        <div className="mb-6 sm:mb-8 p-3.5 sm:p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-2.5 sm:gap-3">
          <div className="text-blue-500 font-bold mt-0.5 shrink-0">ℹ️</div>
          <p className="text-xs sm:text-sm font-medium text-blue-800 leading-relaxed break-keep">
            AI가 추가 정보가 필요하다고 판단했습니다. 아래 사고 경위를 수정하시거나, 추가된 질문 폼에 답변해 주세요.
          </p>
        </div>
      )}

      <form onSubmit={(e) => { if (!askedForm) handleSubmit(e); else e.preventDefault(); }} className="space-y-6 sm:space-y-8">
        {/* 사고 경위 텍스트 입력 영역 */}
        <div className="space-y-2 sm:space-y-3">
          <label className="block text-xs sm:text-sm font-medium text-gray-500">
            사고 및 청구 내용
          </label>
          {isFormDisabled ? (
            <div className="w-full bg-[#F8FAFC] border border-[#E8EDF5] rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-gray-800 text-sm sm:text-[15px] leading-relaxed break-keep font-medium whitespace-pre-wrap">
              {details}
            </div>
          ) : (
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="접수하고자 하는 사고 경위 및 청구 사유를 상세히 입력해 주세요. &#10;입력이 부족하거나 적합하지 않을 경우 정확하지 않은 결과가 나올 수 있음을 유의해주시기 바랍니다."
              className="w-full bg-white border border-gray-200 hover:border-gray-300 focus:border-[#0046FF] transition-all duration-200 rounded-xl px-4 py-3.5 sm:px-5 sm:py-4 text-gray-900 placeholder:text-gray-400 resize-none h-32 sm:h-44 outline-none text-sm sm:text-[15px] leading-relaxed break-keep"
            />
          )}
        </div>

        {initialData?.dynamicAnswers && isFormDisabled && (
          <div className="space-y-3 bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-100 mt-4 sm:mt-6">
            <h4 className="text-xs sm:text-[13px] font-bold text-gray-500 mb-2">제출된 추가 정보</h4>
            {Object.entries(initialData.dynamicAnswers).map(([k, v]) => {
              const field = initialData.askedFormConfig?.form_fields.find(f => f.field_id === k);
              return (
                <div key={k} className="text-sm sm:text-[15px] text-gray-800 break-keep leading-relaxed">
                  <span className="font-semibold block text-xs text-gray-400 mb-0.5">{field?.label || k}</span>
                  {String(v)}
                </div>
              );
            })}
          </div>
        )}

        {askedForm && !isFormDisabled && (
          <div className="mt-6 sm:mt-8 border-t border-gray-100 pt-6 sm:pt-8">
            <DynamicFormRenderer 
              config={askedForm} 
              onSubmit={(answers) => handleSubmit(undefined, answers)} 
            />
          </div>
        )}

        {/* 테스트 모드 선택 및 제출 버튼 */}
        {!isFormDisabled && !askedForm ? (
          <>
            <div className="hidden space-y-3 bg-gray-50 p-4 rounded-xl">
              <label className="block text-xs font-semibold text-gray-500">
                [테스트 옵션] 예상 결과 강제 지정
              </label>
              <div className="flex gap-4">
                {(['random', 'approve', 'reject'] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="testMode" 
                      value={mode}
                      checked={testMode === mode}
                      onChange={() => setTestMode(mode)}
                      className="w-4 h-4 text-[#0046FF] focus:ring-[#0046FF]"
                    />
                    <span className="text-sm text-gray-700">
                      {mode === 'random' ? '랜덤' : mode === 'approve' ? '지급' : '부지급'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!details}
              className="w-full bg-[#0046FF] hover:bg-[#0038CC] disabled:bg-[#B0B8C1] text-white font-semibold rounded-xl py-3.5 sm:py-4 transition-colors text-base sm:text-lg mt-3 sm:mt-4 cursor-pointer disabled:cursor-not-allowed break-keep shadow-xs"
            >
              {isEditing ? '수정된 내용으로 다시 심사하기' : '약관 기반 AI 심사 시작'}
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
            <span className="text-[11px] sm:text-xs text-gray-400 font-medium break-keep">
              {timestamp ? new Date(timestamp).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''} 질문 등록됨
            </span>
            <button 
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-[#0046FF] transition-colors cursor-pointer px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-blue-50 break-keep"
            >
              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              수정하기
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
