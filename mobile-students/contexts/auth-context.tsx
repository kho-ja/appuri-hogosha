import React from 'react';
import { router } from 'expo-router';

const AuthContext = React.createContext<{
  signOut: () => void;
}>({
  signOut: () => null,
});

export function useSession() {
  const value = React.useContext(AuthContext);
  if (process.env.NODE_ENV !== 'production') {
    if (!value) {
      throw new Error('useSession must be wrapped in a <SessionProvider />');
    }
  }
  return value;
}

export function SessionProvider(props: React.PropsWithChildren) {
  return (
    <AuthContext.Provider
      value={{
        signOut: () => {
          router.replace('/sign-in');
        },
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}
