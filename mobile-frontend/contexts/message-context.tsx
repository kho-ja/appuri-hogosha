import React, { createContext, useContext, useState } from 'react';

type MessageContextType = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
};

const MessageContext = createContext<MessageContextType>({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export const useMessageContext = () => useContext(MessageContext);

export const MessageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <MessageContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </MessageContext.Provider>
  );
};
