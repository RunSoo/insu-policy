import { useState, useEffect } from 'react';
import { getDocuments, deleteDocument, type Document, type Dataset } from '../services/difyApi';
import { Trash2, FileText, ChevronLeft, ChevronRight, Loader2, CheckCircle2, ArrowLeft, Plus } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Props {
  dataset: Dataset;
  onBack: () => void;
  onUpload: () => void;
}

export default function DocumentList({ dataset, onBack, onUpload }: Props) {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10;

  const fetchDocuments = async (currentPage: number, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await getDocuments(dataset.id, currentPage, limit);
      setDocuments(res.data);
      setTotal(res.total);
      setHasMore(res.has_more);
    } catch (error: any) {
      console.error('Failed to fetch documents:', error);
      if (!silent) {
        showToast(error.message || '문서 목록을 불러오는 데 실패했습니다.', 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(page);
  }, [dataset.id, page]);

  // 폴링(Polling) 로직: '학습 중'인 문서가 하나라도 있으면 3초마다 백그라운드 갱신
  useEffect(() => {
    const isIndexing = documents.some(doc => doc.display_status === 'indexing');
    if (!isIndexing) return;

    const timer = setInterval(() => {
      // silent=true로 호출하여 화면 깜빡임 없이 데이터만 갱신
      fetchDocuments(page, true);
    }, 3000);

    return () => clearInterval(timer);
  }, [documents, dataset.id, page]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`'${name}' 문서를 정말 삭제하시겠습니까?`)) return;
    
    try {
      await deleteDocument(dataset.id, id);
      showToast('삭제되었습니다.', 'success');
      fetchDocuments(page);
    } catch (error) {
      console.error('Delete error:', error);
      showToast('삭제에 실패했습니다.', 'error');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'available') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
          <CheckCircle2 className="w-3 h-3" /> 완료
        </span>
      );
    }
    if (status === 'indexing') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          <Loader2 className="w-3 h-3 animate-spin" /> 학습 중
        </span>
      );
    }
    if (status === 'error') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
          에러
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col gap-3">
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> 뒤로 가기
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-[#3182F6] rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{dataset.name}</h2>
          </div>
        </div>

        <button 
          onClick={onUpload}
          className="flex items-center gap-2 px-5 py-3 bg-[#3182F6] hover:bg-blue-600 text-white font-bold rounded-xl transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-5 h-5" /> 새 문서 파싱 및 업로드
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#3182F6]" />
            <p>데이터를 불러오는 중입니다...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText className="w-12 h-12 mb-4 opacity-30" />
            <p>등록된 문서가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-sm font-semibold text-gray-500 px-4">문서명</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500 px-4">상태</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500 px-4">업로드 일시</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500 px-4 text-right">단어 수</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500 px-4 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(item.display_status)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {item.created_at ? formatDate(item.created_at) : '-'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 text-right">
                      {item.word_count ? item.word_count.toLocaleString() : '0'}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="삭제"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
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
