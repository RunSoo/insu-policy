import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
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
  confidenceDetail: string;
  opinionTitle: string;
  opinionText: string[];
  matrix: MatrixRow[];
  guide: GuideItem[];
}

export interface MatrixRow {
  category: string;
  clause: string;
  judgment: string;
  impact: string;
}

export interface GuideItem {
  id: number;
  title: string;
  steps: string[];
}

// 백엔드 마크다운 응답 파싱 엔진
export function parseMarkdownResponse(markdown: string): ParsedAnalysis {
  const result: ParsedAnalysis = {
    status: 'review',
    confidence: '100%',
    confidenceDetail: '',
    opinionTitle: '최종 심사 의견서',
    opinionText: [],
    matrix: [],
    guide: []
  };

  if (!markdown) return result;

  // 섹션 구분 기호(##)로 쪼개기
  const sections = markdown.split(/(?=^##\s+)/m);

  for (const sec of sections) {
    const trimmed = sec.trim();
    if (trimmed.startsWith('## [최종 심사 의견서]')) {
      // 최종 결과 추출
      const statusMatch = trimmed.match(/-\s*최종\s*결과\s*:\s*\*\*([^*]+)\*\*/);
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

      // 확신 점수 추출
      const confMatch = trimmed.match(/-\s*확신\s*점수\s*:\s*\*\*([0-9%]+)\*\*(?:\s*\(([^)]+)\))?/);
      if (confMatch) {
        result.confidence = confMatch[1].trim();
        result.confidenceDetail = confMatch[2] ? confMatch[2].trim() : '';
      }

      // 종합 의견 텍스트 추출
      const lines = trimmed.split('\n');
      let startOpinion = false;
      const opinionLines: string[] = [];

      for (const line of lines) {
        if (line.includes('**종합 의견:**')) {
          startOpinion = true;
          opinionLines.push(line.replace('**종합 의견:**', '').trim());
          continue;
        }
        if (startOpinion) {
          opinionLines.push(line.trim());
        }
      }

      if (opinionLines.length > 0) {
        const fullOpinionText = opinionLines.join('\n');
        result.opinionText = fullOpinionText
          .split(/\n\s*\n/)
          .map(p => p.trim())
          .filter(p => p.length > 0);
      } else {
        // 폴백: 리스트 항목(- )이나 제목(##)이 아닌 문장들 추출
        const fallbackLines = lines.filter(line => {
          const l = line.trim();
          return !l.startsWith('##') && !l.startsWith('-') && l.length > 0;
        });
        result.opinionText = fallbackLines;
      }
    } else if (trimmed.startsWith('## [면책 조항 판단 매트릭스]')) {
      const lines = trimmed.split('\n');
      for (const line of lines) {
        // 테이블 행 파싱 (| 분석 구분 | ... |)
        if (line.includes('|') && !line.includes('분석 구분') && !line.includes(':---')) {
          const cols = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
          if (cols.length >= 4) {
            result.matrix.push({
              category: cols[0].replace(/\*\*/g, '').trim(),
              clause: cols[1].trim(),
              judgment: cols[2].trim(),
              impact: cols[3].trim()
            });
          }
        }
      }
    } else if (trimmed.startsWith('## [현장 조사 가이드]')) {
      const lines = trimmed.split('\n');
      let currentItem: GuideItem | null = null;
      let guideId = 1;

      for (const line of lines) {
        const l = line.trim();
        // 리스트 대제목 감지 (예: 1.  **항공편 지연 시간 확인**:)
        const listMatch = l.match(/^\d+\.\s+(?:\*\*([^*]+)\*\*|([^\:]+))(?:\:)?/);
        if (listMatch) {
          const title = (listMatch[1] || listMatch[2] || '').trim();
          currentItem = {
            id: guideId++,
            title,
            steps: []
          };
          result.guide.push(currentItem);
        } else if (currentItem && (l.startsWith('*') || l.startsWith('-'))) {
          // 리스트 내 소항목 감지 (* ...)
          const stepText = l.replace(/^[\s*\-*]+/, '').trim();
          currentItem.steps.push(stepText);
        }
      }
    }
  }

  return result;
}

// 텍스트 내 마크다운 포맷(볼드, 인라인코드) 렌더러
function renderFormattedText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-extrabold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={index} className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600 font-mono text-xs border border-gray-200/50">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}

const mockAnalyze = (data: FormData): Promise<AnalysisResultData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let status: 'approve' | 'reject' | 'review' = 'review';
      if (data.testMode === 'approve') status = 'approve';
      if (data.testMode === 'reject') status = 'reject';

      // 만약 입력내용에 '만두'나 '비행기 연착' 등이 들어갔다면 기본적으로 백엔드 예시인 'review'를 제공합니다.
      const isManduScenario = data.accident_detail.includes('만두') || data.accident_detail.includes('비행기 연착');
      if (isManduScenario && data.testMode === 'random') {
        status = 'review';
      }

      const reviewMarkdown = `## [최종 심사 의견서]
- 최종 결과: **검토필요**
- 확신 점수: **90%** (약관 해석에 대한 확신은 높으나, 사실관계 확인이 필요함)

**종합 의견:**
1차 심사 결과에서 항공기 지연으로 인한 식음료 비용이 보상 대상에 해당한다는 해석은 약관 규정(\`제1조(보상하는 손해) ② 1.\`)에 부합합니다. 그러나, 해당 보상이 지급되기 위한 **전제 조건**들이 충족되었는지에 대한 확인 절차가 누락되었습니다. 따라서 최종 지급 여부를 결정하기 위해서는 추가적인 사실관계 확인이 필요합니다.

1차 심사 결과에서 제시된 약관 해석 자체는 정확합니다. '지연된 항공편을 기다리는 동안 피보험자가 실제로 지출한 식음료 비용(식당, 편의점 등)'은 명백히 보상하는 손해 항목에 해당하며, 해당 비용을 면책하는 규정 또한 약관상 확인되지 않습니다. '합리적으로 필요하며 유효한 비용'이라는 조건 하에 1만원 상당의 식음료 구매는 통상적인 수준으로 판단됩니다.

문제는, 이러한 보상이 개시되기 위한 **보험금 지급 사유**가 충족되었는지 여부입니다. 약관 \`제1조(보험금의 지급사유)\` ①항 2호에 따르면, 항공편이 **4시간 이상 출발이 지연**된 경우에 보상하는 손해가 발생합니다. 또한, \`제1조 ③항\`에 따르면 **유료승객으로서 정기항공편**을 이용하던 중에 발생한 사고에 한하여 보상합니다. 1차 심사 결과에서는 이러한 구체적인 조건 충족 여부를 확인하고 결론을 내리지 않았습니다.

따라서, 1차 심사 결과를 보완하여, 사실관계 확인을 거친 후 최종 지급 여부를 결정해야 합니다.

## [면책 조항 판단 매트릭스]

| 분석 구분 | 관련 약관 조항 | 판단 내용 | 보상 영향도 |
| :--- | :--- | :--- | :--- |
| **보상 가능 항목** | 제1조(보상하는 손해) ② 1. "지연된 항공편을 기다리는 동안 피보험자가 실제로 지출한 식음료 비용(식당, 편의점 등)" | 비행기 연착으로 인해 편의점에서 구매한 식음료(만두)는 약관에서 명시한 보상 항목에 직접적으로 해당합니다. | 높음 |
| **보상 조건 (확인 필요)** | 제1조(보험금의 지급사유) ① 2. "항공편이 4시간 이상 출발이 지연, 취소 되거나..." | 항공편이 **4시간 이상** 지연되었는지 여부가 보상 개시의 필수 조건입니다. 이 조건이 충족되지 않으면 식음료 비용은 보상되지 않습니다. | 높음 (조건 미충족 시 부지급) |
| **보상 조건 (확인 필요)** | 제1조 ③ "피보험자가 보험기간 중 유료승객으로서 정기항공편을 이용하던 중에 발생한 사고에 한하여 보상합니다." | 피보험자가 **유료 승객**으로서 **정기 항공편**을 이용했는지 여부도 보상 대상이 되기 위한 조건입니다. | 높음 (조건 미충족 시 부지급) |
| **면책 사항** | 제4조(보상하지 않는 사항) | 제공된 약관 조항 중, 항공기 지연으로 인한 식음료 비용 지출에 대한 면책 조항은 확인되지 않습니다. | 해당 없음 |
| **비용의 합리성** | 제1조(보험금의 지급사유) ② "출발 또는 결항된 항공편에 대해 발생한 합리적으로 필요하며 유효한 아래의 비용" | 1만원 상당의 식음료 구매는 통상적인 상황에서 합리적인 범위 내로 판단되나, 구체적인 상황(예: 공항 내 식사 가능 여부, 대체 교통편 제공 여부 등)에 따라 추가 검토가 필요할 수 있습니다. | 중간 (사실관계에 따라 판단) |

## [현장 조사 가이드]

1.  **항공편 지연 시간 확인**:
    *   피보험자가 탑승하려던 항공편의 **출발 예정 시간**과 **실제 출발 시간**을 운항 정보 시스템 또는 항공사로부터 공식적으로 확인하십시오.
    *   지연 시간이 **4시간 이상**인지 명확히 확인하십시오.
2.  **탑승 정보 확인**:
    *   피보험자가 **유료 승객**이었는지, 이용한 항공편이 **정기 항공편**이었는지 탑승권, 예약 정보 등을 통해 확인하십시오.
3.  **구매 영수증 확인**:
    *   편의점에서 만두를 구매한 **영수증**을 확보하여 구매 일시, 품목, 금액을 확인하십시오. (영수증이 없는 경우, 카드 내역 등으로 대체 가능성 검토)
4.  **사고 발생 장소 및 시간**:
    *   식음료를 구매한 시점이 항공편 지연으로 인해 공항 등에서 대기하던 중이었는지 확인하십시오. (예: 공항 내 편의점 구매인지, 공항 외부에서 구매한 것인지 등)
`;

      const approveMarkdown = `## [최종 심사 의견서]
- 최종 결과: **지급**
- 확신 점수: **95%** (약관 조항에 완벽하게 부합하여 즉시 보상 지급을 승인합니다)

**종합 의견:**
피보험자가 가입하신 \`${data.product_name}\` 약관에 의거하여, 제출된 사고 경위 및 청구 내역("${data.accident_detail}")을 면밀히 분석한 결과 **즉시 보험금 지급** 처리가 가능한 적격 사고로 승인되었습니다.

모든 필요 증빙 서류가 정상이므로 신속히 보험금 결재를 완료하시기 바랍니다.

## [면책 조항 판단 매트릭스]

| 분석 구분 | 관련 약관 조항 | 판단 내용 | 보상 영향도 |
| :--- | :--- | :--- | :--- |
| **보상 가능 항목** | 제1조(보상하는 손해) | 해당 지출 비용은 약관 내 보상 가능한 부합 경비로 인정됩니다. | 높음 |
| **면책 사항** | 제4조(보상하지 않는 사항) | 이번 청구 건은 피보험자의 고의 등 별도의 면책 규정에 해당하지 않습니다. | 해당 없음 |

## [현장 조사 가이드]

1.  **영수증 사실 대조**:
    *   제출한 결제 금액과 실제 카드 청구 영수증 내역을 최종 대조하십시오.
`;

      const rejectMarkdown = `## [최종 심사 의견서]
- 최종 결과: **지급거절**
- 확신 점수: **99%** (약관 제5조 면책조항에 완벽히 상응하여 부지급 결정합니다)

**종합 의견:**
피보험자가 가입하신 \`${data.product_name}\` 약관을 심사한 결과, 청구하신 내용("${data.accident_detail}")은 **보상 대상 제외 항목(면책 조항)**에 완벽하게 저촉되어 지급 처리가 불가능합니다.

관련 조항에 따라 피보험자의 과실 또는 고의로 인한 훼손 등은 보장하지 않는 면책 규정에 직접적으로 해당되어 부지급 처리합니다.

## [면책 조항 판단 매트릭스]

| 분석 구분 | 관련 약관 조항 | 판단 내용 | 보상 영향도 |
| :--- | :--- | :--- | :--- |
| **면책 사항** | 제5조(보상하지 않는 사항) 1. 피보험자의 고의 | 약관 규정에 의거하여 고의로 발생시킨 사유에 대해서는 보험금을 지급하지 않습니다. | 높음 (부지급) |

## [현장 조사 가이드]

1.  **사고 발생 경위 검증**:
    *   제출 서류의 허위 유무 및 사고 발생의 고의성 진위 여부를 집중 조사하십시오.
`;

      let markdownText = reviewMarkdown;
      if (status === 'approve') markdownText = approveMarkdown;
      if (status === 'reject') markdownText = rejectMarkdown;

      resolve({
        status,
        markdownText
      });
    }, 2500);
  });
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
  
  // 가이드 체크리스트 상태 추적 (key: guideId-stepIndex)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
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

    mockAnalyze(requestData).then((res) => {
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

                {/* 2. 최종 심사 의견서 (의견 텍스트) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E8EDF5] pb-3">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-1 h-5 bg-blue-500 rounded-sm"></span>
                      최종 심사 의견서
                    </h3>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed space-y-4 font-light">
                    {parsed.opinionText.map((paragraph, index) => (
                      <p key={index} className="break-keep">
                        {renderFormattedText(paragraph)}
                      </p>
                    ))}
                  </div>
                  {parsed.confidenceDetail && (
                    <div className="bg-[#F5F7FB] border border-[#E8EDF5] rounded-xl p-4 text-xs text-gray-500 flex items-center gap-2">
                      <span className="font-bold text-gray-700">확신 분석:</span>
                      {parsed.confidenceDetail}
                    </div>
                  )}
                </div>

                {/* 3. 면책 조항 판단 매트릭스 (표) */}
                {parsed.matrix.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E8EDF5] pb-3">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-1 h-5 bg-blue-500 rounded-sm"></span>
                        면책 조항 판단 매트릭스
                      </h3>
                    </div>
                    
                    <div className="overflow-x-auto -mx-6 md:-mx-10 border-y border-[#E8EDF5] bg-[#F5F7FB]/30">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F5F7FB] border-b border-[#E8EDF5]">
                            <th className="px-6 py-4.5 font-bold text-gray-500 w-24 whitespace-nowrap">분석 구분</th>
                            <th className="px-4 py-4.5 font-bold text-gray-500 min-w-[140px]">관련 약관 조항</th>
                            <th className="px-4 py-4.5 font-bold text-gray-500 min-w-[200px]">판단 내용</th>
                            <th className="px-6 py-4.5 font-bold text-gray-500 w-24 text-right whitespace-nowrap">보상 영향도</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8EDF5]">
                          {parsed.matrix.map((row, idx) => (
                            <tr key={idx} className="hover:bg-[#E8EDF5]/40 transition-colors">
                              <td className="px-6 py-4.5 font-semibold text-gray-900 align-top whitespace-nowrap">
                                {row.category}
                              </td>
                              <td className="px-4 py-4.5 text-gray-600 align-top leading-relaxed break-keep font-light">
                                {renderFormattedText(row.clause)}
                              </td>
                              <td className="px-4 py-4.5 text-gray-600 align-top leading-relaxed break-keep font-light">
                                {renderFormattedText(row.judgment)}
                              </td>
                              <td className="px-6 py-4.5 align-top text-right whitespace-nowrap">
                                <span className={cn(
                                  "inline-flex px-2 py-0.5 rounded-lg text-[10px] font-extrabold tracking-tight shadow-sm border",
                                  row.impact.includes('높음') && "bg-red-50 text-red-600 border-red-100",
                                  row.impact.includes('중간') && "bg-amber-50 text-amber-600 border-amber-100",
                                  row.impact.includes('해당 없음') && "bg-gray-100 text-gray-600 border-gray-200",
                                  !row.impact.includes('높음') && !row.impact.includes('중간') && !row.impact.includes('해당 없음') && "bg-blue-50 text-blue-600 border-blue-100"
                                )}>
                                  {row.impact}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. 현장 조사 가이드 (체크리스트) */}
                {parsed.guide.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E8EDF5] pb-3">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-1 h-5 bg-blue-500 rounded-sm"></span>
                        현장 조사 가이드
                      </h3>
                      <span className="text-xs text-gray-400 font-medium">현장 조사를 진행하며 클릭하여 체크해 보세요</span>
                    </div>

                    <div className="space-y-3">
                      {parsed.guide.map((item) => (
                        <div 
                          key={item.id} 
                          className="bg-[#F5F7FB] hover:bg-[#EFF3FA] border border-[#E8EDF5] rounded-xl p-5 transition-all duration-300"
                        >
                          <h4 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-[#F0F4FF] text-[#0046ff] flex items-center justify-center text-[10px] font-black border border-[#D5E0FF]">
                              {item.id}
                            </span>
                            {item.title}
                          </h4>
                          <div className="space-y-2 ml-7">
                            {item.steps.map((step, idx) => {
                              const key = `${item.id}-${idx}`;
                              const isChecked = !!checkedItems[key];
                              return (
                                <label 
                                  key={idx} 
                                  className={cn(
                                    "flex items-start gap-3 cursor-pointer select-none group text-xs text-gray-600 leading-relaxed py-1.5 px-2 rounded-xl transition-all duration-300",
                                    isChecked && "bg-blue-50/30 text-gray-400"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))}
                                    className="mt-0.5 w-4 h-4 rounded text-blue-500 border-gray-300 focus:ring-blue-500 cursor-pointer transition-colors"
                                  />
                                  <span className={cn(
                                    "group-hover:text-gray-900 transition-colors font-light break-keep", 
                                    isChecked && "line-through text-gray-400 font-light"
                                  )}>
                                    {renderFormattedText(step)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
