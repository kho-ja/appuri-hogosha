import { useState } from "react";
import { Button, ButtonProps } from "./ui/button";

type AsyncButtonProps = Omit<ButtonProps, "onClick"> & {
  onClick: () => Promise<void>;
};

export const AsyncButton = ({ onClick, children, ...rest }: AsyncButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onClick(); // Istalgan async vazifa
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} isLoading={isLoading} {...rest}>
      {children}
    </Button>
  );
};
