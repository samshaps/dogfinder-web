export type NormalizedDogGender = 'male' | 'female' | 'unknown';

export type DogPronouns = {
  gender: NormalizedDogGender;
  subject: string;
  object: string;
  possessiveAdjective: string;
  possessive: string;
  reflexive: string;
  noun: string;
  subjectCapitalized: string;
  objectCapitalized: string;
  possessiveAdjectiveCapitalized: string;
};

const PREPOSITION_SET = new Set([
  'to', 'for', 'with', 'about', 'near', 'like', 'around', 'on', 'in', 'into', 'onto', 'at', 'from', 'of',
  'over', 'under', 'after', 'before', 'without', 'within', 'through', 'by', 'toward', 'towards', 'across',
  'among', 'between', 'beside', 'besides', 'inside', 'outside', 'past', 'since', 'within', 'along', 'upon'
]);

const OBJECT_VERB_SET = new Set([
  'adopt', 'bring', 'cuddle', 'embrace', 'give', 'help', 'hug', 'keep', 'love', 'meet',
  'pet', 'see', 'snuggle', 'take', 'train', 'visit', 'welcome'
]);

function capitalize(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function normalizeDogGender(gender?: string | null): NormalizedDogGender {
  const raw = String(gender ?? '').trim().toLowerCase();
  if (!raw) return 'unknown';
  if (['male', 'm', 'boy', 'man', 'gentleman'].includes(raw)) return 'male';
  if (['female', 'f', 'girl', 'woman', 'lady'].includes(raw)) return 'female';
  return 'unknown';
}

export function getDogPronouns(gender?: string | null): DogPronouns {
  const normalized = normalizeDogGender(gender);
  if (normalized === 'male') {
    return {
      gender: 'male',
      subject: 'he',
      object: 'him',
      possessiveAdjective: 'his',
      possessive: 'his',
      reflexive: 'himself',
      noun: 'this boy',
      subjectCapitalized: 'He',
      objectCapitalized: 'Him',
      possessiveAdjectiveCapitalized: 'His'
    };
  }
  if (normalized === 'female') {
    return {
      gender: 'female',
      subject: 'she',
      object: 'her',
      possessiveAdjective: 'her',
      possessive: 'hers',
      reflexive: 'herself',
      noun: 'this girl',
      subjectCapitalized: 'She',
      objectCapitalized: 'Her',
      possessiveAdjectiveCapitalized: 'Her'
    };
  }
  return {
    gender: 'unknown',
    subject: 'they',
    object: 'them',
    possessiveAdjective: 'their',
    possessive: 'theirs',
    reflexive: 'themselves',
    noun: 'this dog',
    subjectCapitalized: 'They',
    objectCapitalized: 'Them',
    possessiveAdjectiveCapitalized: 'Their'
  };
}

function getPreviousWord(input: string, index: number): string {
  const slice = input.slice(0, index);
  const match = slice.match(/([A-Za-z]+)[^A-Za-z]*$/);
  return match ? match[1].toLowerCase() : '';
}

function isObjectContext(previousWord: string): boolean {
  if (!previousWord) return false;
  if (PREPOSITION_SET.has(previousWord)) return true;
  if (OBJECT_VERB_SET.has(previousWord)) return true;
  return false;
}

/**
 * Replace generic "it/its" references with gender-aware pronouns while
 * attempting to preserve grammatical context.
 */
export function applyDogPronouns(text: string, pronouns: DogPronouns): string {
  if (!text) return text;
  let result = text;

  // Replace contractions first (it's / It’s)
  const apostrophes = [`'s`, '’s'];
  for (const ap of apostrophes) {
    const patternLower = new RegExp(`\\bit${ap}\\b`, 'g');
    const patternUpper = new RegExp(`\\bIt${ap}\\b`, 'g');
    result = result
      .replace(patternLower, `${pronouns.subject}${ap}`)
      .replace(patternUpper, `${pronouns.subjectCapitalized}${ap}`);
  }

  // Replace "it is/was/will/would/could/should"
  const helperVerbs = ['is', 'was', 'will', 'would', 'could', 'should', 'can', 'has', 'have', 'had', 'does', 'did'];
  for (const verb of helperVerbs) {
    const patternLower = new RegExp(`\\bit\\s+${verb}\\b`, 'g');
    const patternUpper = new RegExp(`\\bIt\\s+${verb}\\b`, 'g');
    result = result
      .replace(patternLower, `${pronouns.subject} ${verb}`)
      .replace(patternUpper, `${pronouns.subjectCapitalized} ${verb}`);
  }

  // Replace possessive "its"
  result = result
    .replace(/\bits\b/g, pronouns.possessiveAdjective)
    .replace(/\bIts\b/g, pronouns.possessiveAdjectiveCapitalized);

  // Replace reflexive "itself"
  result = result
    .replace(/\bitself\b/g, pronouns.reflexive)
    .replace(/\bItself\b/g, capitalize(pronouns.reflexive));

  // Replace standalone "it" / "It"
  result = result.replace(/\bIt\b/g, pronouns.subjectCapitalized);
  result = result.replace(/\bit\b/g, (match, offset, input) => {
    const previousWord = getPreviousWord(input as string, offset as number);
    if (isObjectContext(previousWord)) {
      return pronouns.object;
    }
    return pronouns.subject;
  });

  if (pronouns.gender === 'unknown') {
    result = result
      .replace(/\bThey is\b/g, 'They are')
      .replace(/\bthey is\b/g, 'they are')
      .replace(/\bThey was\b/g, 'They were')
      .replace(/\bthey was\b/g, 'they were')
      .replace(/\bThey has\b/g, 'They have')
      .replace(/\bthey has\b/g, 'they have')
      .replace(/\bThey does\b/g, 'They do')
      .replace(/\bthey does\b/g, 'they do');

    const pluralVerbFixes: Array<[RegExp, string]> = [
      [/\bThey loves\b/g, 'They love'],
      [/\bthey loves\b/g, 'they love'],
      [/\bThey enjoys\b/g, 'They enjoy'],
      [/\bthey enjoys\b/g, 'they enjoy'],
      [/\bThey needs\b/g, 'They need'],
      [/\bthey needs\b/g, 'they need'],
      [/\bThey wants\b/g, 'They want'],
      [/\bthey wants\b/g, 'they want'],
      [/\bThey prefers\b/g, 'They prefer'],
      [/\bthey prefers\b/g, 'they prefer'],
      [/\bThey likes\b/g, 'They like'],
      [/\bthey likes\b/g, 'they like'],
      [/\bThey helps\b/g, 'They help'],
      [/\bthey helps\b/g, 'they help'],
      [/\bThey makes\b/g, 'They make'],
      [/\bthey makes\b/g, 'they make'],
      [/\bThey gives\b/g, 'They give'],
      [/\bthey gives\b/g, 'they give'],
      [/\bThey brings\b/g, 'They bring'],
      [/\bthey brings\b/g, 'they bring'],
      [/\bThey offers\b/g, 'They offer'],
      [/\bthey offers\b/g, 'they offer'],
      [/\bThey provides\b/g, 'They provide'],
      [/\bthey provides\b/g, 'they provide'],
      [/\bThey adores\b/g, 'They adore'],
      [/\bthey adores\b/g, 'they adore'],
      [/\bThey calms\b/g, 'They calm'],
      [/\bthey calms\b/g, 'they calm'],
      [/\bThey soothes\b/g, 'They soothe'],
      [/\bthey soothes\b/g, 'they soothe'],
    ];

    for (const [pattern, replacement] of pluralVerbFixes) {
      result = result.replace(pattern, replacement);
    }
  }

  return result;
}

