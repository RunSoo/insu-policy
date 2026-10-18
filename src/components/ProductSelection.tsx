import { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';

export const PRODUCTS = [
  '신한 SOL 처음해외여행보험', '신한 단체상해보험'
];

interface ProductSelectionProps {
  onSelect: (productName: string) => void;
}

export function ProductSelection({ onSelect }: ProductSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = PRODUCTS.filter(p => p.includes(searchQuery));

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col px-3.5 sm:px-6 md:px-8 mt-4 sm:mt-6 md:mt-12 flex-1 min-h-0 pb-12">
      <div className="text-center space-y-3 sm:space-y-4 shrink-0 mb-6 sm:mb-8">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 text-[#0046FF] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight break-keep text-balance">
          어떤 보험 상품을 심사하시겠습니까?
        </h1>
        <p className="text-gray-500 text-sm sm:text-base md:text-lg break-keep text-balance">
          AI 심사를 진행할 보험 상품을 선택해 주세요.
        </p>
      </div>

      <div className="bg-white rounded-[20px] sm:rounded-[24px] shadow-sm border border-gray-100 flex flex-col min-h-0 shrink-0 md:shrink mb-12">
        <div className="p-3.5 sm:p-4 border-b border-[#E8EDF5] flex items-center gap-3 text-gray-400 bg-gray-50/50 shrink-0">
          <Search className="w-5 h-5 shrink-0" />
          <input 
            type="text" 
            placeholder="상품명 검색 (예: 실손의료 보험)..."
            className="bg-transparent border-none outline-none w-full text-gray-900 text-base sm:text-lg placeholder:text-gray-400 break-keep"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        <ul className="overflow-y-auto p-2 sm:p-3 grid gap-1.5 sm:gap-2 min-h-0">
          {filteredProducts.length === 0 ? (
            <li className="px-4 py-8 text-gray-500 text-center flex flex-col items-center">
              <span className="text-base sm:text-lg font-medium mb-1 break-keep">검색 결과가 없습니다</span>
              <span className="text-xs sm:text-sm break-keep">다른 키워드로 검색해보세요.</span>
            </li>
          ) : (
            filteredProducts.map(p => (
              <li 
                key={p}
                className="px-4 sm:px-5 py-3.5 sm:py-4 cursor-pointer text-gray-900 hover:bg-gray-50 rounded-xl transition-colors text-base sm:text-lg font-medium flex items-center justify-between group border border-transparent hover:border-gray-200 break-keep"
                onClick={() => onSelect(p)}
              >
                <span>{p}</span>
                <span className="text-xs sm:text-sm text-[#0046FF] opacity-0 group-hover:opacity-100 transition-opacity font-bold shrink-0 ml-2">
                  선택
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
