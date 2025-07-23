"use client";

import ResendPasswordDialog from "@/components/ResendPasswordDialog";

interface ResendPasswordSectionProps {
  id: number;
  name: string;
  identifier: string;
  type: 'parent' | 'admin';
}

const ResendPasswordSection: React.FC<ResendPasswordSectionProps> = ({ 
  id, 
  name, 
  identifier, 
  type 
}) => {
  if (!id || !name || !identifier) {
    return null;
  }

  return (
    <ResendPasswordDialog
      id={id}
      name={name}
      identifier={identifier}
      type={type}
      variant="button"
      size="default"
    />
  );
};

export default ResendPasswordSection;