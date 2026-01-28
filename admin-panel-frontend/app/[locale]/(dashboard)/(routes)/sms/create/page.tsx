"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import { smsCreateSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import RichTextEditor from "@/components/RichTextEditor";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import parse from "html-react-parser";

const formSchema = smsCreateSchema;

export default function CreateSMS() {
  const t = useTranslations("sms");
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: "",
      title: "",
      message: "",
      Cc: "",
      Bcc: "",
    },
  });

  const [isDialogOpen, setDialogOpen] = React.useState(false);

  const handleDialogToggle = () => setDialogOpen((prev) => !prev);

  const handleSubmit = (data: any) => {
    console.log("Form Data:", data);
    setDialogOpen(false); // Close dialog after submission
  };

  return (
    <div>
      <h1 className="text-3xl w-2/4 font-bold">{t("CreateSMS")}</h1>

      <Card className="mt-5">
        <CardHeader className="text-xl w-2/4 font-bold">
          {t("NewMessage")}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              {/* Recipient Field */}
              <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipient")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("typeRecipient")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CC Field */}
              <FormField
                control={form.control}
                name="Cc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Cc")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("typeRecipientCc")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* BCC Field */}
              <FormField
                control={form.control}
                name="Bcc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Bcc")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("typeRecipientBcc")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title Field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("title")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("typeTitle")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Message Field */}
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("message")}</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value || ""}
                        onChange={(value) => form.setValue("message", value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dialog */}
              <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger>
                  <Button
                    type="button"
                    onClick={handleDialogToggle}
                    className="mt-5"
                  >
                    Send
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Message</DialogTitle>
                  </DialogHeader>
                  <div>
                    <label
                      htmlFor="to"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {t("recipient")}:
                    </label>
                    <Input
                      id="to"
                      value={form.getValues("recipient")}
                      readOnly
                      className="mb-4"
                    />

                    <label
                      htmlFor="cc"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {t("Cc")}:
                    </label>
                    <Input
                      id="cc"
                      value={form.getValues("Cc")}
                      readOnly
                      className="mb-4"
                    />

                    <label
                      htmlFor="cc"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {t("Bcc")}:
                    </label>
                    <Input
                      id="cc"
                      value={form.getValues("Bcc")}
                      readOnly
                      className="mb-4"
                    />

                    <label
                      htmlFor="cc"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {t("title")}:
                    </label>
                    <Input
                      id="cc"
                      value={form.getValues("title")}
                      readOnly
                      className="mb-4"
                    />

                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Message:
                    </label>
                    <div className="border border-gray-40 rounded p-1.5 pl-3">
                      {parse(form.getValues("message"))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={form.handleSubmit(handleSubmit)}>
                      Send
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/*<Button type="submit" className="mt-4">*/}
              {/*  Submit*/}
              {/*</Button>*/}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
