import { useState } from 'react';
import Sidebar from './components/Sidebar';
import PdfUploader from './components/PdfUploader';
import MarkdownPreview from './components/MarkdownPreview';
import KnowledgeBaseList from './components/KnowledgeBaseList';
import DocumentList from './components/DocumentList';
import { extractAllContent } from '../utils/pdfParser';
import { type Dataset, createDocumentByText } from './services/difyApi';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from './contexts/ToastContext';

type ViewMode = 'knowledge_list' | 'document_list' | 'upload_parsing';

export default function AdminApp() {
  const { showToast } = useToast();
  const [currentView, setCurrentView] = useState<ViewMode>('knowledge_list');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedMarkdown, setParsedMarkdown] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setParsedMarkdown(null);
  };

  const handleStartParsing = async () => {
    if (!selectedFile) return;
    setIsParsing(true);
    setParsedMarkdown(null);

    try {
      const result = await extractAllContent(selectedFile);
      setParsedMarkdown(result);
    } catch (error) {
      console.error('PDF parsing error:', error);
      showToast('PDF 파싱 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSendToKnowledgeBase = async (markdown: string) => {
    if (!selectedDataset || !selectedFile) return;
    
    setIsUploading(true);
    try {
      // 확장자를 .md로 변경하여 이름 지정
      const docName = selectedFile.name.replace(/\.[^/.]+$/, "") + ".md";
      await createDocumentByText(selectedDataset.id, docName, markdown);
      
      showToast(`'${selectedDataset.name}' 지식 베이스로 성공적으로 전송되었습니다.`, 'success');
      
      // 폼 초기화 및 목록으로 돌아가기
      setSelectedFile(null);
      setParsedMarkdown(null);
      setCurrentView('document_list');
    } catch (error: any) {
      console.error('Upload error:', error);
      showToast(`업로드 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F2F4F6] text-gray-900">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full overflow-y-auto p-8">
        {currentView === 'knowledge_list' && (
          <KnowledgeBaseList 
            onSelect={(dataset) => {
              setSelectedDataset(dataset);
              setCurrentView('document_list');
            }} 
          />
        )}

        {currentView === 'document_list' && selectedDataset && (
          <DocumentList 
            dataset={selectedDataset} 
            onBack={() => {
              setSelectedDataset(null);
              setCurrentView('knowledge_list');
            }}
            onUpload={() => setCurrentView('upload_parsing')}
          />
        )}

        {currentView === 'upload_parsing' && selectedDataset && (
          <div className="h-full flex flex-col">
            <header className="mb-8">
              <button 
                onClick={() => setCurrentView('document_list')}
                className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-4 w-fit"
              >
                <ArrowLeft className="w-4 h-4" /> 문서 목록으로 돌아가기
              </button>
              <h1 className="text-3xl font-bold tracking-tight">[{selectedDataset.name}] 새 약관 업로드</h1>
              <p className="text-gray-500 mt-2">PDF 약관을 업로드하면 브라우저 내에서 직접 마크다운으로 변환 후 이 지식 베이스에 전송합니다.</p>
            </header>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px] pb-8">
              {/* 좌측 패널: 업로드 */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-white rounded-[24px] shadow-sm p-6 flex flex-col h-full border border-gray-100">
                  <h2 className="text-lg font-semibold mb-4">1. 파일 업로드</h2>
                  <PdfUploader 
                    onFileSelect={handleFileSelect} 
                    selectedFile={selectedFile}
                  />
                  
                  <button
                    onClick={handleStartParsing}
                    disabled={!selectedFile || isParsing}
                    className="mt-auto w-full py-4 rounded-xl font-bold text-white transition-all duration-200 bg-[#3182F6] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isParsing ? '엔진 구동 중...' : '약관 텍스트 추출하기'}
                  </button>
                </div>
              </div>

              {/* 우측 패널: 프리뷰 */}
              <div className="w-full lg:w-2/3 flex flex-col h-full">
                <div className="bg-white rounded-[24px] shadow-sm p-6 flex flex-col h-full border border-gray-100">
                  <h2 className="text-lg font-semibold mb-4">2. 마크다운 변환 결과</h2>
                  <div className="flex-1 overflow-hidden relative">
                    <MarkdownPreview 
                      isParsing={isParsing} 
                      markdown={parsedMarkdown} 
                      onMarkdownChange={setParsedMarkdown}
                    />
                  </div>

                  {parsedMarkdown && (
                    <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => handleSendToKnowledgeBase(parsedMarkdown)}
                        disabled={isUploading}
                        className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" /> 전송 중...
                          </>
                        ) : (
                          <>✅ 최종 검증 완료 및 AI 학습 데이터 전송</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
