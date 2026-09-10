interface ShinhanLogoProps {
  className?: string;
}

export function ShinhanLogo({ className = "w-7 h-7" }: ShinhanLogoProps) {
  return (
    <img 
      src="/shinhan_symbol_only.png?v=3" 
      alt="신한금융그룹" 
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
