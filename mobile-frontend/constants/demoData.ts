import { Student, Message } from './types';

const now = new Date().toISOString();

export const demoStudents: Student[] = [
  {
    id: 1,
    family_name: 'Demo',
    given_name: 'Student',
    student_number: 'S001',
    email: 'student1@example.com',
    phone_number: '+199955501',
    messageCount: 0,
    unread_count: 0,
  },
  {
    id: 2,
    family_name: 'Sample',
    given_name: 'Learner',
    student_number: 'S002',
    email: 'student2@example.com',
    phone_number: '+199955502',
    messageCount: 0,
    unread_count: 0,
  },
];

export const demoMessages: {
  student_id: number;
  student_number: string;
  messages: Message[];
}[] = [
  {
    student_id: 1,
    student_number: 'S001',
    messages: [
      {
        id: 1001,
        title: 'Welcome',
        content: 'Welcome to the demo mode.',
        priority: 'low',
        group_name: null,
        edited_at: now,
        images: null,
        sent_time: now,
        viewed_at: null,
        read_status: 0,
      },
    ],
  },
  {
    student_id: 2,
    student_number: 'S002',
    messages: [
      {
        id: 2001,
        title: 'Greetings',
        content: 'This is an example message.',
        priority: 'low',
        group_name: null,
        edited_at: now,
        images: null,
        sent_time: now,
        viewed_at: null,
        read_status: 0,
      },
    ],
  },
];
