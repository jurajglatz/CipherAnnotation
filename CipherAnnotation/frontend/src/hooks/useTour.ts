import { useEffect } from 'react';
import { maybeResumeTour, TourGroup } from '@/tutorial/tour';

/**
 * Resumes the tutorial tour for the given page group when the component mounts.
 * Pages call this once at the top of their component body.
 */
export const useTour = (group: TourGroup) => {
  useEffect(() => {
    maybeResumeTour(group);
  }, [group]);
};
