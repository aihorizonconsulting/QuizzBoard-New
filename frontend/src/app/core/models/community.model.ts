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

export type ResourceKind = 'FILE' | 'LINK';
export type ResourceFileType = 'PDF' | 'DOC' | 'SLIDES' | 'SHEET' | 'ZIP' | 'IMAGE' | 'MEDIA' | 'LINK' | 'OTHER';

/** Document déposé (téléchargé via l'API, réservé aux membres) ou lien externe. */
export interface ResourceFile {
  id: string;
  title: string;
  description?: string | null;
  kind: ResourceKind;
  fileType: ResourceFileType;
  fileSize?: string | null;
  /** Adresse du lien externe (LINK uniquement). */
  fileUrl?: string | null;
  originalFileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  uploadedById?: string | null;
  uploadedByName: string;
  uploadedAt: string;
  downloadCount: number;
}

export type MeetingPlatform = 'GOOGLE_MEET' | 'ZOOM' | 'TEAMS' | 'JITSI' | 'OTHER';

export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  meetingUrl: string;
  platform: MeetingPlatform;
  scheduledAt: string;
  durationMinutes: number;
  hostName: string;
  createdById?: string | null;
}

export interface MeetingForm {
  title: string;
  description?: string;
  meetingUrl?: string;
  platform: MeetingPlatform;
  scheduledAt: string;
  durationMinutes: number;
  notifyMembers: boolean;
}

/** CREATOR = créateur, MODERATOR = modérateur, STUDENT = membre ; ADMIN = administrateur de la plateforme non membre. */
export type CommunityRole = 'CREATOR' | 'MODERATOR' | 'STUDENT' | 'ADMIN';

export interface CommunityMember {
  userId: string;
  name: string;
  /** Visible seulement par l'animation (et pour soi-même). */
  email?: string | null;
  avatarUrl?: string | null;
  role: 'CREATOR' | 'MODERATOR' | 'STUDENT';
  joinedAt: string;
  /** Sur les quiz partagés dans la communauté. */
  quizzesCompleted: number;
  totalXp: number;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  category?: string;
  /** null pour une communauté privée dont on n'est pas membre. */
  accessCode: string | null;
  creatorId: string;
  creatorName: string;
  coverImage?: string | null;
  isPrivate: boolean;
  membersCanShare: boolean;
  membersCount: number;
  quizzesCount: number;
  topicsCount: number;
  resourcesCount: number;
  meetingsCount: number;
  createdAt: string;
  /** Rôle de l'utilisateur connecté ; null s'il n'est pas membre. */
  myRole: CommunityRole | null;
  canManage: boolean;
  canShare: boolean;
  sharedQuizIds?: string[];
  /** Détail seulement (null dans la liste). */
  members?: CommunityMember[] | null;
  topics?: ForumTopic[] | null;
  resources?: ResourceFile[] | null;
  meetings?: Meeting[] | null;
}

/** Sujet de forum vu par l'administration (modération). */
export interface ModeratedTopic {
  id: string;
  communityId: string;
  communityName: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  commentsCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isReported: boolean;
  createdAt: string;
}
