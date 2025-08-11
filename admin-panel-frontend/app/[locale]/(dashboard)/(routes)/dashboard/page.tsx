"use client";

import { useTranslations } from "next-intl";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/navigation";

type CardData = {
  id: number;
  title: string;
  description: string;
  href: string;
};

const cardData: CardData[] = [
  {
    id: 1,
    title: "Messages",
    description: "click here to view messages",
    href: "/messages",
  },
  {
    id: 2,
    title: "Students",
    description: "click here to view students",
    href: "/students",
  },
  {
    id: 4,
    title: "Groups",
    description: "click here to view groups",
    href: "/groups",
  },
  {
    id: 3,
    title: "Parents",
    description: "click here to view parents",
    href: "/parents",
  },
  {
    id: 5,
    title: "Admins",
    description: "click here to view admins",
    href: "/admins",
  },
];

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  return (
    <div className="space-y-4">
      <div className="flex flex-row">
        <h1 className="text-3xl w-2/4 font-bold">{t("Dashboard")}</h1>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 2xl:grid-cols-6">
        {cardData.map((data) => (
          <Card key={data.id} className="w-full h-full rounded">
            <Link
              href={data.href}
              className="block w-full h-full transition-colors duration-300 hover:shadow-lg hover:bg-muted rounded focus:shadow-lg focus:bg-muted focus:ring-2 focus:ring-primary outline-none"
            >
              <CardHeader className="p-3">
                <CardTitle className="text-3xl font-medium break-words">
                  {t(data.title)}
                </CardTitle>
              </CardHeader>
              <CardFooter className="px-3">
                <p className="text-xs text-muted-foreground">
                  {t(data.description)}
                </p>
              </CardFooter>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
