"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useRouter } from "@/navigation";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import NotFound from "@/components/NotFound";
import useApiQuery from "@/lib/useApiQuery";
import useApiMutation from "@/lib/useApiMutation";
import { Dialog, DialogDescription } from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ScheduledPost from "@/types/scheduledPost";
import { DateTimePicker24h } from "@/components/DateTimePicker24h";
import { scheduledPostEditSchema } from "@/lib/validationSchemas";

const formSchema = scheduledPostEditSchema;

export default function SendMessagePage({
  params: { messageId },
}: {
  params: { messageId: string };
}) {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("sendmessage");
  const [image, setImage] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isImageUploading, setIsImageUploading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "low",
      image: "",
      scheduled_at: "",
    },
  });
  const router = useRouter();
  const { data, isLoading, isError } = useApiQuery<{
    post: ScheduledPost;
  }>(`schedule/each/${messageId}`, ["message", messageId]);

  const { mutate, isPending } = useApiMutation<{ message: string }>(
    `schedule/${messageId}`,
    "PUT",
    ["editMessage", messageId],
    {
      onSuccess: (data) => {
        toast({
          title: t("messageEdited"),
          description: data?.message,
        });
        form.reset();
        router.push(`/messages/scheduled-message/${messageId}`);
      },
    }
  );
  const uploadImageMutation = useApiMutation<
    { image: string },
    { image: string }
  >(`post/image`, "POST", ["postImage"], {
    onSuccess: (data) => {
      form.setValue("image", data.image, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setImage(data.image);
      setImagePreview("");
    },
    onSettled: () => {
      setIsImageUploading(false);
      toast({
        title: "Image upload finished",
      });
    },
  });

  useEffect(() => {
    if (data) {
      setImage(data.post.image || "");
      setImagePreview("");
      form.reset({
        title: data.post.title,
        description: data.post.description,
        priority: data.post.priority as "high" | "medium" | "low",
        image: data.post.image || "",
        scheduled_at: data.post.scheduled_at
          ? new Date(data.post.scheduled_at).toISOString()
          : "",
      });
    }
  }, [data, form]);

  const handleRemoveImg = (e: any) => {
    e.preventDefault();
    if (data) {
      setImage("");
      setImagePreview("");
      form.reset({
        title: data.post.title,
        description: data.post.description,
        priority: data.post.priority as "high" | "medium" | "low",
        image: "",
        scheduled_at: data.post.scheduled_at
          ? new Date(data.post.scheduled_at).toISOString()
          : "",
      });
    }
  };

  if (isError) return <NotFound />;

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => {
            mutate({
              title: values.title,
              description: values.description,
              priority: values.priority,
              image: values.image,
              scheduled_at: values.scheduled_at,
            } as any);
          })}
          className="space-y-4"
        >
          <PageHeader title={t("editMessage")}>
            <BackButton href={`/messages/scheduled-message/${messageId}`} />
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
                render={() => (
                  <FormItem>
                    <FormLabel>{t("picture")}</FormLabel>
                    <FormControl className="cursor-pointer">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            setIsImageUploading(true);
                            reader.onloadend = () => {
                              const result = reader.result;
                              if (typeof result !== "string") {
                                setIsImageUploading(false);
                                return;
                              }
                              setImagePreview(result);
                              form.setValue("image", "", {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              uploadImageMutation.mutate(
                                { image: result },
                                {
                                  onError: () => {
                                    setImagePreview("");
                                  },
                                }
                              );
                            };
                            reader.onerror = () => {
                              setIsImageUploading(false);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {imagePreview && (
                      <div className="mt-2">
                        <Image
                          src={imagePreview}
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

          <FormField
            control={form.control}
            name="scheduled_at"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("scheduledAt")}</FormLabel>
                <FormControl>
                  <DateTimePicker24h
                    value={field.value ? new Date(field.value) : null}
                    onChange={(date) => {
                      // To'liq ISO string saqlang
                      field.onChange(date ? date.toISOString() : "");
                    }}
                  />
                </FormControl>
                <FormMessage>
                  {formState.errors.scheduled_at &&
                    "You must select a scheduled date and time"}
                </FormMessage>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            isLoading={isPending || isLoading || isImageUploading}
            disabled={isPending || isLoading || isImageUploading}
          >
            {t("editMessage")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
