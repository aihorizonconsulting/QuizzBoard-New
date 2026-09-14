export interface ForumComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likesCount: number;
}

export interface ForumTopic {
  id: string;
  communityId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isPinned: boolean;
  isLocked?: boolean;
  isReported?: boolean;
  createdAt: string;
  commentsCount: number;
  comments: ForumComment[];
}

export interface ResourceFile {
  id: string;
  communityId: string;
  title: string;
  fileType: 'PDF' | 'DOC' | 'ZIP' | 'IMAGE';
  fileSize: string;
  fileUrl: string;
  uploadedByName: string;
  uploadedAt: string;
  downloadCount: number;
}

export interface Meeting {
  id: string;
  communityId: string;
  title: string;
  description: string;
  meetingUrl: string;
  platform: 'GOOGLE_MEET' | 'ZOOM' | 'JITSI' | 'TEAMS';
  scheduledAt: string;
  durationMinutes: number;
  hostName: string;
  isLive: boolean;
}

export interface CommunityMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'CREATOR' | 'STUDENT' | 'MODERATOR';
  joinedAt: string;
  quizzesCompleted: number;
  totalXp: number;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  category?: string;
  accessCode: string;
  creatorId: string;
  creatorName: string;
  coverImage?: string;
  isPrivate: boolean;
  membersCount: number;
  quizzesCount: number;
  topicsCount: number;
  resourcesCount: number;
  meetingsCount: number;
  createdAt: string;
  sharedQuizIds?: string[];
  members?: CommunityMember[];
  topics?: ForumTopic[];
  resources?: ResourceFile[];
  meetings?: Meeting[];
}
