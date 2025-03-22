import Parent from "./parent";
import pagination from "./pagination";

type ParentApi = {
  parents: Parent[];
  pagination: pagination;
};

export default ParentApi;
