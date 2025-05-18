export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  console.log('redirectSystemPath called with path:', path);
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
    } else if (path.startsWith('jduapp://')) {
      return '/' + path.replace('jduapp://', '');
    } else if (path.startsWith('exp://')) {
      const url = new URL(path);
      return url.pathname || '/';
    }
    return path;
  } catch {
    return '/unexpected-error';
  }
}
