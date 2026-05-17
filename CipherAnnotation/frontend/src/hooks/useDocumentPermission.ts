import { useEffect, useState } from 'react';
import { documentService } from '@/services';
import { MyPermission } from '@/types';

export function useDocumentPermission(documentId: string | undefined) {
  const [myPermission, setMyPermission] = useState<MyPermission>('Read');

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    documentService
      .getDocument(documentId)
      .then((doc) => {
        if (!cancelled) setMyPermission(doc.myPermission);
      })
      .catch(() => {
        if (!cancelled) setMyPermission('Read');
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const canEdit = myPermission === 'Owner' || myPermission === 'Edit';
  return { myPermission, canEdit, readOnly: !canEdit };
}
