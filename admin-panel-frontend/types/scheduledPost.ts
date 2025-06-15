export default interface ScheduledPost {
  id: string;
  title: string;
  description: string;
  priority: string;
  scheduled_at: string; 
  image?: string | null;
  edited_at?: string;
}