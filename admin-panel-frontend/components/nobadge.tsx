import { Badge } from "./ui/badge";
import { useTranslations } from "next-intl";

export default function NoBadge() {
  const t = useTranslations("loginBadge");
  return (
    <Badge className="text-red-600 bg-red-200">● {t("notLoggedIn")}</Badge>
  );
}
