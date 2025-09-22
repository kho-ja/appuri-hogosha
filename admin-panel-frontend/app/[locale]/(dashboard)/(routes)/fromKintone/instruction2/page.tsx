"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Instruction2() {
  const t = useTranslations("KintoneINstruction2");
  const fields = [
    "kintoneUrl",
    "kintoneToken",
    "given_name",
    "family_name",
    "email",
    "phone_number",
  ];

  return (
    <div>
      <div className="flex justify-between mb-2.5">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
      </div>
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-medium">{t("docs")}</h1>
          <p>{t("description")}</p>
        </CardHeader>
        <CardContent>
          <h2 className="text-2xl">{t("subheading")}</h2>
          {fields.map((field) => (
            <div key={field} className="space-y-2 mt-4">
              <span className="text-xl ">{t(`fields.${field}`)}</span>
              <ul>
                <li>
                  <b>{t("purpose")}</b>
                  {t(`p.${field}`)}
                </li>
                <li>
                  <b>{t("input")}</b>
                  {t(`i.${field}`)}
                </li>
                <li>
                  <b>{t("example")}</b>
                  {t(`e.${field}`)}
                </li>
                <li>
                  <b>{t("note")}</b>
                  {t(`n.${field}`)}
                </li>
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
