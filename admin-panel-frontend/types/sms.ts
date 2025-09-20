import Admin from './admin';

export default interface SMS {
  id: number;
  title: string;
  description: string;
  message: string;
  recipient: string;
  status: string;
  admin?: Admin;
  sent_at: string;
}
