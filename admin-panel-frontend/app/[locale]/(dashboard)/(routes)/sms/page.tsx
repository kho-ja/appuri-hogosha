"use client";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { EllipsisVertical } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Link, useRouter } from "@/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import TableApi from "@/components/TableApi";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import useSMSMutation from "@/lib/useSMSMutation";
import SMS from "@/types/sms";
import { FormatDateTime } from "@/lib/utils";

// Test data
const testSMSData: SMS[] = [
  {
    id: 1,
    title: "Welcome",
    description: "Welcome to our service",
    message: "Welcome to our service! We're glad to have you on board.",
    recipient: "+1234567890",
    status: "sent",
    sent_at: "2023-05-01T10:00:00Z",
  },
  {
    id: 2,
    title: "Reminder",
    description: "Appointment reminder",
    message: "Don't forget your appointment tomorrow at 2 PM.",
    recipient: "+1987654321",
    status: "delivered",
    sent_at: "2023-05-02T09:30:00Z",
  },
  {
    id: 3,
    title: "Promotion",
    description: "Special offer",
    message: "Exclusive offer for you: 20% off on all products this weekend!",
    recipient: "+1122334455",
    status: "sent",
    sent_at: "2023-05-03T14:15:00Z",
  },
  {
    id: 4,
    title: "Update",
    description: "Service update notification",
    message: "Our system will be under maintenance from 2 AM to 4 AM tomorrow.",
    recipient: "+1567890123",
    status: "failed",
    sent_at: "2023-05-04T18:45:00Z",
  },
  {
    id: 5,
    title: "Confirmation",
    description: "Order confirmation",
    message:
      "Your order #12345 has been confirmed and will be shipped within 2 business days.",
    recipient: "+1345678901",
    status: "delivered",
    sent_at: "2023-05-05T11:20:00Z",
  },
];

export default function SMSPage() {
  const t = useTranslations("sms");
  // Static test data for now; pagination/search state removed as unused
  const data = {
    sms: testSMSData,
    pagination: {
      current_page: 2,
      prev_page: 1,
      next_page: 3,
      links: ["1", "2", "3"],
    },
  };
  // Base path constant (was derived via usePathname previously)
  const pathName = "/sms";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [smsId, setSmsId] = useState<number | null>(null);
  const { mutate } = useSMSMutation<{ message: string }>(smsId, "DELETE", {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sms"] });
      toast({
        title: t("smsDeleted"),
        description: data?.message,
      });
    },
  });

  const smsColumns: ColumnDef<SMS>[] = [
    {
      accessorKey: "title",
      header: t("Title"),
    },
    {
      accessorKey: "description",
      header: t("Description"),
    },
    {
      accessorKey: "sent_at",
      header: t("Sent_at"),
      cell: ({ row }) => {
        const value = row.getValue("sent_at");
        if (!value) return "-";
        return FormatDateTime(value as string);
      },
    },
    {
      id: "actions",
      header: t("actions"),
      meta: {
        notClickable: true,
      },
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Dialog>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger>
                <EllipsisVertical className="h-5 w-5 cursor-pointer" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`${pathName}/${row.original.id}`)}
                >
                  {t("view")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`${pathName}/edit/${row.original.id}`)
                  }
                >
                  {t("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <DialogTrigger className="w-full">
                    {t("delete")}
                  </DialogTrigger>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t("Delete SMS")}</DialogTitle>
                <DialogDescription>
                  {t("Are you sure you want to delete this SMS?")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p>{row.original.title}</p>
                <p>{row.original.description}</p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant={"secondary"}>{t("cancel")}</Button>
                </DialogClose>
                <Button
                  type="submit"
                  onClick={() => {
                    setSmsId(row.original.id);
                    mutate();
                  }}
                >
                  {t("delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="w-full flex justify-between">
        <h1 className="text-3xl w-2/4 font-bold">{t("SMS")}</h1>
        <Link href={`${pathName}/create`} passHref>
          <Button>{t("CreateSMS")}</Button>
        </Link>
      </div>
      <div className="flex justify-between">
        {/* Filter and pagination controls removed because state was unused */}
        <div />
        <div />
      </div>
      <Card>
        <TableApi
          linkPrefix="/sms"
          data={data?.sms ?? null}
          columns={smsColumns}
        />
      </Card>
    </div>
  );
}
