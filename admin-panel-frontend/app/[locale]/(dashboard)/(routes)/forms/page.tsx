"use client";

import { useTranslations } from "next-intl";
import PaginationApi from "@/components/PaginationApi";
import FormCard from "@/components/FormCard";
import NothingHere from "@/components/NothingHere";
import { Link, usePathname } from "@/navigation";
import { Button } from "@/components/ui/button";
import SkeletonFormCard from "@/components/SkeletonFormCard";
import { useState } from "react";
import useApiQuery from "@/lib/useApiQuery";
import FormApi from "@/types/formApi";

export default function DashboardPage() {
  const t = useTranslations("forms");
  const pathName = usePathname();
  const [page, setPage] = useState(1);
  const { data } = useApiQuery<FormApi>(`form/list?page=${page}&status=wait`, [
    "forms",
    page,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-3xl w-2/4 font-bold">{t("forms")}</h1>
        <Link href={`${pathName}/list`}>
          <Button>{t("allForms")}</Button>
        </Link>
      </div>

      {data ? (
        data?.forms?.length ? (
          <>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {data.forms.map((data, index) => (
                <FormCard key={index} form={data} />
              ))}
            </div>
            <PaginationApi data={data.pagination} setPage={setPage} />
          </>
        ) : (
          <NothingHere />
        )
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {[...Array(8)].map((_, index) => (
            <SkeletonFormCard key={index} />
          ))}
        </div>
      )}
    </div>
  );
}
