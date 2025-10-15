import { EffectivePreferences, Dog, Origin } from './schemas';

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


