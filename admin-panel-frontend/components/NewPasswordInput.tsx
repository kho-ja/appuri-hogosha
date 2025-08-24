"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleCheckBig, CircleX } from "lucide-react";

interface NewPasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export default function NewPasswordInput({
  value,
  onChange,
  error,
}: NewPasswordInputProps) {
  const t = useTranslations("LoginForm");
  const [isFocused, setIsFocused] = useState(false);

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
      subText: `^ $ * . { } ( ) ? \" ! @ # % & / \\ > < ' : ; | _ ~ \` + = `,
      test: (pw: string) => /[\^$*.[\]{}()?"!@#%&/\\><':;|_~`+=]/.test(pw),
    },
  ];

  const isValid = () => {
    return requirements.every((req) => req.test(value));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center">
        <Label htmlFor="newPassword">{t("newPasswordLabel")}</Label>
      </div>
      <div
        className="relative space-y-4"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <Input
          id="newPassword"
          type="password"
          name="newPassword"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <div className="text-red-500">{t("OTPError")}</div>
        {isFocused && (
          <div className="absolute left-0 bottom-[130%] translate-y-0 shadow-lg rounded-md border-border border-2 w-full text-foreground">
            <div className="relative z-50 bg-muted p-2 rounded-sm ">
              <div>{t("requirements")}</div>
              {requirements.map((req, index) => (
                <div key={index} className="flex items-start">
                  {req.test(value) ? (
                    <span className="text-green-500">
                      <CircleCheckBig className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="text-red-500">
                      <CircleX className="w-4 h-4" />
                    </span>
                  )}
                  <span className="ml-1 text-xs">
                    {req.text} <br /> {req.subText ? `${req.subText}` : ""}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute right-6 p-[2px] rounded-sm -bottom-[10px] -z-20 rotate-[-45deg] bg-border">
              <div className="w-0 h-0 border-solid border-t-[20px] border-l-[20px] border-transparent border-l-muted rounded-sm"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the validation function for use in the parent component
export const validateNewPassword = (password: string) => {
  const requirements = [
    (pw: string) => pw.length >= 8,
    (pw: string) => /\d/.test(pw),
    (pw: string) => /[a-z]/.test(pw),
    (pw: string) => /[A-Z]/.test(pw),
    (pw: string) => /[\^$*.[\]{}()?"!@#%&/\\><':;|_~`+=]/.test(pw),
  ];

  return requirements.every((req) => req(password));
};
