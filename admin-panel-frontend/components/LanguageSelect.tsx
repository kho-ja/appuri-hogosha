import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/navigation";

const LanguageSelect = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("app");

  const handleLanguageChange = (lang: string): void => {
    router.push(pathname, { locale: lang });
  };

  return (
    <Select defaultValue={locale} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={t("language")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="ja">日本語</SelectItem>
        <SelectItem value="uz">O‘zbekcha</SelectItem>
        <SelectItem value="ru">Русский</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default LanguageSelect;
