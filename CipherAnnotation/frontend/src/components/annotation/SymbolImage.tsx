/**
 * SymbolImage
 * Loads `/api/symbols/{id}/image` via the authenticated axios instance and
 * renders it through a blob URL — necessary because a plain <img src> would
 * skip the JWT and hit a 401.
 */

import React, { useEffect, useState } from 'react';
import api from '@/services/api';

interface SymbolImageProps {
  symbolId: string;
  alt?: string;
  className?: string;
}

export const SymbolImage: React.FC<SymbolImageProps> = ({ symbolId, alt = 'symbol', className }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let created: string | null = null;
    api
      .get(`/symbols/${symbolId}/image`, { responseType: 'blob' })
      .then((res) => {
        if (revoked) return;
        created = URL.createObjectURL(res.data);
        setUrl(created);
      })
      .catch(() => {});
    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [symbolId]);

  if (!url) return <div className={className} aria-label={alt} />;
  return <img src={url} alt={alt} className={className} />;
};

export default SymbolImage;
