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
import DemoModeService from '@/services/demo-mode-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, {
  UnauthorizedError,
  ForbiddenError,
} from '@/services/api-client';

interface StudentContextValue {
  students: Student[] | null;
  activeStudent: Student | null;
  setActiveStudent: (student: Student) => void;
  refetch: () => void;
  isLoading: boolean;
  clearAndRefetch: () => Promise<void>;
}

const StudentContext = createContext<StudentContextValue>({
  students: [],
  activeStudent: null,
  setActiveStudent: () => {},
  refetch: () => {},
  isLoading: false,
  clearAndRefetch: async () => {},
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
  const { signOut, refreshToken, session, isDemoMode } = useSession();
  const { isOnline } = useNetwork();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const db = useSQLiteContext();

  const previousSessionRef = React.useRef<string | null | undefined>(undefined);

  // Load cache FIRST on mount - show cached data immediately
  React.useEffect(() => {
    const loadCache = async () => {
      if (!session) {
        setIsInitializing(false);
        return;
      }

      try {
        const cachedStudents = await fetchStudentsFromDB(db);
        if (cachedStudents && cachedStudents.length > 0) {
          setStudents(cachedStudents);
        }
      } catch (err) {
        console.error('[StudentContext] Failed to load cache:', err);
      }
      setIsInitializing(false);
    };
    loadCache();
  }, [session, db]);

  // Reset state only on actual session change (logout/login with different account)
  React.useEffect(() => {
    if (previousSessionRef.current === undefined) {
      // First mount - just save the session
      previousSessionRef.current = session;
      return;
    }

    if (previousSessionRef.current !== session) {
      // Actual session change
      if (
        previousSessionRef.current !== null &&
        session !== previousSessionRef.current
      ) {
        setStudents(null);
        setActiveStudent(null);
        setIsInitializing(true);
      }
      previousSessionRef.current = session;
    }
  }, [session]);

  const saveStudentsToDB = useCallback(
    async (studentList: Student[]) => {
      // Count locally read messages that haven't been synced yet
      // These should be subtracted from server's unread_count
      const localReadCounts = new Map<number, number>();

      for (const student of studentList) {
        const result = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM message WHERE student_id = ? AND read_status = 1 AND sent_status = 0',
          [student.id]
        );
        if (result && result.count > 0) {
          localReadCounts.set(student.id, result.count);
        }
      }

      const statement = await db.prepareAsync(
        'INSERT OR REPLACE INTO student (id, student_number, family_name, given_name, phone_number, email, unread_count) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      try {
        for (const student of studentList) {
          // Adjust unread_count: server value minus locally read messages
          const localReadCount = localReadCounts.get(student.id) || 0;
          const adjustedUnreadCount = Math.max(
            0,
            (student.unread_count || 0) - localReadCount
          );

          await statement.executeAsync([
            student.id,
            student.student_number,
            student.family_name,
            student.given_name,
            student.phone_number,
            student.email,
            adjustedUnreadCount,
          ]);
        }
      } finally {
        await statement.finalizeAsync();
      }
    },
    [db]
  );

  // Add import for demo service at the top of the file if not already imported

  const { data, error, isError, isSuccess, refetch, isFetching } = useQuery<
    Student[],
    Error
  >({
    queryKey: ['students', session],
    queryFn: async () => {
      if (isDemoMode) {
        await DemoModeService.simulateNetworkDelay(300, 800);

        const demoStudents = DemoModeService.getDemoStudents();

        // Update unread counts from demo service
        const studentsWithUnread = demoStudents.map((student: Student) => ({
          ...student,
          unread_count: DemoModeService.getDemoUnreadCount(student.id),
        }));

        // Save to database for consistency
        await saveStudentsToDB(studentsWithUnread);
        return studentsWithUnread;
      }

      if (isOnline) {
        try {
          const response = await apiClient.get<Student[]>('/students');
          const serverStudents = response.data;
          await saveStudentsToDB(serverStudents);
          return serverStudents;
        } catch (err) {
          if (err instanceof UnauthorizedError) {
            await signOut();
            throw new Error('401 Unauthorized');
          } else if (err instanceof ForbiddenError) {
            await signOut();
            throw new Error('403 Forbidden');
          }
          console.error('Online fetch failed, falling back to DB:', err);
          return await fetchStudentsFromDB(db);
        }
      } else {
        return await fetchStudentsFromDB(db);
      }
    },
    enabled: !!session && !isInitializing,
    staleTime: isDemoMode ? 0 : 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: isDemoMode ? false : 1 * 60 * 1000, // Refetch every minute to catch account deletion
    refetchIntervalInBackground: true, // Important: continue refetching even when app is in background
  });

  // Compute final loading state: loading if initializing OR (fetching AND no cached data)
  const isLoading = isInitializing || (isFetching && !students);

  useEffect(() => {
    if (isSuccess && data) {
      setStudents(data);

      // Save students to AsyncStorage for deeplink navigation
      AsyncStorage.setItem('students', JSON.stringify(data)).catch(error => {
        console.error('Error saving students to AsyncStorage:', error);
      });
    }
  }, [isSuccess, data, isDemoMode]);

  useEffect(() => {
    if (isError && error) {
      console.error('Query error:', error);
      setStudents(null);
    }
  }, [isError, error]);

  useEffect(() => {
    if (
      activeStudent &&
      students &&
      !students.find(s => s.id === activeStudent.id)
    ) {
      setActiveStudent(null);
    }
  }, [students, activeStudent]);

  // Clear cache and refetch only when online; otherwise keep cache untouched
  const clearAndRefetch = useCallback(async () => {
    if (!isOnline || isDemoMode) {
      // Offline or demo: do nothing, current state already has cache
      // Don't re-fetch to avoid flicker
      return;
    }

    try {
      await db.execAsync('DELETE FROM student');
      await refetch();
    } catch (err) {
      console.error('[StudentContext] Failed to clear and refetch:', err);
      // keep cache as-is on failure
    }
  }, [db, refetch, isOnline, isDemoMode]);

  return (
    <StudentContext.Provider
      value={{
        students,
        activeStudent,
        setActiveStudent,
        refetch,
        isLoading,
        clearAndRefetch,
      }}
    >
      {props.children}
    </StudentContext.Provider>
  );
}
