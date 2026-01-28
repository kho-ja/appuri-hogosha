import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

export const commonValidation = {
  email: z.string().email().max(254),

  emailOptional: z.string().max(0).or(z.string().email()).optional(),

  givenName: z.string().min(1).max(50),
  familyName: z.string().min(1).max(50),

  givenNameOptional: z.string().max(50),
  familyNameOptional: z.string().max(50),

  phoneNumber: (t: (key: string) => string) =>
    z
      .string()
      .min(10)
      .max(20)
      .refine(isValidPhoneNumber, { message: t("Invalid phone number") }),

  studentNumber: (t: (key: string) => string) =>
    z
      .string()
      .min(1)
      .max(10)
      .refine((v) => !/\s/.test(v), { message: t("NoSpacesAllowed") }),

  cohort: z.coerce.number().int().positive().optional(),

  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  image: z.string().optional(),

  groupName: z.string().min(1),
  subGroupId: z.number().nullable().optional(),

  password: z.string().min(1),
  verificationCode: z.string().length(6),
  confirmPassword: z.string(),

  scheduledAt: z.string().min(1),
} as const;

export const arrayValidation = {
  studentIds: z.array(z.number()),
  groupIds: z.array(z.number()),
  parentIds: z.array(z.number()),
};

export const uploadValidation = {
  kintoneSubdomain: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9-]+$/),

  kintoneDomain: z.enum(["cybozu.com", "kintone.com", "cybozu-dev.com"], {
    errorMap: () => ({ message: "kintone_domain_invalid" }),
  }),

  kintoneToken: z.string().min(10).max(100),

  kintoneFieldCode: z.string().min(1),

  csvFile: z.instanceof(File).refine((file) => file.name.endsWith(".csv")),
  uploadMode: z.enum(["create", "update", "delete"]),
};

export const smsCreateSchema = z.object({
  recipient: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  Cc: z.string().optional(),
  Bcc: z.string().optional(),
});





export const getAdminCreateSchema = (t: (key: string) => string) =>
  z.object({
    given_name: commonValidation.givenName,
    family_name: commonValidation.familyName,
    phone_number: commonValidation.phoneNumber(t),
    email: commonValidation.email,
  });

export const getAdminEditSchema = (t: (key: string) => string) =>
  z.object({
    given_name: commonValidation.givenName,
    family_name: commonValidation.familyName,
    phone_number: commonValidation.phoneNumber(t),
  });

export const getParentCreateSchema = (t: (key: string) => string) =>
  z.object({
    given_name: commonValidation.givenNameOptional,
    family_name: commonValidation.familyNameOptional,
    phone_number: commonValidation.phoneNumber(t),
    email: commonValidation.emailOptional,
  });

export const getParentEditSchema = (_t: (key: string) => string) =>
  z.object({
    given_name: commonValidation.givenNameOptional,
    family_name: commonValidation.familyNameOptional,
    email: commonValidation.emailOptional,
    phone_number: z.string().max(0).optional(),
  });

export const getStudentCreateSchema = (t: (key: string) => string) =>
  z.object({
    email: commonValidation.email,
    phone_number: commonValidation.phoneNumber(t),
    given_name: commonValidation.givenName,
    family_name: commonValidation.familyName,
    student_number: commonValidation.studentNumber(t),
    cohort: commonValidation.cohort,
  });

export const getStudentEditSchema = (t: (key: string) => string) =>
  z.object({
    email: commonValidation.email,
    phone_number: commonValidation.phoneNumber(t),
    given_name: commonValidation.givenName,
    family_name: commonValidation.familyName,
    student_number: commonValidation.studentNumber(t),
    cohort: commonValidation.cohort,
  });

export const groupCreateSchema = z.object({
  name: commonValidation.groupName,
  sub_group_id: commonValidation.subGroupId,
});

export const groupEditSchema = z.object({
  name: commonValidation.groupName,
});

export const postCreateSchema = z.object({
  title: commonValidation.title,
  description: commonValidation.description,
  priority: commonValidation.priority,
  image: commonValidation.image,
});

export const postEditSchema = z.object({
  title: commonValidation.title,
  description: commonValidation.description,
  priority: commonValidation.priority,
  image: commonValidation.image,
});

export const scheduledPostEditSchema = z.object({
  title: commonValidation.title,
  description: commonValidation.description,
  priority: commonValidation.priority,
  image: commonValidation.image,
  scheduled_at: commonValidation.scheduledAt,
});

export const loginSchema = z.object({
  email: commonValidation.email,
  password: commonValidation.password,
});

export const forgotPasswordSchema = z.object({
  email: commonValidation.email,
  code: commonValidation.verificationCode,
  confirmPassword: commonValidation.confirmPassword,
});

export const getCsvUploadSchema = () =>
  z.object({
    csvFile: uploadValidation.csvFile,
    mode: uploadValidation.uploadMode,
  });

export const getKintoneParentSchema = () =>
  z.object({
    subdomain: uploadValidation.kintoneSubdomain,
    domain: uploadValidation.kintoneDomain,
    kintoneToken: uploadValidation.kintoneToken,
    given_name_field: uploadValidation.kintoneFieldCode,
    family_name_field: uploadValidation.kintoneFieldCode,
    phone_number_field: uploadValidation.kintoneFieldCode,
    email_field: uploadValidation.kintoneFieldCode,
    student_number_field: uploadValidation.kintoneFieldCode,
  });

export const getKintoneStudentSchema = () =>
  z.object({
    subdomain: uploadValidation.kintoneSubdomain,
    domain: uploadValidation.kintoneDomain,
    kintoneToken: uploadValidation.kintoneToken,
    given_name_field: uploadValidation.kintoneFieldCode,
    family_name_field: uploadValidation.kintoneFieldCode,
    email_field: uploadValidation.kintoneFieldCode,
    student_number_field: uploadValidation.kintoneFieldCode,
    phone_number_field: uploadValidation.kintoneFieldCode,
  });