import Group from "./group";
import pagination from "./pagination";

type GroupApi = {
  groups: Group[];
  pagination: pagination;
};

export default GroupApi;
