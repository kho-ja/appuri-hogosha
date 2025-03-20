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
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { login } from "@/login";
import LanguageSelect from "@/components/LanguageSelect";
import { ToggleMode } from "@/components/toggle-mode";
import { useToast } from "@/components/ui/use-toast";
import "./auth.css";
import { CircleCheckBig, CircleX } from "lucide-react";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<boolean>(false);
  const router = useRouter();
  const t = useTranslations("LoginForm");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError(null);
    toast({
      title: t("LoggingIn"),
      description: t("wait"),
    });

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const newPassword = (formData.get("newPassword") ?? "") as string;

    try {
      const response = await login(email, password, newPassword);

      if (typeof response === "string") {
        router.push("/");
        toast({
          title: t("loginSuccess"),
          description: t("loginSuccessDescription"),
        });
      } else {
        if (response.error === "InvalidCredentialsError") {
          setError("InvalidCredentialsError");
          toast({
            title: t("loginFailed"),
            description: t("InvalidCredentialsError"),
            variant: "destructive",
          });

          if (newPassword) {
            setNewPasswordError(response.error);
          }
        } else if (response.error === "OTPError") {
          setError("OTPError");
          toast({
            title: t("loginFailed"),
            description: t("OTPError"),
            variant: "destructive",
          });
          setNewPassword(true);
        } else {
          setError("AuthError");
          toast({
            title: t("loginFailed"),
            description: t("AuthError"),
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Login failed", error);
      setError("AuthError");
    }
  };

  const [password2, setPassword2] = useState("");
  const requirements = [
    {
      text: t("8-character minimum length"),
      test: (pw: string) => pw.length >= 8,
    },
    {
      text: t("Contains at least 1 number"),
      test: (pw: string) => /\d/.test(pw),
    },
    {
      text: t("Contains at least 1 lowercase letter"),
      test: (pw: string) => /[a-z]/.test(pw),
    },
    {
      text: t("Contains at least 1 uppercase letter"),
      test: (pw: string) => /[A-Z]/.test(pw),
    },
    {
      text: t("Contains at least 1 special character"),
      text2: `^ $ * . { } ( ) ? \" ! @ # % & / \\ > < ' : ; | _ ~ \` + = `,
      test: (pw: string) => /[\^$*.[\]{}()?"!@#%&/\\><':;|_~`+=]/.test(pw),
    },
  ];

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
            {error && <div className="text-red-500">{t(error)}</div>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{t("emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder={t("emailPlaceholder")}
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">{t("passwordLabel")}</Label>
                  <Link
                    href="#"
                    className="ml-auto inline-block text-sm underline"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <Input id="password" type="password" name="password" required />
                {newPasswordError && (
                  <div className="text-red-500 text-sm">{newPasswordError}</div>
                )}
              </div>
              {/* {newPassword && ( */}
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="newPassword">{t("newPasswordLabel")}</Label>
                </div>
                <div className="inputFocusContainer relative">
                  <Input
                    id="newPassword"
                    type="password"
                    name="newPassword"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                  />
                  {requirements ? (
                    <div className="inputFocusDiv transparent absolute border-[2px] rounded-md shadow-lg border-white bottom-[160%] left-[0%] translate-y-[-0%]">
                      <div className="w-full h-full z-10 relative bg-[#222222] p-2 rounded-md flex flex-col gap-1">
                        <div>{t("requirements")}</div>
                        {requirements.map((req, index) => (
                          <div key={index} className="flex items-start">
                            {req.test(password2) ? (
                              <span className="text-green-500">
                                <CircleCheckBig className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="text-red-500">
                                <CircleX className="w-4 h-4" />
                              </span>
                            )}
                            <span className="ml-1 text-xs">
                              {req.text} <br />{" "}
                              {req.text2 ? `${req.text2}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="inputDivTriangleHead z-2 absolute right-6">
                        <div className="w-0 h-0 inputDivTriangle"></div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              {/* )} */}
              {newPassword ? (
                <Button type="submit" className="w-full" disabled={requirements.map(req => req.test(password2)).some(r => !r)}>
                  {t("loginButton")}
                </Button>
              ) : (
                <Button type="submit" className="w-full">
                  {t("loginButton")}
                </Button>
              )}
              <Button variant="outline" className="w-full">
                {t("loginWithGoogle")}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              {t("noAccount")}{" "}
              <Link href="#" className="underline">
                {t("signUp")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
