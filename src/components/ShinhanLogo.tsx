interface ShinhanLogoProps {
  className?: string;
}

export function ShinhanLogo({ className = "w-7 h-7" }: ShinhanLogoProps) {
  return (
    <div 
      className={`object-contain shrink-0 ${className} bg-blue-500 rounded-full font-bold text-white content-center justify-center text-sm/7 flex`}
    >i</div>
  );
}
