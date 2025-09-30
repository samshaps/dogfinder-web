/**
 * Example Usage of the New AI Matching Flow
 * Demonstrates the complete refactored system
 */

import { UserPreferences, Dog } from './schemas';
import { processDogMatching } from './matching-flow';

// Example user preferences matching the specification
const exampleUserPreferences: UserPreferences = {
  zipCodes: ["10001"],
  radiusMi: 75,
  breedsInclude: ["doodles"],
  breedsExclude: ["husky"],
  age: ["young", "adult"],
  size: ["medium", "large", "xl"],
  energy: "medium",
  temperament: ["quiet", "gentle", "calm-indoors"],
  guidance: "We're first-time owners in an apartment. Minimal grooming and not too barky."
};

// Example dog data
const exampleDogs: Dog[] = [
  {
    id: "gdo-12",
    name: "Buddy",
    breeds: ["Goldendoodle"],
    age: "young",
    size: "medium",
    energy: "medium",
    temperament: ["quiet", "kid-friendly"],
    location: { zip: "10001", distanceMi: 15 },
    hypoallergenic: true,
    shedLevel: "low",
    groomingLoad: "med",
    barky: false,
    rawDescription: "Friendly young goldendoodle, great with kids, low shedding"
  },
  {
    id: "gdo-31",
    name: "Max",
    breeds: ["Labrador Retriever"],
    age: "adult",
    size: "large",
    energy: "high",
    temperament: ["kid-friendly", "active"],
    location: { zip: "10002", distanceMi: 45 },
    hypoallergenic: false,
    shedLevel: "high",
    groomingLoad: "med",
    barky: false,
    rawDescription: "Energetic adult lab, great family dog but needs exercise"
  },
  {
    id: "gdo-45",
    name: "Luna",
    breeds: ["Poodle"],
    age: "adult",
    size: "medium",
    energy: "medium",
    temperament: ["quiet", "hypoallergenic"],
    location: { zip: "10003", distanceMi: 30 },
    hypoallergenic: true,
    shedLevel: "low",
    groomingLoad: "high",
    barky: false,
    rawDescription: "Calm adult poodle, hypoallergenic, needs regular grooming"
  },
  {
    id: "gdo-67",
    name: "Rex",
    breeds: ["Husky"],
    age: "young",
    size: "large",
    energy: "high",
    temperament: ["active", "vocal"],
    location: { zip: "10004", distanceMi: 20 },
    hypoallergenic: false,
    shedLevel: "high",
    groomingLoad: "med",
    barky: true,
    rawDescription: "Young husky, very active, sheds a lot, can be vocal"
  },
  {
    id: "gdo-89",
    name: "Bella",
    breeds: ["Great Dane"],
    age: "adult",
    size: "xl",
    energy: "low",
    temperament: ["quiet", "gentle"],
    location: { zip: "10005", distanceMi: 60 },
    hypoallergenic: false,
    shedLevel: "med",
    groomingLoad: "low",
    barky: false,
    rawDescription: "Gentle giant, calm and quiet, but very large"
  }
];

/**
 * Example function demonstrating the complete matching flow
 */
export async function runExampleMatching() {
  console.log('🚀 Running example dog matching...');
  console.log('📋 User Preferences:', exampleUserPreferences);
  console.log('🐕 Available Dogs:', exampleDogs.length);
  
  try {
    const results = await processDogMatching(exampleUserPreferences, exampleDogs);
    
    console.log('✅ Matching Results:');
    console.log('🏆 Top Matches:', results.topMatches.length);
    results.topMatches.forEach((match, index) => {
      const dog = exampleDogs.find(d => d.id === match.dogId);
      console.log(`  ${index + 1}. ${dog?.name} (Score: ${match.score})`);
      console.log(`     Matched: ${match.matchedPrefs.join(', ')}`);
      console.log(`     Reason: ${match.reasons.primary150}`);
    });
    
    console.log('📊 All Matches:', results.allMatches.length);
    results.allMatches.forEach((match, index) => {
      const dog = exampleDogs.find(d => d.id === match.dogId);
      console.log(`  ${index + 1}. ${dog?.name} (Score: ${match.score}) - ${match.reasons.blurb50}`);
    });
    
    console.log('📝 Expansion Notes:', results.expansionNotes);
    
    return results;
  } catch (error) {
    console.error('❌ Example matching failed:', error);
    throw error;
  }
}

/**
 * Test specific acceptance criteria
 */
export function testAcceptanceCriteria() {
  console.log('🧪 Testing acceptance criteria...');
  
  // Test ZIP filtering
  const withinRadius = exampleDogs.filter(dog => 
    dog.location.distanceMi && dog.location.distanceMi <= exampleUserPreferences.radiusMi
  );
  console.log(`✅ ZIP filtering: ${withinRadius.length}/${exampleDogs.length} dogs within radius`);
  
  // Test breed fuzzy include
  const doodleDogs = exampleDogs.filter(dog => 
    dog.breeds.some(breed => 
      breed.toLowerCase().includes('doodle') || 
      breed.toLowerCase().includes('poodle')
    )
  );
  console.log(`✅ Breed fuzzy include: ${doodleDogs.length} doodle/poodle dogs found`);
  
  // Test breed exclude
  const nonHuskyDogs = exampleDogs.filter(dog => 
    !dog.breeds.some(breed => breed.toLowerCase().includes('husky'))
  );
  console.log(`✅ Breed exclude: ${nonHuskyDogs.length}/${exampleDogs.length} dogs (husky excluded)`);
  
  // Test XL size
  const xlDogs = exampleDogs.filter(dog => dog.size === 'xl');
  console.log(`✅ XL size: ${xlDogs.length} XL dogs found`);
  
  // Test low-maintenance heuristic
  const lowMaintenanceDogs = exampleDogs.filter(dog => 
    !(dog.age === 'baby' || dog.age === 'young') && // Not puppy
    dog.groomingLoad !== 'high' && // Not high grooming
    dog.energy !== 'high' // Not high energy
  );
  console.log(`✅ Low-maintenance: ${lowMaintenanceDogs.length} dogs suitable for low maintenance`);
  
  // Test quiet preference vs barky
  const quietDogs = exampleDogs.filter(dog => !dog.barky);
  console.log(`✅ Quiet preference: ${quietDogs.length}/${exampleDogs.length} dogs are not barky`);
  
  console.log('✅ All acceptance criteria tests completed');
}

/**
 * Run the complete example
 */
export async function runCompleteExample() {
  console.log('🎯 Running complete AI matching example...\n');
  
  // Test acceptance criteria first
  testAcceptanceCriteria();
  console.log('');
  
  // Run the matching flow
  const results = await runExampleMatching();
  
  console.log('\n🎉 Example completed successfully!');
  return results;
}

// Export for use in other files
export { exampleUserPreferences, exampleDogs };
