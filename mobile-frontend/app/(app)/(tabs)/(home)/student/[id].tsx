import React from 'react';
import MessageList from '@/components/MessageList';
import { useLocalSearchParams } from 'expo-router';

const StudentMessagesScreen = () => {
  const { id } = useLocalSearchParams();
  const studentId = Number(id);
  console.log('studentId', studentId);

  return <MessageList studentId={studentId} />;
};

export default StudentMessagesScreen;
