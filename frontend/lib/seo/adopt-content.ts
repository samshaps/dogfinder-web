import { BREED_TEMPERAMENT_MAP, type TemperamentTrait } from '@/lib/breedTemperaments';
import type { BreedEntry } from './breeds';
import type { CityEntry } from './cities';
import type { Faq } from './structured-data';

/**
 * Evergreen copy generators for /adopt pages. Everything here is derived from the
 * curated catalogs so pages read as written, not stamped.
 */

const TRAIT_LABEL: Record<TemperamentTrait, string> = {
  'eager-to-please': 'Eager to please',
  intelligent: 'Intelligent',
  focused: 'Focused',
  adaptable: 'Adaptable',
  'independent-thinker': 'Independent thinker',
  loyal: 'Loyal',
  protective: 'Protective',
  confident: 'Confident',
  gentle: 'Gentle',
  sensitive: 'Sensitive',
  playful: 'Playful',
  'calm-indoors': 'Calm indoors',
  'alert-watchful': 'Alert and watchful',
  quiet: 'Quiet',
  'companion-driven': 'Companion-driven',
};

/** Top temperament tendencies for a breed, strongest first. */
export function breedTemperamentChips(breed: BreedEntry): string[] {
  const key = breed.temperamentKey ?? breed.name.toLowerCase();
  const map = BREED_TEMPERAMENT_MAP[key];
  if (!map) return [];
  return Object.entries(map)
    .filter(([, score]) => (score ?? 0) >= 2)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 5)
    .map(([trait]) => TRAIT_LABEL[trait as TemperamentTrait]);
}

export function breedFaqs(breed: BreedEntry, city?: CityEntry): Faq[] {
  const where = city ? `in ${city.city}, ${city.state}` : 'near you';
  const faqs: Faq[] = [
    {
      question: `How do I adopt a ${breed.name} ${where}?`,
      answer: `Browse the ${breed.plural} listed on this page, then click through to the rescue or shelter that has the dog. Each organization has its own application. DogYenta refreshes these listings every hour and can email you the moment a new ${breed.name} is posted ${where}.`,
    },
    {
      question: `How much does it cost to adopt a ${breed.name}?`,
      answer: `Adoption fees for ${breed.plural} typically run from about $50 at municipal shelters to $300-$600 at breed-specific rescues, and usually include spay or neuter, vaccines, and a microchip. That is a fraction of the cost of buying a puppy.`,
    },
    {
      question: `Is a ${breed.name} a good fit for my home?`,
      answer: `${breed.plural} are generally a good fit for ${breed.goodFor.slice(0, 3).join(', ').toLowerCase()}. Things to plan for: ${breed.considerations.slice(0, 2).join('; ').toLowerCase()}. DogYenta's free matching quiz weighs these against your lifestyle and explains the fit for each individual dog.`,
    },
  ];
  if (city) {
    faqs.push({
      question: `Which rescues have ${breed.plural} in ${city.city}?`,
      answer: `Listings on this page come from shelters and rescue groups within about 50 miles of ${city.city}, ${city.state}, including breed-specific rescues that may be located in nearby towns. The rescue name appears on each dog's card.`,
    });
  }
  return faqs;
}

export function cityFaqs(city: CityEntry): Faq[] {
  return [
    {
      question: `Where can I adopt a dog in ${city.city}, ${city.state}?`,
      answer: `This page lists dogs available from shelters and rescue groups within about 50 miles of ${city.city}. Click any dog to reach the organization that has them. For a personalized shortlist, take DogYenta's free matching quiz.`,
    },
    {
      question: `How often are ${city.city} dog listings updated?`,
      answer: `DogYenta refreshes this page every hour with newly listed dogs. Rescues in and around ${city.city} post new dogs daily, so Pro members use email alerts to hear about good matches first.`,
    },
    {
      question: `What does it cost to adopt a dog in ${city.stateName}?`,
      answer: `Most shelters and rescues in ${city.stateName} charge adoption fees between $50 and $500. Fees usually include spay or neuter, core vaccines, and a microchip. Some shelters waive fees for seniors or during adoption events.`,
    },
  ];
}
