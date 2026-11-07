import { getBreedBySlug } from '@/lib/seo/breeds';
import { getCityBySlug, cityLabel } from '@/lib/seo/cities';
import { renderAdoptOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/og';

export const alt = 'Adoptable rescue dogs by breed and city on DogYenta';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ breed: string; city: string }> }) {
  const { breed: breedSlug, city: citySlug } = await params;
  const breed = getBreedBySlug(breedSlug);
  const city = getCityBySlug(citySlug);
  return renderAdoptOgImage({
    eyebrow: city ? `Rescue dogs in ${cityLabel(city)}` : 'Rescue dogs for adoption',
    title: breed ? `Adopt a ${breed.name}` : 'Adopt a rescue dog',
    subtitle: city
      ? `${breed ? breed.plural : 'Dogs'} from shelters and rescues near ${city.city}, refreshed hourly.`
      : 'Live listings from shelters and rescues, refreshed every hour.',
  });
}
