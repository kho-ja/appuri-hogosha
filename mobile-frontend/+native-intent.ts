export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    console.log('Processing path:', path);

    // Handle HTTPS URLs (Universal Links)
    if (path.startsWith('https://')) {
      const url = new URL(path);
      console.log('Processing HTTPS URL:', url.hostname, url.pathname);

      if (url.hostname === 'appuri-hogosha.vercel.app') {
        let pathname = url.pathname;

        // Remove /parentnotification prefix if it exists
        if (pathname.startsWith('/parentnotification')) {
          pathname = pathname.slice('/parentnotification'.length) || '/';
        }

        // Handle student URLs specifically
        // Convert /student/123/message/456 to proper app route
        const studentMessageMatch = pathname.match(
          /^\/student\/(\d+)\/message\/(\d+)$/
        );
        if (studentMessageMatch) {
          const [, , messageId] = studentMessageMatch;
          const finalPath = `/student/message/${messageId}`;
          console.log('Redirecting to student message path:', finalPath);
          return finalPath;
        }

        // Handle direct student page URLs: /student/123
        const studentPageMatch = pathname.match(/^\/student\/(\d+)$/);
        if (studentPageMatch) {
          const [, studentId] = studentPageMatch;
          const finalPath = `/student/${studentId}`;
          console.log('Redirecting to student page path:', finalPath);
          return finalPath;
        }

        // Handle settings page: /settings
        if (pathname === '/settings') {
          console.log('Redirecting to settings path:', pathname);
          return pathname;
        }

        // Handle home page: /home -> /
        if (pathname === '/home') {
          console.log('Redirecting to home page path:', '/');
          return '/';
        }

        console.log('Redirecting to HTTPS path:', pathname);
        return pathname;
      }
    }
    // Handle custom scheme URLs (jduapp, jduapp-dev, jduapp-preview)
    else if (path.startsWith('jduapp')) {
      const cleanPath = path.replace(/^jduapp[^:]*:\/\//, '');
      let finalPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;

      // Handle student message URLs in custom scheme
      const studentMessageMatch = finalPath.match(
        /^\/student\/(\d+)\/message\/(\d+)$/
      );
      if (studentMessageMatch) {
        const [, , messageId] = studentMessageMatch;
        finalPath = `/student/message/${messageId}`;
        console.log(
          'Redirecting to custom scheme student message path:',
          finalPath
        );
        return finalPath;
      }

      // Handle direct student page URLs in custom scheme: /student/123
      const studentPageMatch = finalPath.match(/^\/student\/(\d+)$/);
      if (studentPageMatch) {
        const [, studentId] = studentPageMatch;
        finalPath = `/student/${studentId}`;
        console.log(
          'Redirecting to custom scheme student page path:',
          finalPath
        );
        return finalPath;
      }

      // Handle settings page in custom scheme: /settings
      if (finalPath === '/settings') {
        console.log('Redirecting to custom scheme settings path:', finalPath);
        return finalPath;
      }

      // Handle home page in custom scheme: /home -> /
      if (finalPath === '/home') {
        console.log('Redirecting to custom scheme home path:', '/');
        return '/';
      }

      console.log('Redirecting to custom scheme path:', finalPath);
      return finalPath;
    }
    // Handle expo development URLs (for Expo Go)
    else if (path.startsWith('exp://')) {
      const url = new URL(path);
      // Extract the path after the --/ part which is the deep link path
      let pathname = url.pathname || '/';

      // Handle Expo Go deep link format: exp://ip:port/--/your/path
      const deepLinkMatch = pathname.match(/--(.*)$/);
      if (deepLinkMatch) {
        pathname = deepLinkMatch[1] || '/';
      }

      // Check for query parameters (new format for Expo Go)
      const searchParams = url.searchParams;
      const studentParam = searchParams.get('student');
      const studentPageParam = searchParams.get('studentPage');
      const typeParam = searchParams.get('type');
      const pageParam = searchParams.get('page');
      const idParam = searchParams.get('id');
      const messageIdParam = searchParams.get('messageId');

      // Handle page navigation (home, settings)
      if (pageParam === 'home') {
        // Format: ?page=home
        console.log('Redirecting to expo home page (query):', '/');
        return '/';
      }

      if (pageParam === 'settings') {
        // Format: ?page=settings
        const finalPath = '/settings';
        console.log('Redirecting to expo settings page (query):', finalPath);
        return finalPath;
      }

      // Handle generic type parameter for pages
      if (typeParam === 'home') {
        // Format: ?type=home
        console.log('Redirecting to expo home page (type):', '/');
        return '/';
      }

      if (typeParam === 'settings') {
        // Format: ?type=settings
        const finalPath = '/settings';
        console.log('Redirecting to expo settings page (type):', finalPath);
        return finalPath;
      }

      // Handle student page links
      if (studentPageParam) {
        // Format: ?studentPage=123
        const finalPath = `/student/${studentPageParam}`;
        console.log('Redirecting to expo student page (query):', finalPath);
        return finalPath;
      }

      // Handle generic type parameter
      if (typeParam === 'student' && idParam) {
        // Format: ?type=student&id=123
        const finalPath = `/student/${idParam}`;
        console.log('Redirecting to expo student page (type):', finalPath);
        return finalPath;
      }

      if (studentParam) {
        // Format: ?student=123
        const finalPath = `/student/message/${studentParam}`;
        console.log('Redirecting to expo student message (query):', finalPath);
        return finalPath;
      }

      if (messageIdParam) {
        // Format: ?messageId=123&studentId=10
        const finalPath = `/student/message/${messageIdParam}`;
        console.log('Redirecting to expo message path (query):', finalPath);
        return finalPath;
      }

      // Handle direct page paths first (before complex patterns)
      // Skip home path handling - let it be handled by default logic

      // Handle settings page path: /settings
      if (pathname === '/settings') {
        console.log(
          'Redirecting to expo settings page (direct path):',
          '/settings'
        );
        return '/settings';
      }

      // Handle student message URLs in expo path
      const studentMessageMatch = pathname.match(
        /^\/student\/(\d+)\/message\/(\d+)$/
      );
      if (studentMessageMatch) {
        const [, , messageId] = studentMessageMatch;
        const finalPath = `/student/message/${messageId}`;
        console.log('Redirecting to expo student message path:', finalPath);
        return finalPath;
      }

      console.log('Redirecting to expo path:', pathname);
      return pathname;
    }
    // Handle other custom schemes or direct paths
    else if (path.startsWith('/')) {
      console.log('Direct path:', path);
      return path;
    }

    console.log('Unhandled path format, redirecting to home:', path);
    return '/';
  } catch (error) {
    console.error('Error processing path:', path, error);
    return '/unexpected-error';
  }
}
