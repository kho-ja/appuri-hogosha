import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GroupTable } from '@/components/GroupTable';
import { useTranslations } from 'next-intl';
import Group from '@/types/group';
import useApiMutation from '@/lib/useApiMutation';
import { toast } from '@/components/ui/use-toast';

interface EditGroupsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  currentGroups: Group[];
}

export default function EditGroupsDialog({
  isOpen,
  onClose,
  messageId,
  currentGroups,
}: EditGroupsDialogProps) {
  const t = useTranslations('EditGroupsDialog');
  const [selectedGroups, setSelectedGroups] = useState<Group[]>(currentGroups);

  const { mutate, isPending } = useApiMutation<{ success: boolean }>(
    `post/${messageId}/sender`,
    'PUT',
    ['message', messageId],
    {
      onSuccess: () => {
        toast({
          title: t('groupsUpdated'),
          description: t('groupsUpdatedDescription'),
        });
        onClose();
      },
    }
  );

  const handleSave = () => {
    mutate({
      groups: selectedGroups.map(group => group.id),
      students: [],
    } as any);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80%] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editGroups')}</DialogTitle>
        </DialogHeader>
        <GroupTable
          selectedGroups={selectedGroups}
          setSelectedGroups={setSelectedGroups}
        />
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
