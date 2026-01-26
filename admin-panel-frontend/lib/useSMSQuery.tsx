import SMSApi from "@/types/smsApi";
import { useListQuery } from "./useListQuery";

export default function useSMSQuery(page: number, search: string) {
  return useListQuery<SMSApi>(
    `sms/list?page=${page}&text=${search}`,
    ["sms", page, search]
  );
}
