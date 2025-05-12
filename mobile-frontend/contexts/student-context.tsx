import React, {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  PropsWithChildren,
} from 'react';
import { Student } from '@/constants/types';
import { useSession } from '@/contexts/auth-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useNetwork } from './network-context';
import { useQuery } from '@tanstack/react-query';
import { fetchStudentsFromDB } from '@/utils/queries';

interface StudentContextValue {
  students: Student[] | null;
  activeStudent: Student | null;
  setActiveStudent: (student: Student) => void;
  refetch: () => void;
  isLoading: boolean;
}

const StudentContext = createContext<StudentContextValue>({
  students: [],
  activeStudent: null,
  setActiveStudent: () => {},
  refetch: () => {},
  isLoading: false,
});

export function useStudents() {
  const value = useContext(StudentContext);
  if (process.env.NODE_ENV !== 'production') {
    if (!value) {
      throw new Error('useStudents must be wrapped in a <StudentProvider />');
    }
  }
  return value;
}

export function StudentProvider(props: PropsWithChildren) {
  const { signOut, refreshToken, session } = useSession();
  const { isOnline } = useNetwork();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const db = useSQLiteContext();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  const saveStudentsToDB = useCallback(
    async (studentList: Student[]) => {
      const statement = await db.prepareAsync(
        'INSERT OR REPLACE INTO student (id, student_number, family_name, given_name, phone_number, email) VALUES (?, ?, ?, ?, ?, ?)'
      );
      try {
        for (const student of studentList) {
          await statement.executeAsync([
            student.id,
            student.student_number,
            student.family_name,
            student.given_name,
            student.phone_number,
            student.email,
          ]);
        }
      } finally {
        await statement.finalizeAsync();
      }
    },
    [db]
  );

  const {
    data,
    error,
    isError,
    isSuccess,
    refetch,
    isFetching: isLoading,
  } = useQuery<Student[], Error>({
    queryKey: ['students'],
    queryFn: async () => {
      if (isOnline) {
        try {
          const res = await fetch(`${apiUrl}/students`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session}`,
            },
          });

          if (res.status === 401) {
            refreshToken();
            throw new Error('401 Unauthorized');
          } else if (res.status === 403) {
            signOut();
            throw new Error('403 Forbidden');
          }
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data?.message || 'Failed to fetch');
          }

          const serverStudents = (await res.json()) as Student[];
          await saveStudentsToDB(serverStudents);
          return serverStudents;
        } catch (err) {
          console.error('Online fetch failed, falling back to DB:', err);
          return await fetchStudentsFromDB(db);
        }
      } else {
        return await fetchStudentsFromDB(db);
      }
    },
    enabled: !!session,
  });

  useEffect(() => {
    if (isSuccess && data) {
      setStudents(data);
    }
  }, [isSuccess, data]);

  useEffect(() => {
    if (isError && error) {
      console.error('Query error:', error);
      setStudents(null);
    }
  }, [isError, error]);

  return (
    <StudentContext.Provider
      value={{ students, activeStudent, setActiveStudent, refetch, isLoading }}
    >
      {props.children}
    </StudentContext.Provider>
  );
}
