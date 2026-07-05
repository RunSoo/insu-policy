import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Menu } from 'lucide-react';
import { InsuranceForm, FormData } from './components/InsuranceForm';
import { AnalysisResult } from './components/AnalysisResult';
import { Sidebar } from './components/Sidebar';
import type { AnalysisResultData } from './components/AnalysisResult';
import { smoothScrollToBottom } from './utils/scroll';
import { ProductSelection } from './components/ProductSelection';

export interface FlowItem {
  id: number;
  requestData: FormData | null;
  resultData?: AnalysisResultData | null;
  completedAt?: number | null;
}

const STORAGE_KEY_V2 = 'toss_insurance_flows_v2';
const STORAGE_KEY_V1 = 'toss_insurance_flow_v1';
const PRODUCT_STORAGE_KEY = 'toss_insurance_product_v1';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function App() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(() => {
    return localStorage.getItem(PRODUCT_STORAGE_KEY);
  });

  useEffect(() => {
    if (selectedProduct) {
      localStorage.setItem(PRODUCT_STORAGE_KEY, selectedProduct);
    } else {
      localStorage.removeItem(PRODUCT_STORAGE_KEY);
    }
  }, [selectedProduct]);

  const [flows, setFlows] = useState<Record<string, FlowItem[]>>(() => {
    try {
      const savedV2 = localStorage.getItem(STORAGE_KEY_V2);
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        const now = Date.now();
        const validFlows: Record<string, FlowItem[]> = {};
        for (const [prod, flowArr] of Object.entries(parsed)) {
          const validArr = (flowArr as FlowItem[]).filter(item => (now - item.id) < TWENTY_FOUR_HOURS);
          if (validArr.length > 0) {
            const lastItem = validArr[validArr.length - 1];
            if (lastItem.requestData !== null) {
              validArr.push({ id: Date.now(), requestData: null });
            }
            validFlows[prod] = validArr;
          }
        }
        return validFlows;
      }

      // v1 마이그레이션
      const savedV1 = localStorage.getItem(STORAGE_KEY_V1);
      if (savedV1) {
        const parsed: FlowItem[] = JSON.parse(savedV1);
        const now = Date.now();
        const validFlow = parsed.filter(item => (now - item.id) < TWENTY_FOUR_HOURS);
        if (validFlow.length > 0) {
          const migrated: Record<string, FlowItem[]> = {};
          validFlow.forEach(item => {
            const prod = item.requestData?.product_name;
            if (prod) {
              if (!migrated[prod]) migrated[prod] = [];
              migrated[prod].push(item);
            }
          });
          for (const arr of Object.values(migrated)) {
            const lastItem = arr[arr.length - 1];
            if (lastItem.requestData !== null) {
              arr.push({ id: Date.now(), requestData: null });
            }
          }
          return migrated;
        }
      }
    } catch (e) {
      console.error('Failed to load flows', e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(flows));
  }, [flows]);

  const currentFlow = selectedProduct ? (flows[selectedProduct] || [{ id: Date.now(), requestData: null }]) : [];

  // 상품 선택 후 메인 화면 진입 시 기존 질문 내역이 있다면 새 질문 폼 위치로 부드럽게 스크롤
  useEffect(() => {
    if (selectedProduct && currentFlow.length > 1) {
      const timer = setTimeout(() => {
        smoothScrollToBottom(1.2); 
      }, 600); 
      return () => clearTimeout(timer);
    }
  }, [selectedProduct]);

  const handleSubmit = (id: number, data: FormData) => {
    if (!selectedProduct) return;
    setFlows(prev => {
      const prodFlow = prev[selectedProduct] || [{ id: Date.now(), requestData: null }];
      const newFlow = prodFlow.map(item => item.id === id ? { ...item, requestData: data, resultData: null, completedAt: null } : item);
      return { ...prev, [selectedProduct]: newFlow };
    });
  };

  const handleAnalysisComplete = (id: number, resultData: AnalysisResultData, completedAt: number) => {
    if (!selectedProduct) return;
    setFlows(prev => {
      const prodFlow = prev[selectedProduct] || [];
      const newFlow = prodFlow.map(item => item.id === id ? { ...item, resultData, completedAt } : item);
      return { ...prev, [selectedProduct]: newFlow };
    });
  };

  const handleNextQuestion = () => {
    if (!selectedProduct) return;
    setFlows(prev => {
      const prodFlow = prev[selectedProduct] || [];
      return { ...prev, [selectedProduct]: [...prodFlow, { id: Date.now(), requestData: null }] };
    });
    
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
    <div className={`bg-[#FAFAFA] text-gray-900 font-sans flex flex-col items-center relative ${!selectedProduct ? 'h-screen overflow-hidden' : 'min-h-screen pb-32'}`}>
      
      {/* 상단 앱 헤더 */}
      <div className="w-full bg-[#FAFAFA]/80 backdrop-blur-md px-6 py-6 md:px-12 flex items-center justify-between z-50 mb-8 sticky top-0 border-b border-gray-200/50 shadow-sm shadow-gray-100/20">
        <button 
          onClick={() => setSelectedProduct(null)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="w-6 h-6 bg-[#3182F6] rounded-full flex items-center justify-center"></div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            보상가이드 AI
          </h1>
        </button>
        
        <div className="flex items-center gap-4">
          {selectedProduct && (
            <div 
              className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors" 
              onClick={() => setSelectedProduct(null)}
            >
              <span className="text-sm font-bold text-[#3182F6]">{selectedProduct}</span>
              <span className="text-[11px] text-[#3182F6] opacity-70 bg-white px-1.5 py-0.5 rounded-md">변경</span>
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

      {!selectedProduct ? (
        <ProductSelection onSelect={setSelectedProduct} />
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
              className="w-full flex flex-col space-y-8"
            >
              <div className="w-full transition-all duration-500 ease-in-out">
                <InsuranceForm 
                  onSubmit={(data) => handleSubmit(item.id, data)} 
                  disabled={item.requestData !== null} 
                  timestamp={item.id}
                  initialData={item.requestData || undefined}
                  productName={selectedProduct!}
                />
              </div>

              {item.requestData && (
                <div className="w-full">
                  <AnalysisResult 
                    requestData={item.requestData} 
                    initialResultData={item.resultData}
                    initialCompletedAt={item.completedAt}
                    onAnalysisComplete={(res, time) => handleAnalysisComplete(item.id, res, time)}
                    onNextQuestion={index === currentFlow.length - 1 ? handleNextQuestion : undefined} 
                    flowItemId={`flow-item-${item.id}`}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        </div>
      )}

      {/* 하단 면책 조항 (은은하게 표시) */}
      <div className="absolute bottom-6 w-full text-center px-4">
        <p className="text-[11px] text-gray-400/80 font-medium tracking-tight">
          본 서비스에서 제공되는 AI 판단 결과는 법적 효력을 갖지 않으며 참고용입니다. 입력된 정보는 서버에 저장되지 않으며 로컬 환경에서만 임시 보관됩니다.
        </p>
      </div>

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
        flows={flows} 
        onSelectProduct={setSelectedProduct}
      />
    </div>
  );
}

export default App;
