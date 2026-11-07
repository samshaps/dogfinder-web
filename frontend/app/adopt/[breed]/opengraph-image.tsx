import { getBreedBySlug } from '@/lib/seo/breeds';
import { renderAdoptOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/og';

export const alt = 'Adoptable rescue dogs by breed on DogYenta';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ breed: string }> }) {
  const { breed: slug } = await params;
  const breed = getBreedBySlug(slug);
  return renderAdoptOgImage({
    eyebrow: 'Rescue dogs for adoption',
    title: breed ? `Adopt a ${breed.name}` : 'Adopt a rescue dog',
    subtitle: breed
      ? `${breed.plural} from shelters and rescues across the US, refreshed hourly.`
      : 'Live listings from shelters and rescues, refreshed every hour.',
  });
}
