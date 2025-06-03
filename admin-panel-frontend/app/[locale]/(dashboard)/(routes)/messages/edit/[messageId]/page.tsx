"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "@/navigation";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
import Post from "@/types/post";
import useApiMutation from "@/lib/useApiMutation";
import { Dialog, DialogDescription } from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  image: z.string().optional(),
});

export default function SendMessagePage({
  params: { messageId },
}: {
  params: { messageId: string };
}) {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("sendmessage");
  const [image, setImage] = useState<String>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "low",
      image: "",
    },
  });
  const router = useRouter();
  const { data, isLoading, isError } = useApiQuery<{
    post: Post;
  }>(`post/${messageId}`, ["message", messageId]);

  const { mutate, isPending } = useApiMutation<{ message: string }>(
    `post/${messageId}`,
    "PUT",
    ["editMessage", messageId],
    {
      onSuccess: (data) => {
        toast({
          title: t("messageEdited"),
          description: data?.message,
        });
        form.reset();
        router.push(`/messages/${messageId}`);
      },
    }
  );
  const priority = form.watch("priority");

  useEffect(() => {
    form.setValue("priority", priority);
  }, [priority, form]);

  useEffect(() => {
    if (data) {
      setImage(data.post.image || "");
      form.reset({
        title: data.post.title,
        description: data.post.description,
        priority: data.post.priority as "high" | "medium" | "low",
        image: data.post.image || "",
      });
    }
  }, [data, form]);

  const handleRemoveImg = (e: any) => {
    e.preventDefault();
    if (data) {
      setImage("");
      form.reset({
        title: data.post.title,
        description: data.post.description,
        priority: data.post.priority as "high" | "medium" | "low",
        image: "",
      });
    }
  };

  if (isError) return <NotFound />;

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => mutate(values as any))}
          className="space-y-4"
        >
          <PageHeader title={t("editMessage")}>
            <BackButton href={`/messages/${messageId}`} />
          </PageHeader>

          <FormField
            control={form.control}
            name="title"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("title")}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t("typeTitle")} />
                </FormControl>
                <FormMessage>
                  {formState.errors.title &&
                    "Title is required. Title should be more than 5 characters"}
                </FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("yourMessage")}</FormLabel>
                <FormControl>
                  <Textarea placeholder={t("typeMessage")} {...field} />
                </FormControl>
                <FormMessage>
                  {formState.errors.description &&
                    "Message is required. Message should be more than 10 characters"}
                </FormMessage>
              </FormItem>
            )}
          />

          <div className="inline-block">
            {image ? (
              <>
                <Label
                  htmlFor="image"
                  className="text-sm font-medium text-foreground-secondary inline-block mb-2"
                >
                  {t("picture")}
                </Label>
                <Card className="p-0">
                  <div id="image">
                    {data?.post?.image && (
                      <div className="">
                        <Dialog>
                          <div className="relative p-4">
                            <DialogTrigger>
                              <Image
                                src={`/${data?.post?.image}`}
                                alt={data.post.title}
                                width={200}
                                height={100}
                                className="rounded object-cover"
                              />
                            </DialogTrigger>
                            <Button
                              onClick={(e) => handleRemoveImg(e)}
                              className="absolute top-0 right-0 translate-x-[50%] -translate-y-[50%] p-0 aspect-square rounded-full bg-muted border border-foreground"
                            >
                              <Trash2 className="h-5 w-5 text-red-500 font-bold" />
                            </Button>
                          </div>
                          <DialogContent>
                            <DialogTitle className="whitespace-pre-wrap text-center">
                              {data?.post?.title}
                            </DialogTitle>
                            <DialogDescription className="flex flex-col justify-center items-center">
                              <Image
                                src={`/${data?.post?.image}`}
                                alt={data?.post?.title}
                                width={window.innerWidth > 800 ? 800 : 300}
                                height={window.innerWidth > 800 ? 400 : 300}
                                className="rounded object-cover"
                              />
                            </DialogDescription>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("picture")}</FormLabel>
                    <FormControl className="cursor-pointer">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            field.onChange(file.name); // Save file name
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              form.setValue("image", reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {form.getValues("image") && (
                      <div className="mt-2">
                        <Image
                          src={field.value ?? ""}
                          alt="Selected image"
                          width={200}
                          height={200}
                          className="rounded object-cover"
                        />
                      </div>
                    )}
                  </FormItem>
                )}
              />
            )}
          </div>

          <FormField
            control={form.control}
            name="priority"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("choosePriority")}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high">{t("high")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium">{t("medium")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low">{t("low")}</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage>
                  {formState.errors.priority &&
                    "You should select one priority"}
                </FormMessage>
              </FormItem>
            )}
          />

          <Button type="submit" isLoading={isPending || isLoading}>
            {t("editMessage")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
