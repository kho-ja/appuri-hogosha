"use client";
import { Link, useRouter } from "@/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { login } from "@/login";
import LanguageSelect from "@/components/LanguageSelect";
import { ToggleMode } from "@/components/toggle-mode";
import { useToast } from "@/components/ui/use-toast";
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
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import NewPasswordInput, {
  validateNewPassword,
} from "@/components/NewPasswordInput";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default function LoginForm() {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);

  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<boolean>(false);
  const router = useRouter();
  const t = useTranslations("LoginForm");
  const { toast } = useToast();
  const [feedbackPassword, setFeedbackPassword] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    toast({
      title: t("LoggingIn"),
      description: t("wait"),
    });

    const { email, password } = values;
    const newPasswordValue = newPassword ? feedbackPassword : "";

    try {
      const response = await login(email, password, newPasswordValue);

      if (typeof response === "string") {
        router.push("/");
        toast({
          title: t("loginSuccess"),
          description: t("loginSuccessDescription"),
        });
      } else {
        if (response.error === "InvalidCredentialsError") {
          toast({
            title: t("loginFailed"),
            description: t("InvalidCredentialsError"),
            variant: "destructive",
          });

          if (newPassword) {
            setNewPasswordError(response.error);
          }
        } else if (response.error === "OTPError") {
          toast({
            title: t("loginNewPassword"),
            description: t("OTPError"),
          });
          setNewPassword(true);
        } else {
          toast({
            title: t("loginFailed"),
            description: t("AuthError"),
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="grid content-center place-items-center min-h-screen w-full gap-5 p-4">
        <div className="flex gap-2">
          <LanguageSelect />
          <ToggleMode />
        </div>
        <Card className="mx-auto max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="grid gap-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("emailLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("emailPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center">
                        <FormLabel>{t("passwordLabel")}</FormLabel>
                        <Link
                          href="/forgot-password"
                          className="ml-auto inline-block text-sm underline"
                        >
                          {t("forgotPassword")}
                        </Link>
                      </div>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                      {newPasswordError && (
                        <div className="text-red-500 text-sm">
                          {newPasswordError}
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                {newPassword && (
                  <NewPasswordInput
                    value={feedbackPassword}
                    onChange={setFeedbackPassword}
                    error={newPasswordError}
                  />
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    newPassword && !validateNewPassword(feedbackPassword)
                  }
                >
                  {t("loginButton")}
                </Button>
                <Button variant="outline" className="w-full">
                  {t("loginWithGoogle")}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
