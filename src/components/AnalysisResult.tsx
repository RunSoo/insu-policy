import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FormData } from './InsuranceForm';
import { smoothScrollToElement } from '../utils/scroll';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface AnalysisResultData {
  status: 'approve' | 'reject' | 'review';
  markdownText: string;
  // 하위 호환성을 위한 구 버전 필드들 (마이그레이션 용)
  reason?: string;
  basisText?: string;
  highlightKeywords?: string[];
}

interface AnalysisResultProps {
  requestData: FormData;
  initialResultData?: AnalysisResultData | null;
  initialCompletedAt?: number | null;
  onAnalysisComplete?: (result: AnalysisResultData, timestamp: number) => void;
  onNextQuestion?: () => void;
  flowItemId?: string;
}

export interface ParsedAnalysis {
  status: 'approve' | 'reject' | 'review';
  confidence: string;
  remainingMarkdown: string;
}

// 백엔드 마크다운 응답 파싱 엔진
export function parseMarkdownResponse(markdown: string): ParsedAnalysis {
  const result: ParsedAnalysis = {
    status: 'review',
    confidence: '100%',
    remainingMarkdown: markdown
  };

  if (!markdown) return result;

  // Extract status
  const statusRegex = /최종\s*결과\s*:\s*\*\*([^*]+)\*\*/;
  const statusMatch = markdown.match(statusRegex);
  if (statusMatch) {
    const val = statusMatch[1].trim();
    if (val.includes('지급거절') || val.includes('부지급') || val.includes('거절')) {
      result.status = 'reject';
    } else if (val.includes('지급') || val.includes('승인')) {
      result.status = 'approve';
    } else {
      result.status = 'review';
    }
  }

  // Extract confidence
  const confRegex = /확신\s*점수\s*:\s*\*\*([0-9%]+)\*\*/;
  const confMatch = markdown.match(confRegex);
  if (confMatch) {
    result.confidence = confMatch[1].trim();
  }

  // Filter out extracted banner lines from markdown body
  const lines = markdown.split('\n');
  const filteredLines = lines.filter(line => {
    return !(
      line.includes('최종 결과:') ||
      line.includes('확신 점수:') ||
      line.includes('# [최종 심사 의견서]')
    );
  });
  
  result.remainingMarkdown = filteredLines.join('\n').replace(/^[\s\n-]+/, ''); // remove leading dashes and blank lines

  return result;
}

// 텍스트 내 마크다운 포맷(볼드, 인라인코드) 렌더러 (제거됨 - react-markdown으로 대체)

const runAnalysisWorkflow = async (data: FormData): Promise<AnalysisResultData> => {
  const API_URL = import.meta.env.VITE_DIFY_API_URL || '/api/dify/v1';
  // VITE_DIFY_API_URL이 이미 /v1을 포함하고 있을 수 있으므로 처리
  const baseUrl = API_URL.endsWith('/v1') ? API_URL.slice(0, -3) : API_URL;
  const endpoint = `${baseUrl}/v1/workflows/run`;
  const API_KEY = import.meta.env.VITE_DIFY_WORKFLOW_API_KEY || '';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          product_name: data.product_name,
          accident_detail: data.accident_detail
        },
        response_mode: 'blocking',
        user: 'developer_01'
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const resultData = await response.json();
    
    // 워크플로우 실행 실패 처리 (예: 503 에러 등)
    if (resultData.data?.status === 'failed' || resultData.data?.error) {
      console.error('Workflow API Failed:', resultData.data?.error);
      return {
        status: 'review',
        markdownText: `## [최종 심사 의견서]
- 최종 결과: **검토필요**
- 확신 점수: **0%** (오류 발생)

**종합 의견:**
AI 심사 서버가 혼잡하거나 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. 
(상세 오류: ${resultData.data?.error.substring(0, 50)}...)`
      };
    }

    // 워크플로우 정상 응답 텍스트 추출 (output 변수 이름이 텍스트 관련일 것으로 예상)
    const outputs = resultData.data?.outputs || {};
    // outputs 객체의 첫 번째 문자열 값을 찾거나, text/result 키를 찾음
    const markdownText = outputs.text || outputs.result || Object.values(outputs).find(val => typeof val === 'string') || '';

    if (!markdownText) {
      throw new Error('No valid text output from workflow');
    }

    // 마크다운 파서를 통해 상태 추론
    const parsed = parseMarkdownResponse(markdownText as string);

    return {
      status: parsed.status,
      markdownText: markdownText as string
    };
  } catch (error: any) {
    console.error('Failed to run analysis workflow:', error);
    // 에러 발생 시 예외 처리 마크다운 반환
    return {
      status: 'review',
      markdownText: `## [최종 심사 의견서]
- 최종 결과: **검토필요**
- 확신 점수: **0%** (연결 실패)

**종합 의견:**
서버와 통신하는 중 문제가 발생했습니다. 네트워크 상태나 API 키 설정을 확인해 주세요.
(에러: ${error.message})`
    };
  }
};

