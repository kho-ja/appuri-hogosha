import SMSApi from "@/types/smsApi";
import useApiQuery from "./useApiQuery";

export default function useSMSQuery(page: number, search: string) {
  return useApiQuery<SMSApi>(`sms/list?page=${page}&text=${search}`, [
    "sms",
    page,
    search,
  ]);
}
