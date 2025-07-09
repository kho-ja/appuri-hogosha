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

        console.log('Redirecting to HTTPS path:', pathname);
        return pathname;
      }
    }
    // Handle custom scheme URLs
    else if (path.startsWith('jduapp://')) {
      const cleanPath = path.replace('jduapp://', '');
      const finalPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
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
