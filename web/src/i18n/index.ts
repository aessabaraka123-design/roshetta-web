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
  const language = useStore((state: any) => state.language || "ar") as Locale;
  const setLanguage = useStore((state: any) => state.setLanguage);
  const t = dictionaries[language] || dictionaries.ar;
  const isRtl = language !== "en";
  return { t, language, setLanguage, isRtl };
};
