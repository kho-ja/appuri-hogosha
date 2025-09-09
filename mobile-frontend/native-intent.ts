export function redirectSystemPath({
  path,
  initial: _initial,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    console.log('Processing path:', path);

    // Direct paths like "/student/1"
    if (path.startsWith('/')) {
      const normalized = normalizePath(path);
      console.log('Direct path redirect:', normalized);
      return normalized;
    }

    const url = new URL(path);

    // Universal links
    if (
      url.protocol === 'https:' &&
      url.hostname === 'appuri-hogosha.vercel.app'
    ) {
      let pathname = url.pathname;
      if (pathname.startsWith('/parentnotification')) {
        pathname = pathname.replace('/parentnotification', '') || '/';
      }
      const normalized = normalizePath(pathname, url.searchParams);
      console.log('HTTPS redirect:', normalized);
      return normalized;
    }

    // Custom schemes: jduapp, jduapp-dev, jduapp-preview
    if (url.protocol.startsWith('jduapp')) {
      const pathname = '/' + path.replace(/^[^:]+:\/\//, '');
      const normalized = normalizePath(pathname);
      console.log('Custom scheme redirect:', url.protocol, '->', normalized);
      return normalized;
    }

    // Expo Go URLs
    if (url.protocol === 'exp:') {
      let pathname = url.pathname || '/';
      const deepLinkMatch = pathname.match(/--(.*)$/);
      if (deepLinkMatch) {
        pathname = deepLinkMatch[1] || '/';
      }
      const normalized = normalizePath(pathname, url.searchParams);
      console.log('Expo redirect:', normalized);
      return normalized;
    }

    const normalized = normalizePath(url.pathname, url.searchParams);
    console.log('Default redirect:', normalized);
    return normalized;
  } catch (error) {
    console.error('Error processing path:', path, error);
    return '/unexpected-error';
  }
}

// Helper function to check if parent has only one student
async function hasOnlyOneStudent(): Promise<boolean> {
  try {
    // We'll use AsyncStorage to temporarily store this info
    // This will be set by the StudentProvider when students data is loaded
    const { default: AsyncStorage } = await import(
      '@react-native-async-storage/async-storage'
    );
    const studentsCount = await AsyncStorage.getItem('students_count');
    return studentsCount === '1';
  } catch (error) {
    console.error('Error checking student count:', error);
    return false;
  }
}

// Enhanced navigation function that considers single student scenario
export async function getSmartNavigationPath(
  originalPath: string
): Promise<string> {
  const hasOnlyOne = await hasOnlyOneStudent();

  if (!hasOnlyOne) {
    return originalPath;
  }

  // If user has only one student, adjust paths accordingly
  // For root/home path, navigate directly to the single student
  if (originalPath === '/' || originalPath === '/home') {
    try {
      const { default: AsyncStorage } = await import(
        '@react-native-async-storage/async-storage'
      );
      const singleStudentId = await AsyncStorage.getItem('single_student_id');
      if (singleStudentId) {
        return `/student/${singleStudentId}`;
      }
    } catch (error) {
      console.error('Error getting single student ID:', error);
    }
  }

  // For student paths, they remain the same since the student page exists
  // For message paths, they remain the same since the detailed view exists
  return originalPath;
}

function normalizePath(
  pathname: string,
  searchParams?: URLSearchParams
): string {
  // Query string helpers (used by Expo Go)
  if (searchParams) {
    const studentId =
      searchParams.get('studentId') || searchParams.get('student') || undefined;
    const messageId = searchParams.get('messageId') || undefined;
    if (studentId && messageId) {
      pathname = `/student/${studentId}/message/${messageId}`;
    } else if (searchParams.get('studentPage')) {
      pathname = `/student/${searchParams.get('studentPage')}`;
    } else if (
      searchParams.get('type') === 'student' &&
      searchParams.get('id')
    ) {
      pathname = `/student/${searchParams.get('id')}`;
    } else if (searchParams.get('page')) {
      pathname = `/${searchParams.get('page')}`;
    }
  }

  if (!pathname || pathname === '/' || pathname === '/home') {
    return '/';
  }
  if (pathname === '/settings') {
    return '/settings';
  }
  const messageMatch = pathname.match(/^\/student\/(\d+)\/message\/(\d+)$/);
  if (messageMatch) {
    return `/student/${messageMatch[1]}/message/${messageMatch[2]}`;
  }
  const studentMatch = pathname.match(/^\/student\/(\d+)$/);
  if (studentMatch) {
    return `/student/${studentMatch[1]}`;
  }
  return pathname;
}
