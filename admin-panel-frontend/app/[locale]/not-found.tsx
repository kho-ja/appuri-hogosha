"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="rounded-full bg-destructive/10 p-6">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("unexpectedError")}
          </h1>
          <h2 className="text-lg font-medium text-destructive">
            {t("wentWrong")}
          </h2>
          <p className="max-w-md text-muted-foreground">
            {t("errorDescription")}
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={reset} variant="default" size="lg">
            {t("tryAgain")}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">{t("returnHome")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
