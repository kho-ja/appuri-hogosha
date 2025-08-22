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

type ForgotForm = {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
};

type ForgotFormErrors = Partial<Record<keyof ForgotForm, string>>;

function useForm<T extends Record<string, any>>(opts: {
  defaultValues: T;
  validate: (values: T) => ForgotFormErrors;
  onSubmit: (values: T) => void | Promise<void>;
}) {
  const [values, setValues] = useState<T>(opts.defaultValues);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [errors, setErrors] = useState<ForgotFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof T) => (e: any) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
  };

  const handleOTPChange = (val: string) => {
    setValues((v) => ({ ...v, code: val }));
  };

  const handleBlur = (field: keyof T) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(opts.validate(values));
  };

  const validateForm = () => {
    const errs = opts.validate(values);
    setErrors(errs);
    return errs;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTouched(
      Object.keys(values).reduce((acc, k) => ({ ...acc, [k]: true }), {})
    );
    const errs = validateForm();
    if (Object.keys(errs).length === 0) {
      setIsSubmitting(true);
      try {
        await opts.onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return {
    values,
    setValues,
    errors,
    touched,
    handleChange,
    handleOTPChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    validateForm,
    setTouched,
    setErrors,
  };
}

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

  const form = useForm<ForgotForm>({
    defaultValues: {
      email: "",
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: (values) => {
      const errors: ForgotFormErrors = {};
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
    },
    onSubmit: async (values) => {
      if (step === 1) {
        await initiateMutation.mutateAsync({ email: values.email });
      } else {
        await confirmMutation.mutateAsync({
          email: values.email,
          verification_code: values.code,
          new_password: values.newPassword,
        });
      }
    },
  });

  const initiateMutation = useApiMutation<
    { message: string },
    { email: string }
  >("forgot-password-initiate", "POST", [], {
    onSuccess: (data) => {
      toast({ title: t("VerificationSent"), description: data.message });
      setStep(2);
      form.setValues((v) => ({
        ...v,
        code: "",
        newPassword: "",
        confirmPassword: "",
      }));
      form.setTouched({});
      form.setErrors({});
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

  const passwordStrength = getPasswordStrength(form.values.newPassword);
  const passwordsMatch =
    form.values.newPassword === form.values.confirmPassword &&
    form.values.confirmPassword.length > 0;
  const validEmail = isValidEmail(form.values.email);
  const isValidPassword = isPasswordValid(form.values.newPassword);

  return (
    <div className="min-h-screen flex items-center justify-center ">
      <Card className="w-full max-w-md shadow-lg rounded-2xl border ">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold ">
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit} className="space-y-4">
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    {t("emailLabel")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    value={form.values.email}
                    onChange={form.handleChange("email")}
                    onBlur={form.handleBlur("email")}
                  />
                  {form.touched.email && form.errors.email && (
                    <p className="text-sm text-red-600">{form.errors.email}</p>
                  )}
                </div>
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
                {/* OTP */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t("VerificationCodeLabel")}
                  </Label>
                  <InputOTP
                    maxLength={6}
                    value={form.values.code}
                    onChange={(val: string) => {
                      if (/^\d*$/.test(val)) {
                        form.handleOTPChange(val);
                      }
                    }}
                    className="justify-center"
                    onBlur={form.handleBlur("code")}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {form.touched.code && form.errors.code && (
                    <p className="text-sm text-red-600">{form.errors.code}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">
                    {t("newPasswordLabel")}
                  </Label>
                  <div className="relative space-y-2">
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder={t("newPasswordPlaceholder")}
                      value={form.values.newPassword}
                      onChange={form.handleChange("newPassword")}
                      onBlur={form.handleBlur("newPassword")}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlurCapture={() => setIsPasswordFocused(false)}
                    />
                    {form.touched.newPassword && form.values.newPassword && (
                      <p className={`text-sm ${passwordStrength.color}`}>
                        {t("PasswordStrength")}: {passwordStrength.label}
                      </p>
                    )}
                    {isPasswordFocused && form.values.newPassword && (
                      <div className="absolute left-0 bottom-[120%] translate-y-0 shadow-lg rounded-md border-border border-2 w-full text-foreground z-50">
                        <div className="relative z-50 bg-muted p-3 rounded-sm">
                          <div className="text-sm font-medium mb-2">
                            {t("PasswordRequirements") ||
                              "Password Requirements"}
                            :
                          </div>
                          {passwordRequirements.map((req, index) => (
                            <div key={index} className="flex items-start mb-1">
                              {req.test(form.values.newPassword) ? (
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
                    {form.touched.newPassword && form.errors.newPassword && (
                      <p className="text-sm text-red-600">
                        {form.errors.newPassword}
                      </p>
                    )}
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                  >
                    {t("confirmPasswordLabel")}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t("confirmPasswordPlaceholder")}
                    value={form.values.confirmPassword}
                    onChange={form.handleChange("confirmPassword")}
                    onBlur={form.handleBlur("confirmPassword")}
                  />
                  {form.touched.confirmPassword &&
                    form.errors.confirmPassword && (
                      <p className="text-sm text-red-600">
                        {form.errors.confirmPassword}
                      </p>
                    )}
                </div>

                {/* Reset Button */}
                <Button
                  className="w-full"
                  type="submit"
                  disabled={
                    confirmMutation.isPending ||
                    !form.values.code ||
                    form.values.code.length !== 6 ||
                    !form.values.newPassword ||
                    !passwordsMatch ||
                    !isValidPassword
                  }
                >
                  {t("ResetPassword")}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
