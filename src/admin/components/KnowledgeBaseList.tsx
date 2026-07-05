import { useState, useEffect } from 'react';
import { getDatasets, type Dataset } from '../services/difyApi';
import { Database, Loader2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Props {
  onSelect: (dataset: Dataset) => void;
}

export default function KnowledgeBaseList({ onSelect }: Props) {
  const { showToast } = useToast();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 12;

  const fetchDatasets = async (currentPage: number) => {
    try {
      setLoading(true);
      const res = await getDatasets(currentPage, limit);
      setDatasets(res.data);
      setTotal(res.total);
      setHasMore(res.has_more);
    } catch (error: any) {
      console.error('Failed to fetch knowledge bases:', error);
      showToast(error.message || '지식 베이스 목록을 불러오는 데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets(page);
  }, [page]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('ko-KR');
  };

  return (
    <div className="h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">지식 베이스 관리</h1>
        <p className="text-gray-500 mt-2">Dify에 등록된 데이터셋(지식 베이스) 목록입니다. 폴더를 클릭하여 문서를 관리하세요.</p>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#3182F6]" />
          <p>데이터를 불러오는 중입니다...</p>
        </div>
      ) : datasets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <Database className="w-12 h-12 mb-4 opacity-30" />
          <p>등록된 지식 베이스가 없습니다.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
            {datasets.map(dataset => (
              <div 
                key={dataset.id}
                onClick={() => onSelect(dataset)}
                className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 flex flex-col h-[200px] hover:shadow-md hover:border-[#3182F6] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#3182F6] group-hover:bg-[#3182F6] group-hover:text-white transition-colors">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg line-clamp-1 flex-1">{dataset.name}</h3>
                </div>
                
                <p className="text-sm text-gray-500 flex-1 line-clamp-3 leading-relaxed">
                  {dataset.description || '설명이 없습니다.'}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> {dataset.document_count}개의 문서
                  </span>
                  <span>{formatDate(dataset.created_at)} 생성</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="mt-6 pt-6 flex items-center justify-between border-t border-gray-200">
          <span className="text-sm text-gray-500">
            총 {total}개 중 {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
