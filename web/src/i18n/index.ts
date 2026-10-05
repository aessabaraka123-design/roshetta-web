import { ar } from "./ar";
import { en } from "./en";
import { useStore } from "@/store";

const dictionaries = {
  ar,
  en,
};

export type Locale = "ar" | "en";
export type Dictionary = typeof ar;

export const useTranslation = () => {
  const language = useStore((state: any) => state.language || "ar");
  const t = dictionaries[language as Locale] || dictionaries.ar;
  return { t, language };
};
