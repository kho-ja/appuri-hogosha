"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import { useTranslations } from "next-intl";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { CircleCheckBig, CircleX } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useForm as useHookForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const forgotSchema = z.object({
  email: z.string().email(),
  code: z.string(),
  newPassword: z.string(),
  confirmPassword: z.string(),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const t = useTranslations("ForgotPasswordPage");
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const passwordRequirements = [
    {
      text: t("8CharacterMinimum") || "8-character minimum length",
      test: (pw: string) => pw.length >= 8,
    },
    {
      text: t("ContainsNumber") || "Contains at least 1 number",
      test: (pw: string) => /\d/.test(pw),
    },
    {
      text: t("ContainsLowercase") || "Contains at least 1 lowercase letter",
      test: (pw: string) => /[a-z]/.test(pw),
    },
    {
      text: t("ContainsUppercase") || "Contains at least 1 uppercase letter",
      test: (pw: string) => /[A-Z]/.test(pw),
    },
    {
      text: t("ContainsSpecialChar") || "Contains at least 1 special character",
      subText: `^ $ * . { } ( ) ? \" ! @ # % & / \\ > < ' : ; | _ ~ \` + = `,
      test: (pw: string) => /[\^$*.[\]{}()?"!@#%&/\\><':;|_~`+=]/.test(pw),
    },
  ];

  function getPasswordStrength(password: string) {
    const passedRequirements = passwordRequirements.filter((req) =>
      req.test(password)
    ).length;
    if (passedRequirements === passwordRequirements.length)
      return { label: t("Strong"), color: "text-green-600" };
    if (passedRequirements >= 3)
      return { label: t("Medium"), color: "text-yellow-600" };
    return { label: t("Weak"), color: "text-red-600" };
  }

  function isPasswordValid(password: string) {
    return passwordRequirements.every((req) => req.test(password));
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // RHF
  const form = useHookForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: "",
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  // Custom validation for step logic (in addition to zod)
  function stepValidate(values: ForgotForm) {
    const errors: Partial<Record<keyof ForgotForm, string>> = {};
    if (step === 1) {
      if (!values.email || !isValidEmail(values.email)) {
        errors.email = t("InvalidEmailFormat");
      }
    } else {
      if (!values.code || values.code.length !== 6) {
        errors.code = t("EnterVerificationCode");
      }
      if (!values.newPassword || !isPasswordValid(values.newPassword)) {
        errors.newPassword =
          t("PasswordRequirementsNotMet") || t("PasswordTooWeak");
      }
      if (
        values.confirmPassword !== values.newPassword ||
        !values.confirmPassword
      ) {
        errors.confirmPassword = t("PasswordsDoNotMatch");
      }
    }
    return errors;
  }

  const initiateMutation = useApiMutation<
    { message: string },
    { email: string }
  >("forgot-password-initiate", "POST", [], {
    onSuccess: (data) => {
      toast({ title: t("VerificationSent"), description: data.message });
      setStep(2);
      form.reset({
        email: form.getValues("email"),
        code: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error) => {
      toast({
        title: t("Error"),
        description: error?.message || t("VerificationSendError"),
        variant: "destructive",
      });
    },
  });

  const confirmMutation = useApiMutation<
    { message: string },
    { email: string; verification_code: string; new_password: string }
  >("forgot-password-confirm", "POST", [], {
    onSuccess: (data) => {
      toast({ title: t("PasswordChanged"), description: data.message });
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    },
    onError: (error) => {
      toast({
        title: t("Error"),
        description: error?.message || t("ResetPasswordError"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    const errors = stepValidate(values);
    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([key, message]) => {
        form.setError(key as keyof ForgotForm, {
          type: "manual",
          message,
        });
      });
      return;
    }

    if (step === 1) {
      await initiateMutation.mutateAsync({ email: values.email });
    } else {
      await confirmMutation.mutateAsync({
        email: values.email,
        verification_code: values.code,
        new_password: values.newPassword,
      });
    }
  });

  const passwordStrength = getPasswordStrength(form.watch("newPassword"));
  const passwordsMatch =
    form.watch("newPassword") === form.watch("confirmPassword") &&
    form.watch("confirmPassword").length > 0;
  const validEmail = isValidEmail(form.watch("email"));
  const isValidPassword = isPasswordValid(form.watch("newPassword"));

  return (
    <div className="min-h-screen flex items-center justify-center ">
      <Card className="w-full max-w-md shadow-lg rounded-2xl border ">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold ">
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          {t("emailLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder={t("emailPlaceholder")}
                          />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={initiateMutation.isPending || !validEmail}
                  >
                    {t("SendVerificationCode")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* OTP (do NOT replace with RHF) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t("VerificationCodeLabel")}
                    </Label>
                    <InputOTP
                      maxLength={6}
                      value={form.watch("code")}
                      onChange={(val: string) => {
                        if (/^\d*$/.test(val)) {
                          form.setValue("code", val, { shouldValidate: true });
                        }
                      }}
                      className="justify-center"
                      onBlur={() => form.trigger("code")}
                    >
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <FormMessage>
                      {form.formState.errors.code?.message}
                    </FormMessage>
                  </div>

                  {/* New Password */}
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          {t("newPasswordLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder={t("newPasswordPlaceholder")}
                            onFocus={() => setIsPasswordFocused(true)}
                            onBlurCapture={() => setIsPasswordFocused(false)}
                          />
                        </FormControl>
                        {form.watch("newPassword") && (
                          <p className={`text-sm ${passwordStrength.color}`}>
                            {t("PasswordStrength")}: {passwordStrength.label}
                          </p>
                        )}
                        {isPasswordFocused && form.watch("newPassword") && (
                          <div className="absolute left-0 bottom-[120%] translate-y-0 shadow-lg rounded-md border-border border-2 w-full text-foreground z-50">
                            <div className="relative z-50 bg-muted p-3 rounded-sm">
                              <div className="text-sm font-medium mb-2">
                                {t("PasswordRequirements") ||
                                  "Password Requirements"}
                                :
                              </div>
                              {passwordRequirements.map((req, index) => (
                                <div key={index} className="flex items-start mb-1">
                                  {req.test(form.watch("newPassword")) ? (
                                    <span className="text-green-500 mt-0.5">
                                      <CircleCheckBig className="w-4 h-4" />
                                    </span>
                                  ) : (
                                    <span className="text-red-500 mt-0.5">
                                      <CircleX className="w-4 h-4" />
                                    </span>
                                  )}
                                  <span className="ml-2 text-xs">
                                    {req.text}
                                    {req.subText && (
                                      <div className="text-muted-foreground mt-1">
                                        {req.subText}
                                      </div>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="absolute left-6 p-[2px] rounded-sm -bottom-[10px] -z-20 rotate-[-45deg] bg-border">
                              <div className="w-0 h-0 border-solid border-t-[20px] border-l-[20px] border-transparent border-l-muted rounded-sm"></div>
                            </div>
                          </div>
                        )}
                        <FormMessage>
                          {fieldState.error?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Confirm Password */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          {t("confirmPasswordLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder={t("confirmPasswordPlaceholder")}
                          />
                        </FormControl>
                        <FormMessage>
                          {fieldState.error?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Reset Button */}
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={
                      confirmMutation.isPending ||
                      !form.watch("code") ||
                      form.watch("code").length !== 6 ||
                      !form.watch("newPassword") ||
                      !passwordsMatch ||
                      !isValidPassword
                    }
                  >
                    {t("ResetPassword")}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}