"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const permissionsData = [
  {
    id: "message-operations",
    label: "Message Operations",
    permissions: [
      "View Messages",
      "Send Messages",
      "Delete Messages",
      "Edit Messages"
    ]
  },
  {
    id: "forms-actions",
    label: "Forms Actions",
    permissions: [
      "View Forms",
      "Submit Forms",
      "Edit Forms",
      "Delete Forms"
    ]
  },
  {
    id: "parents-actions",
    label: "Parents Actions",
    permissions: [
      "View Parent Information",
      "Add Parent Information",
      "Edit Parent Information",
      "Delete Parent Information"
    ]
  },
  {
    id: "group-actions",
    label: "Group Actions",
    permissions: [
      "View Groups",
      "Create Groups",
      "Edit Groups",
      "Delete Groups"
    ]
  },
  {
    id: "admin-actions",
    label: "Admin Actions",
    permissions: [
      "View Admin Dashboard",
      "Manage Users",
      "Manage Settings",
      "Generate Reports"
    ]
  },
  {
    id: "student-actions",
    label: "Student Actions",
    permissions: [
      "View Student Information",
      "Add Student Information",
      "Edit Student Information",
      "Delete Student Information"
    ]
  }
];

export default function Permissions() {
  const t = useTranslations("Permissions");

  return (
    <div>
      <h1>{t("title")}</h1>
      <div className="flex justify-end">
        <Button>{t("createRole")}</Button>
      </div>
      <div className="flex">
        <div className="w-full p-4 flex flex-col gap-5">
          <div className="flex w-full justify-between gap-5 pt-2.5">
            <div className="w-full">
              <Label htmlFor="fname">{t("firstName")}</Label>
              <Input
                type="text"
                id="fname"
                placeholder={t("firstNamePlaceholder")}
              />
            </div>
            <div className="w-full">
              <Label htmlFor="lname">{t("lastName")}</Label>
              <Input
                type="text"
                id="lname"
                placeholder={t("lastNamePlaceholder")}
              />
            </div>
          </div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input type="email" id="email" placeholder={t("emailPlaceholder")} />
          <Label htmlFor="tel">{t("phoneNumber")}</Label>
          <Input type="tel" id="tel" placeholder={t("phonePlaceholder")} />
          <div className="flex w-full justify-between gap-5 pt-2.5">
            <div className="w-full">
              <Label htmlFor="rname">{t("roleName")}</Label>
              <Input
                type="text"
                id="rname"
                placeholder={t("roleNamePlaceholder")}
              />
            </div>
            <div className="w-full">
              <Label htmlFor="role">{t("roleType")}</Label>
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("light")}</SelectItem>
                  <SelectItem value="dark">{t("dark")}</SelectItem>
                  <SelectItem value="system">{t("system")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="w-full p-4">
          <Label htmlFor="permissions">{t("permissions")}</Label>
          {permissionsData.map((permission) => (
              <Accordion key={permission.id} type="single" collapsible>
                <AccordionItem value={permission.id}>
                  <AccordionTrigger>
                    <div className="gap-2.5 flex">
                      <Checkbox id={`checkbox-${permission.id}`} />
                      <Label htmlFor={`checkbox-${permission.id}`}>
                        {t(permission.label)}
                      </Label>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {permission.permissions.map((perm, index) => (
                          <div
                              key={`${permission.id}-${index}`}
                              className="flex items-center gap-2"
                          >
                            <Checkbox id={`checkbox-${permission.id}-${index}`} />
                            <Label htmlFor={`checkbox-${permission.id}-${index}`}>
                              {t(perm)}
                            </Label>
                          </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
          ))}

        </div>
      </div>
    </div>
  );
}
