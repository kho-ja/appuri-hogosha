import { useFormatter, useTranslations } from "next-intl";
import type { ZodErrorMap } from "zod";
import { defaultErrorMap, ZodIssueCode, ZodParsedType } from "zod";

const jsonStringifyReplacer = (_: string, value: any): any => {
  if (typeof value === "bigint") {
    return value.toString();
  }

  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) return false;

  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return false;
  }

  return true;
};

const getKeyAndValues = (
  param: unknown,
  defaultKey: string
): {
  values: Record<string, unknown>;
  key: string;
} => {
  if (typeof param === "string") return { key: param, values: {} };

  if (isRecord(param)) {
    const key =
      "key" in param && typeof param.key === "string" ? param.key : defaultKey;
    const values =
      "values" in param && isRecord(param.values) ? param.values : {};

    return { key, values };
  }

  return { key: defaultKey, values: {} };
};

export type MakeZodI18nMap = (option?: ZodI18nMapOption) => ZodErrorMap;

export type ZodI18nMapOption = {
  t?: any;
  ns?: string | readonly string[];
  handlePath?: HandlePathOption | false;
};

export type HandlePathOption = {
  context?: string;
  ns?: string | readonly string[];
  keyPrefix?: string;
};

const defaultNs = "zod";

export const useMakeZodI18nMap: MakeZodI18nMap = (option) => {
  const translations = useTranslations(defaultNs);
  const format = useFormatter();

  return (issue, ctx) => {
    const { t, ns, handlePath } = {
      t: translations,
      ns: defaultNs,
      ...option,
      handlePath:
        option?.handlePath !== false
          ? {
              context: "with_path",
              ns: option?.ns ?? defaultNs,
              keyPrefix: undefined,
              ...option?.handlePath,
            }
          : null,
    };

    let message: string;
    message = defaultErrorMap(issue, ctx).message;

    const path =
      issue.path.length > 0 && !!handlePath
        ? {
            context: handlePath.context,
            path: t(
              [handlePath.keyPrefix, issue.path.join(".")]
                .filter(Boolean)
                .join("."),
              {
                defaultValue: issue.path.join("."),
              }
            ),
          }
        : {};

    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        if (issue.received === ZodParsedType.undefined) {
          message = t("errors.invalid_type_received_undefined", {
            defaultValue: message,
            ...path,
          });
        } else {
          message = t("errors.invalid_type", {
            expected: t(`types.${issue.expected}`, {
              defaultValue: issue.expected,
            }),
            received: t(`types.${issue.received}`, {
              defaultValue: issue.received,
            }),
            defaultValue: message,
            ...path,
          });
        }
        break;
      case ZodIssueCode.invalid_literal:
        message = t("errors.invalid_literal", {
          expected: JSON.stringify(issue.expected, jsonStringifyReplacer),
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.unrecognized_keys:
        message = t("errors.unrecognized_keys", {
          keys: format.list(issue.keys, { type: "disjunction" }),
          count: issue.keys.length,
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.invalid_union:
        message = t("errors.invalid_union", {
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.invalid_union_discriminator:
        message = t("errors.invalid_union_discriminator", {
          options: format.list(issue.options as any[], { type: "disjunction" }),
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.invalid_enum_value:
        message = t("errors.invalid_enum_value", {
          options: format.list(issue.options as any[], { type: "disjunction" }),
          received: issue.received,
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.invalid_arguments:
        message = t("errors.invalid_arguments", {
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.invalid_return_type:
        message = t("errors.invalid_return_type", {
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.invalid_date:
        message = t("errors.invalid_date", {
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.invalid_string:
        if (typeof issue.validation === "object") {
          if ("startsWith" in issue.validation) {
            message = t(`errors.invalid_string.startsWith`, {
              startsWith: issue.validation.startsWith,
              defaultValue: message,
              ...path,
            });
          } else if ("endsWith" in issue.validation) {
            message = t(`errors.invalid_string.endsWith`, {
              endsWith: issue.validation.endsWith,
              defaultValue: message,
              ...path,
            });
          }
        } else {
          message = t(`errors.invalid_string.${issue.validation}`, {
            validation: t(`validations.${issue.validation}`, {
              defaultValue: issue.validation,
            }),
            defaultValue: message,
            ...path,
          });
        }
        break;
      case ZodIssueCode.too_small:
        const minimum =
          issue.type === "date"
            ? new Date(issue.minimum as number)
            : issue.minimum;
        message = t(
          `errors.too_small.${issue.type}.${
            issue.exact
              ? "exact"
              : issue.inclusive
              ? "inclusive"
              : "not_inclusive"
          }`,
          {
            minimum:
              minimum instanceof Date
                ? format.dateTime(minimum, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : minimum,
            count: typeof minimum === "number" ? minimum : undefined,
            defaultValue: message,
            ...path,
          }
        );
        break;
      case ZodIssueCode.too_big:
        const maximum =
          issue.type === "date"
            ? new Date(issue.maximum as number)
            : issue.maximum;
        message = t(
          `errors.too_big.${issue.type}.${
            issue.exact
              ? "exact"
              : issue.inclusive
              ? "inclusive"
              : "not_inclusive"
          }`,
          {
            maximum:
              maximum instanceof Date
                ? format.dateTime(maximum, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : maximum,
            count: typeof maximum === "number" ? maximum : undefined,
            defaultValue: message,
            ...path,
          }
        );
        break;
      case ZodIssueCode.custom:
        const { key, values } = getKeyAndValues(
          issue.params?.i18n,
          ns + ".errors.custom"
        );

        message = t(key, {
          ...values,
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.invalid_intersection_types:
        message = t("errors.invalid_intersection_types", {
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.not_multiple_of:
        message = t("errors.not_multiple_of", {
          multipleOf: issue.multipleOf,
          defaultValue: message,
          ...path,
        });
        break;
      case ZodIssueCode.not_finite:
        message = t("errors.not_finite", {
          defaultValue: message,
          ...path,
        });
        break;
      default:
    }

    return { message };
  };
};
