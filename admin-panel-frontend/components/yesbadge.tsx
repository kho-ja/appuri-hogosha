import { Badge } from "./ui/badge";
import { useTranslations } from "next-intl";

export default function YesBadge() {
  const t = useTranslations("loginBadge");
  return (
    <Badge className="text-green-600 bg-green-200">● {t("loggedIn")}</Badge>
  );
}
