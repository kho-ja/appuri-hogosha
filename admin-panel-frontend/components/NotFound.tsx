import { Link } from "@/navigation";
import { Button } from "./ui/button";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <div className="flex items-center justify-center h-full">
      <div>
        <div>
          <h2 className="text-lg font-bold text-[#ff6060] dark:text-[#ff3d3d] mb-4">
            {t("wentWrong")}
          </h2>
          <h1 className="text-8xl font-bold">404</h1>
          <p className="text-lg text-gray-400 dark:text-gray-500 mb-8">
            {t("pageNotFound")}
          </p>
          <Button>
            <Link href="/">{t("returnHome")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
