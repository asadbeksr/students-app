import { GiphyFetch } from '@giphy/js-fetch-api';

class GiphyService {
  private giphyClient: GiphyFetch | null = null;
  private fallbackKey = '0gaf9FTqAzV5QpSSQKcx8h4hit0yAD8m';

  initialize(apiKey: string) {
    if (!apiKey && !this.fallbackKey) {
      console.warn('Giphy API key not provided');
      this.giphyClient = null;
      return;
    }
    this.giphyClient = new GiphyFetch(apiKey || this.fallbackKey);
  }

  isInitialized(): boolean {
    return this.giphyClient !== null;
  }

  async getRandomGif(tag: string): Promise<string | null> {
    if (!this.giphyClient) {
      this.initialize(process.env.NEXT_PUBLIC_GIPHY_API_KEY || this.fallbackKey);
    }
    if (!this.giphyClient) return null;
    
    try {
      const offset = Math.floor(Math.random() * 50);
      const { data } = await this.giphyClient.search(tag, {
        limit: 10,
        offset,
        rating: 'pg-13',
        lang: 'en',
      });

      if (data.length === 0) return null;

      const randomGif = data[Math.floor(Math.random() * data.length)];
      return randomGif.images.fixed_height_small.url;
    } catch (error) {
      console.error('Error fetching random GIF:', error);
      return null;
    }
  }
}

export const giphyService = new GiphyService();
