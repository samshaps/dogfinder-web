import { getCityBySlug, cityLabel } from '@/lib/seo/cities';
import { renderAdoptOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/og';

export const alt = 'Adoptable rescue dogs by city on DogYenta';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  return renderAdoptOgImage({
    eyebrow: 'Rescue dogs for adoption',
    title: city ? `Dogs for adoption in ${cityLabel(city)}` : 'Adopt a rescue dog',
    subtitle: city
      ? `Live listings from shelters and rescues near ${city.city}, refreshed hourly.`
      : 'Live listings from shelters and rescues, refreshed every hour.',
  });
}
