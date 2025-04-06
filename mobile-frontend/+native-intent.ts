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
    }else if (path.startsWith('jduapp://')) {
      // Extract the path after the scheme, ensuring it starts with /
      return '/' + path.replace('jduapp://', '');
    }
    return path;
  } catch {
    return '/unexpected-error';
  }
}
