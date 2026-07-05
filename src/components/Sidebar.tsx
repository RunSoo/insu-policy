import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock } from 'lucide-react';
import { FlowItem } from '../App';
import { smoothScrollToId } from '../utils/scroll';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  flows: Record<string, FlowItem[]>;
  onSelectProduct: (product: string) => void;
}

export function Sidebar({ isOpen, onClose, flows, onSelectProduct }: SidebarProps) {
  const handleItemClick = (productName: string, id: number) => {
    onSelectProduct(productName);
    onClose();
    setTimeout(() => {
      smoothScrollToId(`flow-item-${id}`);
    }, 200); // 사이드바가 닫히기 시작할 때까지 잠시 대기
  };

  const groupedHistory = Object.entries(flows).map(([productName, flow]) => ({
    productName,
    items: flow.filter(item => item.requestData !== null)
  })).filter(group => group.items.length > 0);

  const hasHistory = groupedHistory.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 블러 (Backdrop) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          />

          {/* 사이드바 패널 본체 */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ ease: [0.25, 1, 0.5, 1], duration: 0.35 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[70] flex flex-col"
          >
            {/* 헤더 영역 */}
            <div className="flex items-center justify-between p-6 border-b border-[#E8EDF5]">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">지난 질문 내역</h2>
              <button 
                onClick={onClose}
                className="p-2 bg-[#F5F7FB] text-gray-500 hover:bg-[#E8EDF5] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 질문 목록 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {hasHistory ? (
                groupedHistory.map(group => (
                  <div key={group.productName} className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 px-2 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-[#3182F6]"></span>
                       {group.productName}
                    </h3>
                    <div className="space-y-2">
                      {group.items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(group.productName, item.id)}
                          className="w-full text-left bg-[#F5F7FB] hover:bg-[#EDF3FF] p-4 rounded-xl transition-colors border border-transparent focus:border-blue-500 outline-none group cursor-pointer"
                        >
                          <div className="flex justify-end items-center mb-2">
                            {item.completedAt ? (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                                <Clock className="w-3 h-3" />
                                {new Date(item.completedAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-blue-500 font-bold">
                                <Clock className="w-3 h-3 animate-spin" />
                                심사 중...
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700 text-sm line-clamp-2 leading-relaxed">
                            {item.requestData!.accident_detail}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 space-y-3">
                  <div className="w-12 h-12 bg-[#F5F7FB] rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium">아직 질문 내역이 없습니다.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
