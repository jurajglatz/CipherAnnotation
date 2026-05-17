import { useEffect, useState } from 'react';
import api from '@/services/api';
import { Page } from '@/types';

export function usePageImageBlob(page: Page, showProcessed: boolean): string | null {
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const imageUrl = showProcessed ? (page.processedImageUrl ?? page.imageUrl) : page.imageUrl;
    if (!imageUrl) return;

    let revoked = false;
    let createdUrl: string | null = null;
    api.get(imageUrl, { responseType: 'blob' }).then((res) => {
      if (revoked) return;
      createdUrl = URL.createObjectURL(res.data);
      setImageBlobUrl(createdUrl);
    });

    return () => {
      revoked = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [page.imageUrl, page.processedImageUrl, showProcessed]);

  return imageBlobUrl;
}
