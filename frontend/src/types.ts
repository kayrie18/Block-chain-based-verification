export type UserRole = 'Admin' | 'Issuer' | 'Verifier' | 'User';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  profilePictureUrl?: string;
  isVerifierApproved?: boolean;
}

export interface DocumentMetadata {
  title: string;
  owner: string;
  issuingOrganization: string;
  issueDate: string;
  type: string;
}

export interface DocumentRecord {
  id: string;
  hash: string;
  metadata: DocumentMetadata;
  status: 'Verified' | 'Tampered' | 'Pending';
  timestamp: string;
  issuerId: string;
  qrCode?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

export interface SystemStats {
  totalDocuments: number;
  totalVerifications: number;
  activeIssuers: number;
  tamperAttempts: number;
}
