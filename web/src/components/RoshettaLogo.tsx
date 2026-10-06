"use client";
import { useStore } from "@/store";

export default function RoshettaLogo({
  className = "h-10 w-auto",
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
        className={`${className} max-w-full object-contain drop-shadow-sm`}
      />
      
    </div>
  );
}
