import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Menu } from 'lucide-react';
import { InsuranceForm, FormData } from './components/InsuranceForm';
import { AnalysisResult } from './components/AnalysisResult';
import { Sidebar } from './components/Sidebar';
import type { AnalysisResultData } from './components/AnalysisResult';
import { smoothScrollToBottom } from './utils/scroll';
import { ProductSelection } from './components/ProductSelection';
import { ShinhanLogo } from './components/ShinhanLogo';
import type { DynamicFormConfig } from './components/AnalysisResult';

export interface FlowItem {
  id: number;
  requestData: FormData | null;
  resultData?: AnalysisResultData | null;
  completedAt?: number | null;
  askedForm?: DynamicFormConfig | null;
}

export interface FlowSession {
  id: number;
  productName: string;
  items: FlowItem[];
  updatedAt: number;
}

const STORAGE_KEY_V3 = 'toss_insurance_flows_v3';
const STORAGE_KEY_V2 = 'toss_insurance_flows_v2';
const STORAGE_KEY_V1 = 'toss_insurance_flow_v1';
const PRODUCT_STORAGE_KEY = 'toss_insurance_product_v1';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function App() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const [sessions, setSessions] = useState<FlowSession[]>(() => {
    try {
      const savedV3 = localStorage.getItem(STORAGE_KEY_V3);
      if (savedV3) {
        return JSON.parse(savedV3);
      }

      // v2 -> v3 Migration
      const savedV2 = localStorage.getItem(STORAGE_KEY_V2);
      if (savedV2) {
        const parsed: Record<string, FlowItem[]> = JSON.parse(savedV2);
        const migrated: FlowSession[] = [];
        for (const [prodName, flowArr] of Object.entries(parsed)) {
          if (flowArr.length > 0) {
             migrated.push({
               id: Date.now() + Math.random(),
               productName: prodName,
               items: flowArr,
               updatedAt: flowArr[flowArr.length - 1].completedAt || Date.now()
             });
          }
        }
        return migrated;
      }
    } catch (e) {
      console.error('Failed to load flows', e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(sessions));
  }, [sessions]);

  const handleProductSelect = (productName: string) => {
    const newSessionId = Date.now();
    const newSession: FlowSession = {
      id: newSessionId,
      productName: productName,
      items: [{ id: Date.now(), requestData: null }],
      updatedAt: Date.now()
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSessionId);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const selectedProduct = activeSession?.productName || null;
  const currentFlow = activeSession?.items || [];

  // 상품 선택 후 메인 화면 진입 시 기존 질문 내역이 있다면 새 질문 폼 위치로 부드럽게 스크롤
  useEffect(() => {
    if (activeSessionId && currentFlow.length > 1) {
      const timer = setTimeout(() => {
        smoothScrollToBottom(1.2); 
      }, 600); 
      return () => clearTimeout(timer);
    }
  }, [activeSessionId]);

  const handleSubmit = (id: number, data: FormData) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        const newFlow = session.items.map(item => {
          if (item.id === id) {
            // 임시 ID(1) 였던 경우 실제 제출 시점의 타임스탬프로 변경하여 1970년 버그 및 삭제 버그 방지
            const realId = id === 1 ? Date.now() : id;
            return { ...item, id: realId, requestData: data, resultData: null, completedAt: null, askedForm: null };
          }
          return item;
        });
        return { ...session, items: newFlow, updatedAt: Date.now() };
      }
      return session;
    }));
  };

  const handleAnalysisComplete = (id: number, resultData: AnalysisResultData, completedAt: number) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        const newFlow = session.items.map(item => item.id === id ? { ...item, resultData, completedAt } : item);
        return { ...session, items: newFlow, updatedAt: Date.now() };
      }
      return session;
    }));
  };

  const handleFormReceived = (id: number, form: DynamicFormConfig) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        const newFlow = session.items.map(item => item.id === id ? { ...item, askedForm: form, resultData: null, completedAt: null } : item);
        return { ...session, items: newFlow, updatedAt: Date.now() };
      }
      return session;
    }));
  };

  const handleNextQuestion = () => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        return { ...session, items: [...session.items, { id: Date.now(), requestData: null }], updatedAt: Date.now() };
      }
      return session;
    }));
    
    setTimeout(() => {
      smoothScrollToBottom();
    }, 100);
  };

  const handleDynamicSubmit = (answers: Record<string, any>, newDetail: string) => {
    if (!activeSessionId || !selectedProduct) return;
    
    const newId = Date.now();
    const newData: FormData = {
      product_name: selectedProduct,
      accident_detail: newDetail,
      testMode: 'random', // or keep from previous if needed, but random is safe
      is_followup: true,
      dynamicAnswers: answers
    };

    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        return { ...session, items: [...session.items, { id: newId, requestData: newData, resultData: null, completedAt: null }], updatedAt: Date.now() };
      }
      return session;
    }));

    setTimeout(() => {
      smoothScrollToBottom();
    }, 100);
  };

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // 바닥에서 400px 이상 위로 스크롤되었을 때 버튼 표시
      const isScrolledUp = window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 400;
      setShowScrollBottom(isScrolledUp);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 초기 상태 체크

    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentFlow]); // currentFlow가 변경될 때마다 재검사

  const scrollToBottom = () => {
    smoothScrollToBottom(1.0); // 플로팅 버튼 클릭 시 더 쫀득한 느낌을 주도록 스크롤 시간을 살짝 늘림
  };

  return (
    <div className={`bg-[#FAFAFA] text-gray-900 font-sans flex flex-col items-center relative ${!activeSessionId ? 'h-screen overflow-hidden' : 'min-h-screen pb-32'}`}>
      
      {/* 상단 앱 헤더 */}
      <div className="w-full bg-[#FAFAFA]/80 backdrop-blur-md px-6 py-6 md:px-12 flex items-center justify-between z-50 mb-8 sticky top-0 border-b border-gray-200/50 shadow-sm shadow-gray-100/20">
        <button 
          onClick={() => {
            setActiveSessionId(null);
          }}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <ShinhanLogo className="w-7 h-7 shrink-0" />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            보상가이드 AI
          </h1>
        </button>
        
        <div className="flex items-center gap-4">
          {selectedProduct && (
            <div 
              className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors" 
              onClick={() => setActiveSessionId(null)}
            >
              <span className="text-sm font-bold text-[#3182F6]">{selectedProduct}</span>
              <span className="text-[11px] text-[#3182F6] opacity-70 bg-white px-1.5 py-0.5 rounded-md">새 질문</span>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors cursor-pointer"
            aria-label="메뉴 열기"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {!activeSessionId ? (
        <ProductSelection onSelect={handleProductSelect} />
      ) : (
        <div className="w-full max-w-4xl mx-auto flex flex-col space-y-16 px-4 md:px-8">
        <AnimatePresence>
          {currentFlow.map((item, index) => (
            <motion.div 
              key={item.id} 
              id={`flow-item-${item.id}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full flex flex-col space-y-3"
            >
              <div className="w-full transition-all duration-500 ease-in-out">
                <InsuranceForm 
                  onSubmit={(data) => handleSubmit(item.id, data)} 
                  disabled={item.requestData !== null && !item.askedForm} 
                  timestamp={item.id}
                  initialData={item.requestData || undefined}
                  productName={selectedProduct!}
                  askedForm={item.askedForm || undefined}
                />
              </div>

              {item.requestData && !item.askedForm && (
                <div className="w-full">
                  <AnalysisResult 
                    requestData={item.requestData} 
                    initialResultData={item.resultData}
                    initialCompletedAt={item.completedAt}
                    onAnalysisComplete={(res, time) => handleAnalysisComplete(item.id, res, time)}
                    onFormReceived={(form) => handleFormReceived(item.id, form)}
                    onNextQuestion={handleNextQuestion} 
                    onSubmitDynamicForm={handleDynamicSubmit}
                    flowItemId={`flow-item-${item.id}`}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        </div>
      )}

      {/* 맨 아래로 스크롤하는 플로팅 버튼 (FAB) */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-10 right-6 md:bottom-12 md:right-12 z-50"
          >
            <button
              onClick={scrollToBottom}
              className="bg-white text-gray-700 p-4 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 hover:text-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label="맨 아래로 스크롤"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        sessions={sessions} 
        onSelectSession={setActiveSessionId}
      />
    </div>
  );
}

export default App;
