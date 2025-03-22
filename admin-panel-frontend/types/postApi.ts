import pagination from "./pagination";
import Post from "./post";

type PostApi = {
  posts: Post[];
  pagination: pagination;
};

export default PostApi;