export function AnalysisResult({ 
  requestData, 
  initialResultData, 
  initialCompletedAt, 
  onAnalysisComplete, 
  onNextQuestion,
  flowItemId
}: AnalysisResultProps) {
  const [result, setResult] = useState<AnalysisResultData | null>(initialResultData || null);
  const [completedAt, setCompletedAt] = useState<number | null>(initialCompletedAt || null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 구버전 로컬스토리지 데이터를 새 마크다운 스키마로 강제 마이그레이션
  useEffect(() => {
    if (result && !result.markdownText) {
      const fallbackMarkdown = `## [최종 심사 의견서]
- 최종 결과: **${result.status === 'approve' ? '지급' : result.status === 'reject' ? '지급거절' : '검토필요'}**
- 확신 점수: **90%** (이전 심사 리포트 형식에서 자동 복원됨)

**종합 의견:**
${result.reason || '이전 저장 내역에서 복원된 리포트입니다.'}

## [면책 조항 판단 매트릭스]
| 분석 구분 | 관련 약관 조항 | 판단 내용 | 보상 영향도 |
| :--- | :--- | :--- | :--- |
| **판단 근거** | 약관 조항 | ${result.basisText || '상세 약관 조항'} | 높음 |
`;
      setResult(prev => prev ? { ...prev, markdownText: fallbackMarkdown } : null);
    }
  }, [result]);

  useEffect(() => {
    if (!result) {
      setTimeout(() => {
        smoothScrollToElement(containerRef);
      }, 100);
    }
  }, [result]);

  useEffect(() => {
    if (initialResultData) return;

    // 새로운 요청(또는 수정 후 재요청)이 시작될 때 이전 상태를 지워 스켈레톤 화면이 나오게 함
    setResult(null);
    setCompletedAt(null);

    runAnalysisWorkflow(requestData).then((res) => {
      const time = Date.now();
      setResult(res);
      setCompletedAt(time);
      if (onAnalysisComplete) {
        onAnalysisComplete(res, time);
      }
    });
  }, [requestData, initialResultData]);

  /* 심사 의견서 직접 수정 기능 보류로 인한 핸들러 주석처리
  const handleEditClick = () => {
    if (!result) return;
    setEditStatus(result.status);
    setEditMarkdownText(result.markdownText);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!result) return;
    const newResult: AnalysisResultData = {
      status: editStatus,
      markdownText: editMarkdownText
    };
    setResult(newResult);
    setIsEditing(false);
    
    if (onAnalysisComplete && completedAt) {
      onAnalysisComplete(newResult, completedAt);
    }
  };
  */

  // 마크다운 파싱 결과 오브젝트
  const parsed = result && result.markdownText ? parseMarkdownResponse(result.markdownText) : null;

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto mt-8">
      <AnimatePresence mode="wait">
        {!result || !parsed ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-[20px] shadow-sm p-6 md:p-10 border border-[#E8EDF5]"
          >
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
              <div className="w-16 h-16 relative">
                <div className="w-full h-full border-4 border-[#F5F7FB] rounded-full"></div>
                <div className="w-full h-full border-4 border-blue-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
              </div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                className="text-lg font-bold text-gray-700 text-center"
              >
                AI가 약관을 바탕으로<br/>사고 내용을 정밀 분석하고 있어요...
              </motion.p>
            </div>
            
            <div className="space-y-4 mt-8 animate-pulse">
              <div className="h-6 bg-[#F5F7FB] rounded-lg w-1/4"></div>
              <div className="h-20 bg-[#F5F7FB] rounded-xl w-full"></div>
              <div className="h-12 bg-[#F5F7FB] rounded-xl w-full"></div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onAnimationStart={() => {
              // 결과 렌더링 시 맨 아래로 내려가지 않고, 컨테이너 상단에서부터 읽을 수 있도록 변경
              setTimeout(() => {
                smoothScrollToElement(containerRef);
              }, 50);
            }}
            className="bg-white rounded-[20px] shadow-sm p-6 md:p-10 space-y-10 border border-[#E8EDF5] overflow-hidden"
          >
            <>
                {/* 1. 상단 상태 배너 및 게이지 영역 */}
                <div className={cn(
                  "flex flex-col md:flex-row items-center md:justify-between p-6 md:p-8 rounded-xl gap-6 border transition-colors duration-500",
                  parsed.status === 'approve' && "bg-[#F0F4FF] border-[#D1DFF7] text-[#003DC4]",
                  parsed.status === 'reject' && "bg-[#FFF0F0] border-[#F7D1D1] text-[#D32F2F]",
                  parsed.status === 'review' && "bg-[#FFFBF5] border-[#F7EEDC] text-[#B26A00]"
                )}>
                  <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
                    {parsed.status === 'approve' ? (
                      <div className="w-12 h-12 bg-white/50 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    ) : parsed.status === 'reject' ? (
                      <div className="w-12 h-12 bg-white/50 text-red-600 rounded-full flex items-center justify-center shadow-inner">
                        <XCircle className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-white/50 text-amber-600 rounded-full flex items-center justify-center shadow-inner">
                        <AlertCircle className="w-6 h-6 animate-pulse" />
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <span className={cn(
                          "inline-flex px-2.5 py-0.5 rounded-lg text-xs font-extrabold tracking-tight shadow-sm border",
                          parsed.status === 'approve' && "bg-blue-600 text-white border-blue-700",
                          parsed.status === 'reject' && "bg-red-600 text-white border-red-700",
                          parsed.status === 'review' && "bg-amber-500 text-white border-amber-600"
                        )}>
                          {parsed.status === 'approve' ? '지급 가능' : parsed.status === 'reject' ? '지급 거절' : '검토 필요'}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-gray-900 leading-snug tracking-tight">
                        {parsed.status === 'approve' 
                          ? '보험금이 정상적으로 지급 처리됩니다.' 
                          : parsed.status === 'reject' 
                          ? '보험금 청구가 지급 보류(거절)되었습니다.' 
                          : '일부 필수 지급조건 검토가 요구됩니다.'}
                      </h2>
                    </div>
                  </div>

                  {/* SVG 확신 게이지 차트 */}
                  <div className="relative flex items-center justify-center flex-shrink-0 w-24 h-24 bg-white rounded-xl shadow-sm border border-[#E8EDF5]">
                    {(() => {
                      const strokeWidth = 5;
                      const radius = 34;
                      const circumference = 2 * Math.PI * radius;
                      const percentage = parseInt(parsed.confidence) || 0;
                      const strokeDashoffset = circumference - (percentage / 100) * circumference;

                      return (
                        <>
                          <svg className="w-20 h-20 transform -rotate-90">
                            <circle
                              className="text-[#F5F7FB]"
                              strokeWidth={strokeWidth}
                              stroke="currentColor"
                              fill="transparent"
                              r={radius}
                              cx="40"
                              cy="40"
                            />
                            <circle
                              className={cn(
                                parsed.status === 'approve' && 'text-blue-500',
                                parsed.status === 'reject' && 'text-red-500',
                                parsed.status === 'review' && 'text-amber-500'
                              )}
                              strokeWidth={strokeWidth}
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                              r={radius}
                              cx="40"
                              cy="40"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-[10px] text-gray-400 font-extrabold leading-none tracking-tight">확신 점수</span>
                            <span className="text-lg font-black text-gray-900 leading-tight mt-0.5">{parsed.confidence}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 2. 유연한 마크다운 렌더링 영역 (ReactMarkdown) */}
                <div className="mt-8 markdown-render-area">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({node, ...props}) => (
                        <div className="flex items-center justify-between border-b border-[#E8EDF5] pb-3 mt-10 mb-4">
                          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2" {...props}>
                            <span className="w-1 h-5 bg-blue-500 rounded-sm"></span>
                            {props.children}
                          </h2>
                        </div>
                      ),
                      h3: ({node, ...props}) => <h3 className="text-md font-bold text-gray-900 mt-6 mb-3" {...props} />,
                      h4: ({node, ...props}) => <h4 className="text-[15px] font-bold text-gray-800 mt-5 mb-2 flex items-center gap-2" {...props} />,
                      p: ({node, ...props}) => <p className="text-sm text-gray-700 leading-relaxed font-light break-keep mb-4" {...props} />,
                      ul: ({node, ...props}) => <ul className="space-y-2 mb-6" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-2 mb-6 text-sm text-gray-700 leading-relaxed font-light" {...props} />,
                      li: ({node, ...props}) => {
                        const isTask = props.className?.includes('task-list-item');
                        return (
                          <li className={cn(
                            "text-sm text-gray-700 leading-relaxed font-light group transition-colors",
                            isTask ? "flex items-start gap-2 list-none" : "list-disc ml-5 break-keep"
                          )} {...props} />
                        )
                      },
                      input: ({node, ...props}) => {
                        if (props.type === 'checkbox') {
                          return <input type="checkbox" className="mt-1 w-4 h-4 rounded text-blue-500 border-gray-300 focus:ring-blue-500" readOnly checked={props.checked} />
                        }
                        return <input {...props} />
                      },
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto -mx-6 md:-mx-10 border-y border-[#E8EDF5] bg-[#F5F7FB]/30 my-6">
                          <table className="w-full text-left border-collapse text-xs md:text-sm" {...props} />
                        </div>
                      ),
                      thead: ({node, ...props}) => <thead className="bg-[#F5F7FB] border-b border-[#E8EDF5]" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-4 font-bold text-gray-500 whitespace-nowrap" {...props} />,
                      tbody: ({node, ...props}) => <tbody className="divide-y divide-[#E8EDF5]" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-4 text-gray-700 align-top leading-relaxed break-keep font-light" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-extrabold text-gray-900" {...props} />,
                      hr: ({node, ...props}) => <hr className="border-t border-[#E8EDF5] my-10" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1 text-gray-600 bg-blue-50/50 rounded-r-lg my-4 text-sm" {...props} />
                    }}
                  >
                    {parsed.remainingMarkdown}
                  </ReactMarkdown>
                </div>

                {/* 하단 액션 버튼 */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      if (flowItemId) {
                        const el = document.getElementById(flowItemId);
                        if (el) {
                          const y = el.getBoundingClientRect().top + window.scrollY - 100;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                      }
                    }}
                    className="flex-1 py-4 px-6 rounded-xl font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-center text-sm shadow-sm cursor-pointer"
                  >
                    내 질문으로 돌아가기
                  </button>
                  {onNextQuestion && (
                    <button 
                      onClick={onNextQuestion}
                      className="flex-1 py-4 px-6 rounded-xl font-bold text-white bg-gray-900 hover:bg-black transition-colors text-center text-sm shadow-md cursor-pointer"
                    >
                      새로운 심사 시작하기
                    </button>
                  )}
                </div>

                {completedAt && (
                  <div className="flex justify-end mt-4">
                    <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(completedAt).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })} AI 분석 완료
                    </span>
                  </div>
                )}
            </>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
