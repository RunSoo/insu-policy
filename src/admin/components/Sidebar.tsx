import { Database } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#3182F6] flex items-center justify-center">
            <span className="text-white font-black text-lg tracking-tighter">S</span>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-gray-900">Admin Console</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-left bg-[#F2F4F6] text-[#3182F6]">
          <Database className="w-5 h-5 text-[#3182F6]" />
          지식 베이스 관리
        </button>
      </nav>
    </aside>
  );
}
