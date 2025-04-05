export function redirectSystemPath({ path, initial }: { path: string; initial: boolean; }) {
  try {
    if (path.startsWith('https://')) {
      const url = new URL(path);
      if (url.hostname === 'appuri-hogosha.vercel.app') {
        let pathname = url.pathname;
        if (pathname.startsWith('/parentnotification')) {
          return pathname.slice('/parentnotification'.length) || '/';
        }
        return pathname || '/';
      }
    }
    // For custom schemes like "jduapp://", return path as is
    return path;
  } catch {
    return '/+not-found';
  }
}
