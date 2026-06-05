import { Channel } from '../types';

export function parseM3U(content: string): Channel[] {
  const channels: Channel[] = [];
  const lines = content.replace(/\r/g, '').split('\n');
  const seenUrls = new Set<string>();
  
  let currentChannel: Partial<Channel> = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // Parse attributes
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);
      
      // Parse name (everything after the last comma)
      const lastCommaIndex = line.lastIndexOf(',');
      const name = lastCommaIndex !== -1 ? line.substring(lastCommaIndex + 1).trim() : 'Unknown Channel';
      
      currentChannel = {
        name,
        logo: tvgLogoMatch ? tvgLogoMatch[1].trim() : '',
        group: groupTitleMatch ? groupTitleMatch[1].trim() : 'Uncategorized',
      };
    } else if (line && !line.startsWith('#')) {
      // URL line
      if (currentChannel.name) {
        const streamUrl = line.trim();
        // Prevent duplicate streams
        if (!seenUrls.has(streamUrl)) {
          seenUrls.add(streamUrl);
          // Use stream URL as stable ID for favorites persistence
          currentChannel.id = streamUrl;
          currentChannel.url = streamUrl;
          channels.push(currentChannel as Channel);
        }
        currentChannel = {}; // reset for next
      }
    }
  }
  
  return channels;
}
