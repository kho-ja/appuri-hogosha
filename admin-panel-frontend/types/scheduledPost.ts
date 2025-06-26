export default interface ScheduledPost {
  id: number;
  title: string;
  description: string;
  priority: string;
  scheduled_at: string; 
  image?: string | null;
  edited_at?: string;
}