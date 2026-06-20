import { decryptToken } from "../../utils/token-encryption.js";
import * as linkedin from "../linkedin-api.js";
import * as twitter from "../twitter-api.js";
import * as tiktok from "../tiktok-api.js";
import * as youtube from "../youtube-api.js";

export interface ScrapedPost {
  id: string;
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  likes: number;
  comments: number;
  shares: number;
  postedAt: string;
}

export interface ScrapedProfile {
  platformUserId: string;
  username: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  avatarUrl: string | null;
  recentPosts: ScrapedPost[];
}

function parseMockPosts(platform: string, count: number = 10): ScrapedPost[] {
  const topics = [
    { caption: "Excited to share our latest innovation in AI-powered marketing automation!", hashtags: ["#AI", "#Marketing", "#Innovation"] },
    { caption: "Behind the scenes of our product development team at work!", hashtags: ["#BehindTheScenes", "#ProductDev"] },
    { caption: "Customer success story: How we helped a brand grow 3x in 6 months", hashtags: ["#CustomerSuccess", "#CaseStudy"] },
    { caption: "New feature alert! Check out our latest update.", hashtags: ["#NewFeature", "#ProductUpdate"] },
    { caption: "Industry insights: The future of social media marketing", hashtags: ["#IndustryInsights", "#SocialMedia"] },
  ];
  const posts: ScrapedPost[] = [];
  for (let i = 0; i < count; i++) {
    const seed = topics[i % topics.length]!;
    posts.push({
      id: `mock-${platform}-post-${i}`,
      caption: seed.caption,
      hashtags: [...seed.hashtags],
      mediaUrls: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800"],
      likes: Math.floor(Math.random() * 500) + 10,
      comments: Math.floor(Math.random() * 50) + 1,
      shares: Math.floor(Math.random() * 100) + 1,
      postedAt: new Date(Date.now() - i * 86400000).toISOString(),
    });
  }
  return posts;
}

