import { useState, useRef } from 'react';
import { UploadCloud, FileType, X } from 'lucide-react';
import { clsx } from 'clsx';

interface PdfUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export default function PdfUploader({ onFileSelect, selectedFile }: PdfUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert('PDF 파일만 업로드 가능합니다.');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert('PDF 파일만 업로드 가능합니다.');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col min-h-[200px]">
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition-colors p-8 text-center",
            isDragging ? "border-[#3182F6] bg-blue-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"
          )}
        >
          <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
            <UploadCloud className={clsx("w-8 h-8", isDragging ? "text-[#3182F6]" : "text-gray-400")} />
          </div>
          <p className="font-bold text-gray-900 mb-1">여기로 PDF 파일을 끌어다 놓으세요</p>
          <p className="text-sm text-gray-500">또는 클릭하여 파일 선택하기</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileInput} 
            accept="application/pdf" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="p-5 border border-gray-200 rounded-2xl bg-gray-50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <FileType className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} // For simplicity in this demo to reset
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
