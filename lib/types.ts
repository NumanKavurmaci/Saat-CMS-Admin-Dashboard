export type ServiceHealth = {
  status: "ok";
  service: string;
};

export type ServiceReadiness = {
  status: "ready" | "not_ready";
  service: string;
  errorCode?: string;
  message?: string;
};

export type ContentType = "SERIES" | "SEASON" | "EPISODE" | "MOVIE";
export type VideoQuality = "SD" | "HD" | "UHD_4K";

export type CmsContent = {
  id: string;
  type: ContentType;
  title: string;
  parentId: string | null;
  parentalRating: string | null;
  genre: string | null;
  quality: VideoQuality | null;
  isPremium: boolean | null;
  playbackUrl: string | null;
  geoBlockCountriesOverride: boolean;
  geoBlockCountries: string[];
  createdAt: string;
  updatedAt: string;
};

export type LiveChannel = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type EpgProgram = {
  id: string;
  channelId: string;
  programName: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
};

export type PageResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type PlaybackResponse = {
  contentId: string;
  requestContext: {
    userId: string;
    userCountry: string;
    deviceType: "Mobile" | "SmartTV" | "Web";
  };
  playback: { playbackUrl: string };
  metadata: {
    type: ContentType;
    title: string;
    parentalRating: string | null;
    genre: string | null;
    quality: VideoQuality | null;
    isPremium: boolean | null;
    geoBlockCountries: string[];
  };
};
