import Link from 'next/link';

export default function RateLimitPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Cute dog emoji */}
        <div className="text-6xl mb-6">🐕</div>
        
        {/* Main message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          We've Been Hugged to Death! 💕
        </h1>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          Our furry friends are so popular that we've temporarily hit our data limits. 
          Don't worry - we're working hard to get more doggy data flowing!
        </p>
        
        {/* Cute illustration */}
        <div className="text-4xl mb-6">
          🐶💕🐕💕🐾
        </div>
        
        {/* Action buttons */}
        <div className="space-y-3">
          <Link 
            href="/"
            className="block w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Try Again in a Few Minutes
          </Link>
          
          <Link 
            href="/about"
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Learn More About DogYenta
          </Link>
        </div>
        
        {/* Fun fact */}
        <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Fun Fact:</span> Did you know that dogs can understand up to 250 words and gestures? 
            That's why we need so much data to find your perfect match! 🎾
          </p>
        </div>
      </div>
    </div>
  );
}
