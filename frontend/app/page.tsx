import type { Metadata } from 'next';
import HomePageClient from '@/components/HomePageClient';

export const metadata: Metadata = {
  title: "Find your perfect rescue dog",
  description: "Personalized rescue-dog matches for your lifestyle. Because finding your best friend shouldn't feel like a full-time job.",
  openGraph: {
    type: "website",
    url: "https://dogyenta.com",
    title: "Find your perfect rescue dog",
    description: "Personalized rescue-dog matches for your lifestyle. Because finding your best friend shouldn't feel like a full-time job.",
    images: [
      {
        url: "https://dogyenta.com/hero-dogyenta.png",
        width: 1240,
        height: 1240,
        alt: "Matchmaker surrounded by happy rescue dogs"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Find your perfect rescue dog",
    description: "Personalized rescue-dog matches for your lifestyle. Because finding your best friend shouldn't feel like a full-time job.",
    images: ["https://dogyenta.com/hero-dogyenta.png"]
  }
};

export default function HomePage() {
  try {
    return <HomePageClient />;
  } catch (error) {
    console.error('❌ HomePage error:', error);
    return (
      <div>
        <h1>Error loading page</h1>
        <p>Something went wrong: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}