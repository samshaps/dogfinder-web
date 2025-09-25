'use client';

import { useState, useEffect } from 'react';
import { searchDogs, DogsResponse, Dog } from '@/lib/api';

export default function TestApiPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDogs() {
      try {
        setLoading(true);
        const response: DogsResponse = await searchDogs({
          zip: '11211',
          radius: 50,
          age: 'baby,young',
          limit: 6
        });
        setDogs(response.items);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dogs');
      } finally {
        setLoading(false);
      }
    }

    fetchDogs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dogs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API Test - Found {dogs.length} Dogs</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dogs.map((dog) => (
            <div key={dog.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{dog.name}</h3>
                <p className="text-gray-600 mb-2">
                  {(dog.breeds && dog.breeds.length > 0 ? dog.breeds.join(', ') : 'Unknown Breed')} • {dog.age} • {dog.size}
                </p>
                <p className="text-sm text-gray-500 mb-4">{dog.location}</p>
                {dog.description && (
                  <p className="text-sm text-gray-700 line-clamp-3">{dog.description}</p>
                )}
                <div className="mt-4">
                  <a
                    href={dog.petfinderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    View on Petfinder
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {dogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No dogs found. Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
