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
      console.log('Custom scheme redirect:', normalized);
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
