export default function RoshettaLogo({
  className = "w-6 h-6",
  showText = false,
  textClassName = "font-bold text-[22px]",
}: {
  className?: string;
  showText?: boolean;
  textClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 24 24" className={`${className} drop-shadow-sm`}>
        <circle cx="12" cy="12" r="12" fill="#2D6E7E" />
        <g transform="rotate(-45 12 12)">
          <path d="M8.5 12 V8.5 a3.5 3.5 0 0 1 7 0 V12 Z" fill="#88B09F" />
          <path d="M8.5 12 v3.5 a3.5 3.5 0 0 0 7 0 V12 Z" fill="#ffffff" />
        </g>
      </svg>
      {showText && <span className={textClassName}>روشتة</span>}
    </div>
  );
}
