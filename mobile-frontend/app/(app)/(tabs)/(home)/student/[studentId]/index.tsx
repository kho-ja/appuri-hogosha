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
    if (!isLoading && students && students.length > 0) {
      const currentStudent = students.find(s => s.id === studentIdNumber);
      if (!currentStudent) {
        console.log(
          `[StudentScreen] Student with ID ${studentIdNumber} not found`
        );
        // Redirect to 404 with custom message
        router.replace({
          pathname: '/+not-found',
          params: {
            title: i18n[language].studentNotFound,
            message: `${i18n[language].studentNotFoundMessage} ID: ${studentIdNumber}`,
          },
        });
        return;
      }
    }
  }, [students, studentIdNumber, isLoading, language, i18n]);

  // Refresh student data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  return <MessageList studentId={studentIdNumber} />;
};

export default StudentMessagesScreen;
