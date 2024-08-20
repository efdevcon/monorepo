export interface Event {
  id: string;
  edition: number;
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  venue_name?: string;
  venue_description?: string;
  venue_address?: string;
  venue_website?: string;
  venue_directions?: string;
}

export interface ArchiveVideo {
  id: string;
  sourceId?: string;
  slug: string;
  edition: number;
  title: string;
  relatedVideos: ArchiveVideo[];
  description: string;
  slidesUrl?: string;
  youtubeUrl: string;
  image?: any;
  imageUrl?: string;
  ipfsHash?: string;
  ethernaIndex?: string;
  ethernaPermalink?: string;
  duration: number;
  expertise: string;
  type: string;
  track: string;
  keywords: string[];
  tags: string[];
  speakers: string[];
  profiles: UserProfile[];
}

export interface UserProfile {
  id: string;
  slug: string;
  name: string;
  role: string;
  description: string;
  imageUrl?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  categories: string[];
  curators: string[];
  profiles: UserProfile[];
  videos: ArchiveVideo[];
}
