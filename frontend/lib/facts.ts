import { EffectivePreferences, Dog, Origin } from './schemas';
import { getMultiBreedTemperaments } from './breedTemperaments';

export type FactPack = {
  prefs: string[];
  dogTraits: string[];
  banned: string[];
};

export function buildFactPack(eff: EffectivePreferences, dog: Dog): FactPack {
  const prefs: string[] = [];
  const dogTraits: string[] = [];
  const banned = [
    'apartment',
    'house-trained', 'crate-trained', 'purebred', 'service dog',
    'rare', 'hypoallergenic'
  ];

  // Use breed temperament data to gate behavioral claims — score >= 2 means the breed
  // is moderately/strongly known for that trait, so the claim is fair game.
  const breedTemps = getMultiBreedTemperaments(dog.breeds ?? []);
  const breedQuietScore = breedTemps['quiet'] ?? 0;
  const breedEagerScore = breedTemps['eager-to-please'] ?? 0;

  // Ban quiet/not-barky claims unless the breed is known for it OR dog is explicitly quiet
  if (dog.barky !== false && breedQuietScore < 2) {
    banned.push('not barky', 'not especially barky', 'minimal barking', 'low noise', 'rarely barks', 'seldom barks', 'doesn\'t bark much');
  }

  // Ban shedding claims — no breed-level shedding data in the system, so only allow
  // if dog.shedLevel is explicitly set by inferred traits
  if (dog.shedLevel !== 'low') {
    banned.push('low shedding', 'minimal shedding', 'doesn\'t shed', 'light shedder', 'low shed', 'barely sheds', 'hypoallergenic-friendly');
  }

  // Ban training ease claims unless the breed is known for eagerness to please
  if (breedEagerScore < 2) {
    banned.push('easy to train', 'highly trainable', 'quick learner', 'easily trained', 'trains easily');
  }

  // Ban kid/cat compatibility claims unless grounded in inferred traits or user flags.
  // These are too individual to generalize from breed alone.
  const dogTraitsLower = (dog.temperament ?? []).map(t => t.toLowerCase());
  const hasKidEvidence = dogTraitsLower.includes('kid-friendly') || eff.flags.kidFriendly;
  const hasCatEvidence = dogTraitsLower.includes('cat-friendly') || eff.flags.catFriendly;

  if (!hasKidEvidence) {
    banned.push('kid-friendly', 'great with kids', 'good with kids', 'good with children', 'loves kids', 'loves children', 'gentle with children', 'great with children');
  }
  if (!hasCatEvidence) {
    banned.push('cat-friendly', 'good with cats', 'great with cats', 'lives with cats');
  }

  const addMulti = (vals: string[] | undefined, origin: Origin) => {
    if (!vals?.length) return;
    if (origin !== 'user' && origin !== 'guidance') return;
    for (const v of vals) prefs.push(v.toLowerCase());
  };
  const addSingle = (val: string | undefined, origin?: Origin) => {
    if (!val) return;
    if (origin !== 'user' && origin !== 'guidance') return;
    prefs.push(val.toLowerCase());
  };

  addMulti(eff.age.value, eff.age.origin);
  addMulti(eff.size.value, eff.size.origin);
  if (eff.energy) addSingle(eff.energy.value, eff.energy.origin);
  addMulti(eff.temperament.value, eff.temperament.origin);

  if (eff.flags.quietPreferred) prefs.push('quiet');
  if (eff.flags.lowMaintenance) prefs.push('low maintenance');
  if (eff.flags.kidFriendly) prefs.push('kid-friendly');
  if (eff.flags.catFriendly) prefs.push('cat-friendly');
  if (eff.flags.apartmentOk) prefs.push('apartment');

  if (dog.age) dogTraits.push(dog.age.toLowerCase());
  if (dog.size) dogTraits.push(dog.size.toLowerCase());
  if (dog.energy) dogTraits.push(`${dog.energy.toLowerCase()} energy`);
  if (dog.gender) {
    const genderLower = dog.gender.toLowerCase();
    if (genderLower && genderLower !== 'unknown') {
      dogTraits.push(genderLower);
    }
  }
  if (dog.hypoallergenic) dogTraits.push('hypoallergenic');
  if (dog.barky === false) dogTraits.push('not barky');
  for (const t of dog.temperament ?? []) dogTraits.push(t.toLowerCase());
  for (const b of dog.breeds ?? []) dogTraits.push(b.toLowerCase());

  return {
    prefs: [...new Set(prefs)],
    dogTraits: [...new Set(dogTraits)],
    banned,
  };
}


