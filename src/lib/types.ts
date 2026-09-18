// =====================================================================
// ASTRA RP — TYPES TYPESCRIPT DU DOMAINE MÉTIER
// =====================================================================

export type UserRole = 'admin' | 'staff' | 'promoter';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Promoter {
  id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  instagram_handle: string | null;
  slug: string;
  avatar_url: string | null;
  is_active: boolean;
  views_count?: number;
  created_at: string;
  updated_at: string;
}

export type EventStatus = 'draft' | 'published' | 'closed' | 'cancelled';

export interface ClubEvent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  status: EventStatus;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  instagram_handle: string | null;
  is_blacklisted?: boolean;
  blacklist_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export type RegistrationStatus = 'registered' | 'cancelled';

export interface Registration {
  id: string;
  event_id: string;
  promoter_id: string;
  guest_id: string;
  qr_token: string;
  status: RegistrationStatus;
  registered_at: string;
  cancelled_at: string | null;
  // Joins
  guest?: Guest;
  event?: ClubEvent;
  promoter?: Promoter;
}

export type EntryStatus = 'valid' | 'cancelled';

export interface Entry {
  id: string;
  registration_id: string;
  event_id: string;
  promoter_id: string;
  guest_id: string;
  scanned_by: string | null;
  scanned_at: string;
  status: EntryStatus;
  // Joins
  guest?: Guest;
  event?: ClubEvent;
  promoter?: Promoter;
  scanner?: Profile;
}

export interface LeaderboardItem {
  promoter_id: string;
  first_name: string;
  last_name: string;
  instagram_handle: string | null;
  slug: string;
  avatar_url: string | null;
  entries_count: number;
  registrations_count: number;
  attendance_rate: number; // Pourcentage (entries / registrations * 100)
  rank: number;
}

export type CheckInStatusCode = 
  | 'VALID'
  | 'ALREADY_USED'
  | 'CANCELLED'
  | 'BLACKLISTED'
  | 'EVENT_NOT_ACTIVE'
  | 'EXPIRED'
  | 'NOT_FOUND'
  | 'ERROR';

export interface GuestBadgeInfo {
  type: 'VIP_REGULAR' | 'NEW_CLUBBER' | 'DUO_AMBASSADOR' | 'REGULAR';
  label: string;
  welcomeMsg: string;
  visitsCount: number;
}

export interface DuplicateScanInfo {
  guest_name: string;
  promoter_name?: string | null;
  scanned_at: string;
  minutes_ago: number;
  original_entry_time?: string;
  scanner_email?: string | null;
}

export interface CheckInResponse {
  success: boolean;
  status: CheckInStatusCode;
  message: string;
  entry_id?: string;
  guest_name?: string;
  promoter_name?: string;
  event_name?: string;
  scanned_at?: string;
  scanned_by?: string;
  guest_badge?: GuestBadgeInfo;
  duplicate_info?: DuplicateScanInfo;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}
