"use client";
import { useStore } from "@/store";

export default function RoshettaLogo({
  className = "w-10 h-10",
  showText = false,
  textClassName = "font-bold text-[22px]",
}: {
  className?: string;
  showText?: boolean;
  textClassName?: string;
}) {
  const language = useStore((state: any) => state.language);
  
  return (
    <div className="flex items-center gap-2">
      <img
        src="/logo.png"
        alt="Roshetta Logo"
        className={`${className} object-contain drop-shadow-sm`}
      />
      {showText && <span className={textClassName}>{language === "en" ? "Roshetta" : "روشتة"}</span>}
    </div>
  );
}
