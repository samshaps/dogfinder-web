import { renderAdoptOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/og';

export const alt = 'Adopt a rescue dog by breed or city on DogYenta';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderAdoptOgImage({
    eyebrow: 'Rescue dogs near you',
    title: 'Adopt by breed or city',
    subtitle: 'Live listings from shelters and rescues, refreshed every hour.',
  });
}