export async function scrapeFacebook(accessToken: string, pageId: string, pageAccessToken?: string): Promise<ScrapedProfile> {
  const token = pageAccessToken || accessToken;

  if (token.startsWith("mock-") || !token) {
    return {
      platformUserId: pageId,
      username: "Brand Page",
      displayName: "Brand Page",
      followerCount: Math.floor(Math.random() * 10000) + 1000,
      followingCount: Math.floor(Math.random() * 500) + 50,
      postCount: 45,
      avatarUrl: null,
      recentPosts: parseMockPosts("facebook", 10),
    };
  }

  const fields = "id,name,username,fan_count,followers_count,posts.limit(10){id,message,story,created_time,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)}";
  const url = new URL(`https://graph.facebook.com/v18.0/${pageId}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", token);

  const res = await fetch(url);
  const data = await res.json() as Record<string, unknown>;

  const postsData = (data.posts as { data?: Record<string, unknown>[] })?.data ?? [];
  const recentPosts: ScrapedPost[] = postsData.map((p: Record<string, unknown>) => ({
    id: String(p.id ?? ""),
    caption: String(p.message ?? p.story ?? ""),
    hashtags: [],
    mediaUrls: [],
    likes: ((p.reactions as { summary?: { total_count?: number } })?.summary?.total_count ?? 0) as number,
    comments: ((p.comments as { summary?: { total_count?: number } })?.summary?.total_count ?? 0) as number,
    shares: Number((p.shares as { count?: number })?.count ?? 0),
    postedAt: String(p.created_time ?? new Date().toISOString()),
  }));

  return {
    platformUserId: pageId,
    username: String(data.username ?? data.name ?? "facebook-user"),
    displayName: String(data.name ?? "Facebook Page"),
    followerCount: Number(data.fan_count ?? data.followers_count ?? 0),
    followingCount: 0,
    postCount: recentPosts.length,
    avatarUrl: null,
    recentPosts,
  };
}

export async function scrapeInstagram(accessToken: string, accountId: string): Promise<ScrapedProfile> {
  if (accessToken.startsWith("mock-") || !accessToken) {
    return {
      platformUserId: accountId,
      username: "instagram_user",
      displayName: "Instagram Account",
      followerCount: Math.floor(Math.random() * 50000) + 500,
      followingCount: Math.floor(Math.random() * 1000) + 100,
      postCount: 120,
      avatarUrl: null,
      recentPosts: parseMockPosts("instagram", 10),
    };
  }

  const fields = "id,username,name,followers_count,follows_count,media_count,profile_picture_url,media.limit(10){id,caption,media_url,media_type,like_count,comments_count,timestamp}";
  const url = new URL(`https://graph.facebook.com/v18.0/${accountId}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url);
  const data = await res.json() as Record<string, unknown>;

  const mediaData = (data.media as { data?: Record<string, unknown>[] })?.data ?? [];
  const recentPosts: ScrapedPost[] = mediaData.map((m: Record<string, unknown>) => ({
    id: String(m.id ?? ""),
    caption: String((m.caption as string) ?? ""),
    hashtags: [],
    mediaUrls: [String(m.media_url ?? "")].filter(Boolean),
    likes: Number(m.like_count ?? 0),
    comments: Number(m.comments_count ?? 0),
    shares: 0,
    postedAt: String(m.timestamp ?? new Date().toISOString()),
  }));

  return {
    platformUserId: accountId,
    username: String(data.username ?? "instagram-user"),
    displayName: String(data.name ?? data.username ?? "Instagram Account"),
    followerCount: Number(data.followers_count ?? 0),
    followingCount: Number(data.follows_count ?? 0),
    postCount: Number(data.media_count ?? recentPosts.length),
    avatarUrl: (data.profile_picture_url as string) ?? null,
    recentPosts,
  };
}

export async function scrapeLinkedIn(accessToken: string, organizationId: string): Promise<ScrapedProfile> {
  if (accessToken.startsWith("mock-") || !accessToken) {
    return {
      platformUserId: organizationId,
      username: "company",
      displayName: "Company Page",
      followerCount: Math.floor(Math.random() * 15000) + 2000,
      followingCount: Math.floor(Math.random() * 200) + 20,
      postCount: 67,
      avatarUrl: null,
      recentPosts: parseMockPosts("linkedin", 10),
    };
  }

  const orgResponse = await fetch(`https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(id,localizedName,vanityName,logoV2(original~:playableStreams))))`, {
    headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202406" },
  });
  const orgData = await orgResponse.json() as { elements?: { "organizationalTarget~"?: { id?: string; localizedName?: string; vanityName?: string } }[] };
  const org = orgData.elements?.[0]?.["organizationalTarget~"];

  const postsResponse = await fetch(`https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:organization:${organizationId})&count=10`, {
    headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202406" },
  });
  const postsData = await postsResponse.json() as { elements?: Record<string, unknown>[] };

  const recentPosts: ScrapedPost[] = (postsData.elements ?? []).map((p: Record<string, unknown>) => {
    const commentary = (p.specificContent as Record<string, unknown>)?.["com.linkedin.ugc.ShareContent"] as Record<string, unknown>;
    return {
      id: String(p.id ?? ""),
      caption: String((commentary?.shareCommentary as Record<string, unknown>)?.text ?? ""),
      hashtags: [],
      mediaUrls: [],
      likes: Number((p as Record<string, unknown>).likesSummary ?? 0),
      comments: Number((p as Record<string, unknown>).commentsSummary ?? 0),
      shares: 0,
      postedAt: String(p.created ?? new Date().toISOString()),
    };
  });

  return {
    platformUserId: organizationId,
    username: org?.vanityName ?? "linkedin-company",
    displayName: org?.localizedName ?? "LinkedIn Company",
    followerCount: 0,
    followingCount: 0,
    postCount: recentPosts.length,
    avatarUrl: null,
    recentPosts,
  };
}

export async function scrapeTwitter(accessToken: string, userId: string): Promise<ScrapedProfile> {
  if (accessToken.startsWith("mock-") || !accessToken) {
    return {
      platformUserId: userId,
      username: "brand_tweets",
      displayName: "Brand Twitter",
      followerCount: Math.floor(Math.random() * 20000) + 1000,
      followingCount: Math.floor(Math.random() * 1000) + 100,
      postCount: 230,
      avatarUrl: null,
      recentPosts: parseMockPosts("twitter", 10),
    };
  }

  const userResponse = await fetch(`https://api.twitter.com/2/users/${userId}?user.fields=public_metrics,profile_image_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userData = await userResponse.json() as { data?: { name: string; username: string; public_metrics?: { followers_count: number; following_count: number; tweet_count: number }; profile_image_url?: string } };
  const user = userData.data;

  const tweetsResponse = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=public_metrics,created_at`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const tweetsData = await tweetsResponse.json() as { data?: Record<string, unknown>[] };

  const recentPosts: ScrapedPost[] = (tweetsData.data ?? []).map((t: Record<string, unknown>) => {
    const metrics = t.public_metrics as Record<string, number> ?? {};
    return {
      id: String(t.id ?? ""),
      caption: String(t.text ?? ""),
      hashtags: [],
      mediaUrls: [],
      likes: metrics.like_count ?? 0,
      comments: metrics.reply_count ?? 0,
      shares: metrics.retweet_count ?? 0,
      postedAt: String(t.created_at ?? new Date().toISOString()),
    };
  });

  return {
    platformUserId: userId,
    username: user?.username ?? "twitter-user",
    displayName: user?.name ?? "Twitter Account",
    followerCount: user?.public_metrics?.followers_count ?? 0,
    followingCount: user?.public_metrics?.following_count ?? 0,
    postCount: user?.public_metrics?.tweet_count ?? recentPosts.length,
    avatarUrl: user?.profile_image_url ?? null,
    recentPosts,
  };
}

export async function scrapeTikTok(accessToken: string, openId: string): Promise<ScrapedProfile> {
  if (accessToken.startsWith("mock-") || !accessToken) {
    return {
      platformUserId: openId,
      username: "tiktok_brand",
      displayName: "TikTok Brand",
      followerCount: Math.floor(Math.random() * 100000) + 1000,
      followingCount: Math.floor(Math.random() * 500) + 50,
      postCount: 34,
      avatarUrl: null,
      recentPosts: parseMockPosts("tiktok", 10),
    };
  }

  const userResponse = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,follower_count,following_count,avatar_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userData = await userResponse.json() as { data?: { user?: { display_name?: string; follower_count?: number; following_count?: number; avatar_url?: string } } };
  const user = userData.data?.user;

  const videosResponse = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,like_count,comment_count,share_count`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ max_count: 10 }),
  });
  const videosData = await videosResponse.json() as { data?: { videos?: Record<string, unknown>[] } };
  const videos = videosData.data?.videos ?? [];

  const recentPosts: ScrapedPost[] = videos.map((v: Record<string, unknown>) => ({
    id: String(v.id ?? ""),
    caption: String(v.title ?? ""),
    hashtags: [],
    mediaUrls: [],
    likes: Number(v.like_count ?? 0),
    comments: Number(v.comment_count ?? 0),
    shares: Number(v.share_count ?? 0),
    postedAt: String(v.create_time ?? new Date().toISOString()),
  }));

  return {
    platformUserId: openId,
    username: user?.display_name ?? "tiktok-user",
    displayName: user?.display_name ?? "TikTok Account",
    followerCount: user?.follower_count ?? 0,
    followingCount: user?.following_count ?? 0,
    postCount: videos.length,
    avatarUrl: user?.avatar_url ?? null,
    recentPosts,
  };
}

export async function scrapeYouTube(accessToken: string, channelId: string): Promise<ScrapedProfile> {
  if (accessToken.startsWith("mock-") || !accessToken) {
    return {
      platformUserId: channelId,
      username: "brandchannel",
      displayName: "Brand YouTube",
      followerCount: Math.floor(Math.random() * 50000) + 500,
      followingCount: 0,
      postCount: 89,
      avatarUrl: null,
      recentPosts: parseMockPosts("youtube", 10),
    };
  }

  const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const channelData = await channelResponse.json() as { items?: { snippet?: { title?: string; customUrl?: string; thumbnails?: { default?: { url?: string } } }; statistics?: { subscriberCount?: string; videoCount?: string } }[] };
  const channel = channelData.items?.[0];

  const videosResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=10&order=date&type=video`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const videosData = await videosResponse.json() as { items?: { id?: { videoId?: string }; snippet?: { title?: string; description?: string; publishedAt?: string } }[] };
  const items = videosData.items ?? [];

  const recentPosts: ScrapedPost[] = items.map((v) => ({
    id: String(v.id?.videoId ?? ""),
    caption: String(v.snippet?.title ?? ""),
    hashtags: [],
    mediaUrls: [],
    likes: 0,
    comments: 0,
    shares: 0,
    postedAt: String(v.snippet?.publishedAt ?? new Date().toISOString()),
  }));

  return {
    platformUserId: channelId,
    username: channel?.snippet?.customUrl ?? "youtube-channel",
    displayName: channel?.snippet?.title ?? "YouTube Channel",
    followerCount: Number(channel?.statistics?.subscriberCount ?? 0),
    followingCount: 0,
    postCount: Number(channel?.statistics?.videoCount ?? recentPosts.length),
    avatarUrl: channel?.snippet?.thumbnails?.default?.url ?? null,
    recentPosts,
  };
}

export async function scrapeInstagramBasic(accessToken: string, platformUserId: string): Promise<ScrapedProfile> {
  const graphBase = "https://graph.instagram.com";

  const profileUrl = new URL(`${graphBase}/me`);
  profileUrl.searchParams.set("fields", "user_id,username,name,account_type,profile_picture_url");
  profileUrl.searchParams.set("access_token", accessToken);

  const profileRes = await fetch(profileUrl);
  const profileData = await profileRes.json() as Record<string, unknown>;

  const mediaUrl = new URL(`${graphBase}/me/media`);
  mediaUrl.searchParams.set("fields", "id,caption,media_url,media_type,like_count,comments_count,timestamp");
  mediaUrl.searchParams.set("access_token", accessToken);

  const mediaRes = await fetch(mediaUrl);
  const mediaData = await mediaRes.json() as { data?: Record<string, unknown>[] };

  const recentPosts: ScrapedPost[] = (mediaData.data ?? []).map((m: Record<string, unknown>) => ({
    id: String(m.id ?? ""),
    caption: String(m.caption ?? ""),
    hashtags: [],
    mediaUrls: [String(m.media_url ?? "")].filter(Boolean),
    likes: Number(m.like_count ?? 0),
    comments: Number(m.comments_count ?? 0),
    shares: 0,
    postedAt: String(m.timestamp ?? new Date().toISOString()),
  }));

  return {
    platformUserId: String(profileData.user_id ?? platformUserId),
    username: String(profileData.username ?? "instagram-user"),
    displayName: String(profileData.name ?? profileData.username ?? "Instagram Account"),
    followerCount: 0,
    followingCount: 0,
    postCount: recentPosts.length,
    avatarUrl: (profileData.profile_picture_url as string) ?? null,
    recentPosts,
  };
}

export const platformScrapers: Record<string, (token: string, accountId: string, extraToken?: string) => Promise<ScrapedProfile>> = {
  facebook: (token, id, extra?) => scrapeFacebook(token, id, extra),
  instagram: (token, id) => scrapeInstagram(token, id),
  "instagram-basic": (token, id) => scrapeInstagramBasic(token, id),
  linkedin: (token, id) => scrapeLinkedIn(token, id),
  twitter: (token, id) => scrapeTwitter(token, id),
  tiktok: (token, id) => scrapeTikTok(token, id),
  youtube: (token, id) => scrapeYouTube(token, id),
};
