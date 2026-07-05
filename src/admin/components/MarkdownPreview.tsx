import { FileText } from 'lucide-react';

interface MarkdownPreviewProps {
  isParsing: boolean;
  markdown: string | null;
  onMarkdownChange: (value: string) => void;
}

export default function MarkdownPreview({ isParsing, markdown, onMarkdownChange }: MarkdownPreviewProps) {
  
  if (isParsing) {
    return (
      <div className="absolute inset-0 flex flex-col gap-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-100 rounded w-full"></div>
        <div className="h-4 bg-gray-100 rounded w-full"></div>
        <div className="h-4 bg-gray-100 rounded w-5/6"></div>
        <div className="h-4 bg-gray-100 rounded w-full mt-4"></div>
        <div className="h-32 bg-gray-100 rounded-xl w-full mt-2"></div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/80 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin"></div>
            <span className="font-semibold text-[#3182F6]">브라우저 자체 파싱 엔진 구동 중...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!markdown) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <p>PDF 파일을 업로드하고 파싱을 시작해주세요</p>
      </div>
    );
  }

  return (
    <textarea 
      value={markdown}
      onChange={(e) => onMarkdownChange(e.target.value)}
      className="absolute inset-0 w-full h-full resize-none p-6 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3182F6]/50 font-mono text-sm leading-relaxed text-gray-700"
      placeholder="추출된 마크다운 결과가 여기에 표시됩니다."
    />
  );
}
