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
}

interface InsuranceFormProps {
  onSubmit: (data: FormData) => void;
  disabled: boolean;
  timestamp?: number;
  initialData?: FormData;
  productName: string;
}

export function InsuranceForm({ onSubmit, disabled, timestamp, initialData, productName }: InsuranceFormProps) {
  const [details, setDetails] = useState(initialData?.accident_detail || '');
  const [testMode, setTestMode] = useState<'random' | 'approve' | 'reject'>(initialData?.testMode || 'random');
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;
    setIsEditing(false);
    onSubmit({ product_name: productName, accident_detail: details, testMode });
  };

  const isFormDisabled = disabled && !isEditing;

  return (
    <div className={cn(
      "bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 md:p-12 w-full max-w-2xl mx-auto transition-all duration-500"
    )}>
      <h1 className="text-[28px] font-bold text-gray-900 mb-10 tracking-tight">
        보상 청구 내용을 입력하세요.
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 사고 경위 텍스트 입력 영역 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-500">
            사고 및 청구 내용
          </label>
          <textarea
            disabled={isFormDisabled}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="고객이 접수한 사고 경위 및 청구 사유를 상세히 입력해 주세요."
            className="w-full bg-white border border-gray-200 hover:border-gray-300 focus:border-[#3182F6] transition-all duration-200 rounded-xl px-5 py-4 text-gray-900 placeholder:text-gray-400 resize-none h-48 outline-none disabled:bg-transparent disabled:text-gray-700 disabled:border-none disabled:resize-none text-[15px] leading-relaxed disabled:cursor-not-allowed"
          />
        </div>

        {/* 테스트 모드 선택 및 제출 버튼 */}
        {!isFormDisabled ? (
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
                      className="w-4 h-4 text-[#3182F6] focus:ring-[#3182F6]"
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
              className="w-full bg-[#3182F6] hover:bg-blue-600 disabled:bg-[#B0B8C1] text-white font-semibold rounded-xl py-4 transition-colors text-lg mt-4 cursor-pointer disabled:cursor-not-allowed"
            >
              {isEditing ? '수정된 내용으로 다시 심사하기' : '약관 기반 AI 심사 시작'}
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400 font-medium">
              {timestamp ? new Date(timestamp).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''} 질문 등록됨
            </span>
            <button 
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#3182F6] transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-blue-50"
            >
              <Pencil className="w-4 h-4" />
              수정하기
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
