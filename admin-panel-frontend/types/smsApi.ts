import pagination from "./pagination";
import SMS from "./sms";

type SMSApi = {
  sms: SMS[];
  pagination: pagination;
};

export default SMSApi;

