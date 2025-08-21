"use client";

import { useState } from "react";
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

export default function ForgotPasswordPage() {
  const t = useTranslations("ForgotPasswordPage");
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  function getPasswordStrength(password: string) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score >= 5) return { label: t("Strong"), color: "text-green-600" };
    if (score >= 3) return { label: t("Medium"), color: "text-yellow-600" };
    return { label: t("Weak"), color: "text-red-600" };
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch =
    newPassword === confirmPassword && confirmPassword.length > 0;
  const validEmail = isValidEmail(email);

  const initiateMutation = useApiMutation<
    { message: string },
    { email: string }
  >("forgot-password-initiate", "POST", [], {
    onSuccess: (data) => {
      toast({ title: t("VerificationSent"), description: data.message });
      setStep(2);
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
    },
    onError: (error) => {
      toast({
        title: t("Error"),
        description: error?.message || t("ResetPasswordError"),
        variant: "destructive",
      });
    },
  });

  const handleInitiate = () => {
    if (!validEmail) {
      toast({
        title: t("InvalidEmail"),
        description: t("EnterValidEmail"),
        variant: "destructive",
      });
      return;
    }
    initiateMutation.mutate({ email });
  };

  const handleConfirm = () => {
    if (code.length !== 6) {
      toast({
        title: t("Error"),
        description: t("EnterVerificationCode"),
        variant: "destructive",
      });
      return;
    }
    if (!passwordsMatch) {
      toast({
        title: t("Error"),
        description: t("PasswordsDoNotMatch"),
        variant: "destructive",
      });
      return;
    }
    if (passwordStrength.label === t("Weak")) {
      toast({
        title: t("Error"),
        description: t("PasswordTooWeak"),
        variant: "destructive",
      });
      return;
    }
    confirmMutation.mutate({
      email,
      verification_code: code,
      new_password: newPassword,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center ">
      <Card className="w-full max-w-md shadow-lg rounded-2xl border ">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold ">
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {!validEmail && email.length > 3 && (
                  <p className="text-sm text-red-600">
                    {t("InvalidEmailFormat")}
                  </p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={handleInitiate}
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
                  value={code}
                  onChange={(val) => {
                    if (/^\d*$/.test(val)) {
                      setCode(val);
                    }
                  }}
                  className="justify-center"
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  {t("newPasswordLabel")}
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder={t("newPasswordPlaceholder")}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordTouched(true);
                  }}
                  onBlur={() => setPasswordTouched(true)}
                />
                {passwordTouched && newPassword && (
                  <p className={`text-sm ${passwordStrength.color}`}>
                    {t("PasswordStrength")}: {passwordStrength.label}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  {t("confirmPasswordLabel")}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-red-600">
                    {t("PasswordsDoNotMatch")}
                  </p>
                )}
              </div>

              {/* Reset Button */}
              <Button
                className="w-full"
                onClick={handleConfirm}
                disabled={
                  confirmMutation.isPending ||
                  code.length !== 6 ||
                  !newPassword ||
                  !passwordsMatch ||
                  passwordStrength.label === t("Weak")
                }
              >
                {t("ResetPassword")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
