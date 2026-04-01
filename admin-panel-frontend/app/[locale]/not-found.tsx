import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="rounded-full bg-muted p-6">
          <FileQuestion className="h-12 w-12 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-7xl font-bold tracking-tighter sm:text-8xl">
            404
          </h1>
          <h2 className="text-xl font-semibold text-destructive">
            {t("pageNotFound")}
          </h2>
          <p className="max-w-md text-muted-foreground">
            {t("notFoundDescription")}
          </p>
        </div>

        <Button asChild variant="default" size="lg">
          <Link href="/">{t("returnHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
