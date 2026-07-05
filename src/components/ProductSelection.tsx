import { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';

export const PRODUCTS = [
  '해외여행자 보험',
  '국내여행자 보험',
  '실손의료 보험',
  '자동차 보험',
  '운전자 보험',
  '펫 보험',
];

interface ProductSelectionProps {
  onSelect: (productName: string) => void;
}

export function ProductSelection({ onSelect }: ProductSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = PRODUCTS.filter(p => p.includes(searchQuery));

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col px-4 md:px-8 mt-6 md:mt-12 flex-1 min-h-0 pb-12">
      <div className="text-center space-y-4 shrink-0 mb-8">
        <div className="w-16 h-16 bg-blue-50 text-[#3182F6] rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          어떤 약관을 조회하시겠습니까?
        </h1>
        <p className="text-gray-500 text-lg">
          AI 심사를 진행할 보험 상품(약관)을 먼저 선택해주세요.
        </p>
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col min-h-0 shrink-0 md:shrink mb-12">
        <div className="p-4 border-b border-[#E8EDF5] flex items-center gap-3 text-gray-400 bg-gray-50/50 shrink-0">
          <Search className="w-5 h-5" />
          <input 
            type="text" 
            placeholder="상품명 검색 (예: 실손의료 보험)..."
            className="bg-transparent border-none outline-none w-full text-gray-900 text-lg placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        <ul className="overflow-y-auto p-3 grid gap-2 min-h-0">
          {filteredProducts.length === 0 ? (
            <li className="px-4 py-8 text-gray-500 text-center flex flex-col items-center">
              <span className="text-lg font-medium mb-1">검색 결과가 없습니다</span>
              <span className="text-sm">다른 키워드로 검색해보세요.</span>
            </li>
          ) : (
            filteredProducts.map(p => (
              <li 
                key={p}
                className="px-5 py-4 cursor-pointer text-gray-900 hover:bg-gray-50 rounded-xl transition-colors text-lg font-medium flex items-center justify-between group border border-transparent hover:border-gray-200"
                onClick={() => onSelect(p)}
              >
                {p}
                <span className="text-sm text-[#3182F6] opacity-0 group-hover:opacity-100 transition-opacity font-bold">
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
