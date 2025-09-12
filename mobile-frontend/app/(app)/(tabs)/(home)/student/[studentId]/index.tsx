import React, { useEffect, useContext } from 'react';
import MessageList from '@/components/MessageList';
import { useLocalSearchParams, router } from 'expo-router';
import { useStudents } from '@/contexts/student-context';
import { useFocusEffect } from '@react-navigation/native';
import { I18nContext } from '@/contexts/i18n-context';

const StudentMessagesScreen = () => {
  const { studentId } = useLocalSearchParams();
  const studentIdNumber = Number(studentId);
  const { students, refetch, isLoading } = useStudents();
  const { language, i18n } = useContext(I18nContext);

  // Check if the current student exists in the students list
  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!students || students.length === 0) {
      router.replace('/');
      return;
    }
      const currentStudent = students.find(s => s.id === studentIdNumber);
      if (!currentStudent) {
        console.log(
          `[StudentScreen] Student with ID ${studentIdNumber} not found`
        );
      console.log('Available student IDs:', students.map(s => s.id));
      router.replace('/');
        return;
    }
  }, [students, studentIdNumber, isLoading, language, i18n]);

  // Refresh student data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (students) {
      refetch();
      }
    }, [refetch, students])
  );
  if (isLoading || !students) {
    return null;
  }
  const currentStudent = students.find(s => s.id === studentIdNumber);
  if (!currentStudent) {
    return null;
  }

  return <MessageList studentId={studentIdNumber} />;
};

export default StudentMessagesScreen;
