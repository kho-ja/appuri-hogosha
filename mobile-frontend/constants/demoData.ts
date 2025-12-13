import { Student, Message, User } from './types';

export const DEMO_CREDENTIALS = {
  phoneNumber: '998901234567',
  password: 'Demo123!',
};

export const DEMO_OTP_CREDENTIALS = {
  phoneNumber: '998901234567',
  otp: '654321',
};

export const DEMO_USER: User = {
  id: 9999,
  given_name: 'Demo',
  family_name: 'Parent',
  phone_number: '998901234567',
  email: 'demo@parent.com',
};

export const DEMO_STUDENTS: Student[] = [
  {
    id: 1001,
    family_name: 'Smith',
    given_name: 'Alice',
    student_number: 'STU001',
    email: 'alice.smith@school.edu',
    phone_number: '+1234567890',
    messageCount: 8,
    unread_count: 2,
  },
  {
    id: 1002,
    family_name: 'Johnson',
    given_name: 'Bob',
    student_number: 'STU002',
    email: 'bob.johnson@school.edu',
    phone_number: '+1234567891',
    messageCount: 5,
    unread_count: 1,
  },
  {
    id: 1003,
    family_name: 'Williams',
    given_name: 'Emma',
    student_number: 'STU003',
    email: 'emma.williams@school.edu',
    phone_number: '+1234567892',
    messageCount: 3,
    unread_count: 0,
  },
];

