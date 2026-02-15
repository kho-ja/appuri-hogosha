// Function to get navigation path optimized for single student
export function getNavigationPathForSingleStudent(
  originalPath: string,
  studentId: number
): string {
  console.log('Optimizing navigation for single student:', studentId);

  // Check if the original path is a message link
  const messageMatch = originalPath.match(/^\/student\/\d+\/message\/(\d+)$/);
  if (messageMatch) {
    const messageId = messageMatch[1];
    return `/student/${studentId}/message/${messageId}`;
  }

  // Check if it's a student page
  const studentMatch = originalPath.match(/^\/student\/\d+$/);
  if (studentMatch) {
    return `/student/${studentId}`;
  }

  // For home or root paths, go directly to student page
  if (originalPath === '/' || originalPath === '/home') {
    return `/student/${studentId}`;
  }

  // For other paths, keep as is
  return originalPath;
}

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
    if (url.protocol === 'https:' && url.hostname === 'parents.jdu.uz') {
      let pathname = url.pathname;
      if (pathname.startsWith('/parentnotification')) {
        pathname = pathname.replace('/parentnotification', '') || '/';
      }
      const normalized = normalizePath(pathname, url.searchParams);

      // Preserve whitelisted query params for auth flows
      const allowedParams = new URLSearchParams();
      const allowList = ['phone', 'code'];
      allowList.forEach(key => {
        const val = url.searchParams.get(key);
        if (val) allowedParams.set(key, val);
      });
      const shouldKeepQuery =
        (normalized === '/sign-in' || normalized === '/forgot-password') &&
        Array.from(allowedParams.keys()).length > 0;

      const result = shouldKeepQuery
        ? `${normalized}?${allowedParams.toString()}`
        : normalized;

      console.log('HTTPS redirect:', result);
      return result;
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
