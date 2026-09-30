export default function SearchBar({
  placeholder = "ابحث...",
  value,
  onChange,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-card border border-mint-line rounded-[14px] px-3.5 py-2.5 mb-3.5 shadow-sm">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9BB0A4"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="border-none outline-none bg-transparent font-sans text-[16px] flex-1 text-ink placeholder:text-[#A6B8AE]"
      />
    </div>
  );
}
