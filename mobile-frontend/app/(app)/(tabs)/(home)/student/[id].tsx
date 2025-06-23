import React, { useEffect } from 'react';
import MessageList from '@/components/MessageList';
import { useLocalSearchParams, router } from 'expo-router';
import { BackHandler } from 'react-native';
import { useStudents } from '@/contexts/student-context';
import { useFocusEffect } from '@react-navigation/native';

const StudentMessagesScreen = () => {
  const { id, isOnlyStudent } = useLocalSearchParams();
  const studentId = Number(id);
  const { students, refetch, isLoading } = useStudents();

  // Check if the current student exists in the students list
  useEffect(() => {
    if (!isLoading && students && students.length > 0) {
      const currentStudent = students.find(s => s.id === studentId);
      if (!currentStudent) {
        console.log(
          `[StudentScreen] Student with ID ${studentId} not found, redirecting to home`
        );
        router.replace('/');
        return;
      }
    }
  }, [students, studentId, isLoading]);

  // Refresh student data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Handle Android back button when there's only one student
  useEffect(() => {
    if (isOnlyStudent === 'true') {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          // Prevent default back behavior when there's only one student
          // User should use tab navigation instead
          return true;
        }
      );

      return () => backHandler.remove();
    }
  }, [isOnlyStudent]);

  return <MessageList studentId={studentId} />;
};

export default StudentMessagesScreen;
