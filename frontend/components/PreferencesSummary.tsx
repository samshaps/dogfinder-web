import Link from 'next/link';
import { Edit3 } from 'lucide-react';

interface PreferencesSummaryProps {
  searchQuery: {
    zip: string;
    age: string[];
    size: string[];
    includeBreeds: string[];
    excludeBreeds: string[];
    temperament: string[];
    energy: string;
    guidance: string;
  };
}

export default function PreferencesSummary({ searchQuery }: PreferencesSummaryProps) {
  const preferences = [];
  
  // Build preferences array in order: Age • Size • Energy • Temperament • Include • Exclude
  if (searchQuery.age.length > 0) {
    preferences.push({ type: 'age', label: `Age: ${searchQuery.age.join(', ')}`, icon: '👶' });
  }
  if (searchQuery.size.length > 0) {
    preferences.push({ type: 'size', label: `Size: ${searchQuery.size.join(', ')}`, icon: '📏' });
  }
  if (searchQuery.energy) {
    preferences.push({ type: 'energy', label: `Energy: ${searchQuery.energy}`, icon: '⚡' });
  }
  if (searchQuery.temperament.length > 0) {
    preferences.push({ type: 'temperament', label: `Temperament: ${searchQuery.temperament.join(', ')}`, icon: '❤️' });
  }
  if (searchQuery.includeBreeds.length > 0) {
    preferences.push({ type: 'include', label: `Include: ${searchQuery.includeBreeds.join(', ')}`, icon: '✅' });
  }
  if (searchQuery.excludeBreeds.length > 0) {
    preferences.push({ type: 'exclude', label: `Exclude: ${searchQuery.excludeBreeds.join(', ')}`, icon: '❌' });
  }

  if (preferences.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-sm text-slate-500 mr-2">Your preferences:</span>
      {preferences.map((pref, index) => (
        <span key={index} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-full px-2.5 py-1 text-sm">
          <span>{pref.icon}</span>
          <span>{pref.label}</span>
        </span>
      ))}
      <Link 
        href={`/find?${new URLSearchParams({
          zip: searchQuery.zip,
          age: searchQuery.age.join(','),
          size: searchQuery.size.join(','),
          includeBreeds: searchQuery.includeBreeds.join(','),
          excludeBreeds: searchQuery.excludeBreeds.join(','),
          temperament: searchQuery.temperament.join(','),
          energy: searchQuery.energy,
          guidance: searchQuery.guidance
        }).toString()}`}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium ml-auto"
      >
        <Edit3 className="w-3 h-3" />
        Edit
      </Link>
    </div>
  );
}

