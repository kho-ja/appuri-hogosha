import React from 'react';
import MessageList from '@/components/MessageList';
import { useLocalSearchParams } from 'expo-router';

const StudentMessagesScreen = () => {
  const { id } = useLocalSearchParams();
  const studentId = Number(id);
  return <MessageList studentId={studentId} />;
};

export default StudentMessagesScreen;
