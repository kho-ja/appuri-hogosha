export default interface postView {
  admin: {
    id: number;
    name: string;
  };
  post: {
    id: number;
    title: string;
    description: string;
    priority: string;
    edited_at: string;
    sent_at: string;
    read_count: string;
    unread_count: string;
    image: string;
  };
}