export const DEMO_MESSAGES: Record<number, Message[]> = {
  1001: [
    {
      id: 2001,
      title: 'Important: Parent-Teacher Conference',
      content:
        'Dear parents, we would like to invite you to attend the parent-teacher conference scheduled for next Friday at 2:00 PM. Please confirm your attendance by replying to this message. Thank you!',
      priority: 'high',
      group_name: 'Class 5A',
      edited_at: '2025-08-30T10:30:00Z',
      images: null,
      sent_time: '2025-08-30T10:30:00Z',
      viewed_at: null, // Unread
      read_status: 0,
    },
    {
      id: 2002,
      title: 'School Trip Permission Form',
      content:
        'Please fill out and return the permission form for the upcoming field trip to the Science Museum. The trip is scheduled for next Wednesday. Forms must be submitted by tomorrow.',
      priority: 'medium',
      group_name: 'Class 5A',
      edited_at: '2025-08-29T14:15:00Z',
      images: [
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&auto=format&fit=crop',
      ],
      sent_time: '2025-08-29T14:15:00Z',
      viewed_at: null, // Unread
      read_status: 0,
    },
    {
      id: 2003,
      title: 'Weekly Performance Update',
      content:
        'Alice has shown excellent progress in mathematics this week. She completed all assignments on time and actively participated in class discussions. Keep up the good work!',
      priority: 'low',
      group_name: 'Mathematics',
      edited_at: '2025-08-28T16:45:00Z',
      images: null,
      sent_time: '2025-08-28T16:45:00Z',
      viewed_at: '2025-08-28T18:30:00Z', // Read
      read_status: 1,
    },
    {
      id: 2004,
      title: 'Homework Assignment',
      content:
        "Please ensure Alice completes the English reading assignment pages 45-60 before tomorrow's class. There will be a quiz on the material covered.",
      priority: 'medium',
      group_name: 'English Literature',
      edited_at: '2025-08-27T11:20:00Z',
      images: null,
      sent_time: '2025-08-27T11:20:00Z',
      viewed_at: '2025-08-27T19:45:00Z', // Read
      read_status: 1,
    },
    {
      id: 2005,
      title: 'School Lunch Menu Update',
      content:
        'The cafeteria menu for next week has been updated. Please check the attached image for the complete schedule. Special dietary requirements can be accommodated upon request.',
      priority: 'low',
      group_name: 'General Announcements',
      edited_at: '2025-08-26T09:00:00Z',
      images: [
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&auto=format&fit=crop',
      ],
      sent_time: '2025-08-26T09:00:00Z',
      viewed_at: '2025-08-26T20:15:00Z', // Read
      read_status: 1,
    },
    {
      id: 2006,
      title: 'Art Class Supplies Needed',
      content:
        "For next week's art project, students will need colored pencils, drawing paper, and erasers. Please ensure Alice brings these supplies to class on Monday.",
      priority: 'medium',
      group_name: 'Art Class',
      edited_at: '2025-08-25T13:30:00Z',
      images: null,
      sent_time: '2025-08-25T13:30:00Z',
      viewed_at: '2025-08-25T21:00:00Z', // Read
      read_status: 1,
    },
    {
      id: 2007,
      title: 'Sports Day Participation',
      content:
        'Alice has been selected to participate in the upcoming Sports Day events. She will be competing in the 100m race and long jump. Please send appropriate sports attire.',
      priority: 'medium',
      group_name: 'Physical Education',
      edited_at: '2025-08-24T15:45:00Z',
      images: [
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&auto=format&fit=crop',
      ],
      sent_time: '2025-08-24T15:45:00Z',
      viewed_at: '2025-08-24T22:30:00Z', // Read
      read_status: 1,
    },
    {
      id: 2008,
      title: 'Library Books Due',
      content:
        'Reminder: Alice has library books that are due for return tomorrow. Please help her remember to bring "Charlotte\'s Web" and "The Secret Garden" back to school.',
      priority: 'low',
      group_name: 'Library Services',
      edited_at: '2025-08-23T10:15:00Z',
      images: null,
      sent_time: '2025-08-23T10:15:00Z',
      viewed_at: '2025-08-23T19:45:00Z', // Read
      read_status: 1,
    },
  ],
  1002: [
    {
      id: 2009,
      title: 'Science Project Reminder',
      content:
        "Bob's science project on solar systems is due next Monday. Please help him prepare his presentation materials and ensure all research is completed.",
      priority: 'high',
      group_name: 'Science Class',
      edited_at: '2025-08-30T12:00:00Z',
      images: null,
      sent_time: '2025-08-30T12:00:00Z',
      viewed_at: null, // Unread
      read_status: 0,
    },
    {
      id: 2010,
      title: 'Math Quiz Results',
      content:
        "Bob scored 85% on yesterday's math quiz. Great improvement from last week! He's showing consistent progress in algebra. Encourage him to keep up the good work.",
      priority: 'medium',
      group_name: 'Mathematics',
      edited_at: '2025-08-29T09:30:00Z',
      images: null,
      sent_time: '2025-08-29T09:30:00Z',
      viewed_at: '2025-08-29T18:15:00Z', // Read
      read_status: 1,
    },
    {
      id: 2011,
      title: 'Band Practice Schedule',
      content:
        'Extra band practice sessions have been scheduled for this week. Bob should attend Tuesday and Thursday from 3:30-4:30 PM to prepare for the winter concert.',
      priority: 'medium',
      group_name: 'Music Department',
      edited_at: '2025-08-28T14:20:00Z',
      images: null,
      sent_time: '2025-08-28T14:20:00Z',
      viewed_at: '2025-08-28T19:00:00Z', // Read
      read_status: 1,
    },
    {
      id: 2012,
      title: 'Uniform Reminder',
      content:
        'Please ensure Bob wears the complete school uniform tomorrow for the school photos. This includes the blazer, tie, and proper shoes. Photos begin at 9:00 AM.',
      priority: 'medium',
      group_name: 'General Announcements',
      edited_at: '2025-08-27T16:45:00Z',
      images: null,
      sent_time: '2025-08-27T16:45:00Z',
      viewed_at: '2025-08-27T20:30:00Z', // Read
      read_status: 1,
    },
    {
      id: 2013,
      title: 'Computer Lab Project',
      content:
        "Bob's team has been assigned to create a presentation about renewable energy using PowerPoint. The project will be presented next Friday during computer class.",
      priority: 'low',
      group_name: 'Computer Science',
      edited_at: '2025-08-26T11:15:00Z',
      images: [
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop',
      ],
      sent_time: '2025-08-26T11:15:00Z',
      viewed_at: '2025-08-26T21:45:00Z', // Read
      read_status: 1,
    },
  ],
  1003: [
    {
      id: 2014,
      title: 'Excellent Attendance Record',
      content:
        'Congratulations! Emma has maintained perfect attendance this semester. Her dedication to learning is commendable and sets a great example for her classmates.',
      priority: 'low',
      group_name: 'General Announcements',
      edited_at: '2025-08-30T08:45:00Z',
      images: null,
      sent_time: '2025-08-30T08:45:00Z',
      viewed_at: '2025-08-30T17:30:00Z', // Read
      read_status: 1,
    },
    {
      id: 2015,
      title: 'Reading Club Achievement',
      content:
        'Emma has completed her 20th book this year and earned the "Super Reader" badge! She will receive her certificate during tomorrow\'s morning assembly.',
      priority: 'medium',
      group_name: 'Reading Club',
      edited_at: '2025-08-29T13:15:00Z',
      images: [
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&auto=format&fit=crop',
      ],
      sent_time: '2025-08-29T13:15:00Z',
      viewed_at: '2025-08-29T19:45:00Z', // Read
      read_status: 1,
    },
    {
      id: 2016,
      title: 'Drama Club Auditions',
      content:
        'Emma has successfully auditioned for the lead role in our spring play "Alice in Wonderland". Rehearsals will begin next Monday after school. Congratulations!',
      priority: 'medium',
      group_name: 'Drama Club',
      edited_at: '2025-08-28T15:30:00Z',
      images: null,
      sent_time: '2025-08-28T15:30:00Z',
      viewed_at: '2025-08-28T20:15:00Z', // Read
      read_status: 1,
    },
  ],
};
