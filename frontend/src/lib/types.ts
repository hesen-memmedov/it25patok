export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT'
export type AssignmentType = 'SERBEST_ISH' | 'KOLLOKVIUM' | 'LABORATORIYA'
export type Theme = 'light' | 'dark' | 'system'
export type SubmissionStatus = 'SUBMITTED' | 'LATE' | 'MISSING' | 'GRADED'
export type ChatRoomType = 'GLOBAL' | 'GROUP'

export interface ApiError {
  code: string
  message: string
}

export interface ApiEnvelope<T> {
  data: T | null
  error: ApiError | null
}

export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  totalPages: number
}

export interface User {
  id: string
  role: Role
  email: string
  username: string | null
  firstName: string
  lastName: string
  phone: string | null
  groupId: string | null
  groupCode: string | null
  avatarFileId: string | null
  bio: string | null
  theme: Theme
  active: boolean
  mustChangePassword: boolean
  notificationEnabled: boolean
  mutedUntil: number | null
  lastLoginAt: number | null
  createdAt: number
}

export interface AuthResponse {
  otpRequired: boolean
  challengeId: string | null
  maskedEmail: string | null
  accessToken: string | null
  user: User | null
  rememberDeviceAllowed: boolean
  flow: string | null
  setupToken: string | null
}

export interface AccessResponse {
  accessToken: string
  user: User
}

export interface Group {
  id: string
  code: string
  name: string
  studentCount: number
}

export interface Subject {
  id: string
  name: string
  code: string | null
  description: string | null
  createdAt: number
  assignedCount?: number
}

export interface TeachingAssignment {
  id: string
  teacherId: string
  subjectId: string
  groupId: string
  teacherName: string
  subjectName: string
  groupCode: string
}

export interface FileDto {
  id: string
  kind: string
  originalName: string
  mimeType: string | null
  sizeBytes: number
  extension: string | null
  ownerId: string
  assignmentId: string | null
  submissionId: string | null
  createdAt: number
  expiresAt: number
  expired: boolean
}

export interface FileAccess {
  token: string
  expiresIn: number
  file: FileDto
}

export interface Assignment {
  id: string
  teacherId: string
  teacherName: string
  subjectId: string
  subjectName: string
  type: AssignmentType
  title: string
  description: string | null
  deadline: number | null
  maxScore: number | null
  archived: boolean
  allowLate: boolean
  groupIds: string[]
  groupCodes: string[]
  attachmentCount: number
  submittedCount: number
  myStatus: string | null
  mySubmittedAt: number | null
  myScore: number | null
  createdAt: number
}

export interface AssignmentDetail {
  assignment: Assignment
  attachments: FileDto[]
}

export interface StudentAssignmentDetail {
  assignment: Assignment
  attachments: FileDto[]
  submission: Submission | null
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  status: string
  comment: string | null
  score: number | null
  teacherFeedback: string | null
  submittedAt: number
  fileCount: number
  files: FileDto[]
}

export interface SubmissionDetail {
  id: string
  assignmentId: string
  assignmentTitle: string
  studentId: string
  studentName: string
  groupCode: string
  status: string
  comment: string | null
  score: number | null
  teacherFeedback: string | null
  submittedAt: number
  files: FileDto[]
}

export interface SubmissionRow {
  studentId: string
  studentName: string
  email: string
  groupId: string
  groupCode: string
  avatarFileId: string | null
  submissionId: string | null
  status: string
  submittedAt: number | null
  comment: string | null
  score: number | null
  teacherFeedback: string | null
  fileCount: number
}

export interface SubmissionsPayload {
  items: SubmissionRow[]
  total: number
  submitted: number
  groups: Group[]
}

export interface MissingItem {
  assignmentId: string
  title: string
  type: AssignmentType
  subjectId: string
  subjectName: string
  deadline: number | null
  status: string
  daysLate: number
}

export interface MissingGroup {
  subjectId: string
  subjectName: string
  items: MissingItem[]
}

export interface StudentDashboard {
  assignments: number
  submitted: number
  missing: number
  overdue: number
  subjects: number
  upcoming: Assignment[]
  missingItems: MissingItem[]
}

export interface StudentSubject {
  id: string
  name: string
  code: string | null
  description: string | null
  total: number
  submitted: number
  missing: number
}

export interface TeacherSubject {
  subject: Subject
  groups: Group[]
}

export interface TeacherDashboard {
  activeAssignments: number
  students: number
  missing: number
  recent: Assignment[]
  groups: Group[]
}

export interface StudentMissingSummary {
  studentId: string
  studentName: string
  groupId: string
  groupCode: string
  count: number
  items: MissingItem[]
}

export interface CreateAssignmentPayload {
  type: AssignmentType
  subjectId: string
  title: string
  description: string | null
  deadline: number | null
  maxScore: number | null
  allowLate: boolean
  groupIds: string[]
}

export interface UpdateAssignmentPayload extends CreateAssignmentPayload {
  archived?: boolean
}

export interface GradePayload {
  score: number | null
  feedback: string | null
}

// ------------------------------------------------------------------ admin

export interface CreatedUser {
  user: User
  initialPassword: string
  emailSent: boolean
}

export interface ResetPasswordResponse {
  password: string
}

export interface UserDetail {
  user: User
  teachingAssignments: TeachingAssignment[]
}

export interface ImportCreated {
  firstName: string
  lastName: string
  email: string
  username: string
  groupCode: string
  password: string
  emailSent: boolean
}

export interface ImportResult {
  createdCount: number
  skippedCount: number
  created: ImportCreated[]
  errors: string[]
}

export interface SubjectWithAssignments {
  subject: Subject
  assignments: TeachingAssignment[]
}

export interface GroupWithStudents {
  group: Group
  students: User[]
}

export interface GroupStats {
  groupId: string
  groupCode: string
  students: number
  assignments: number
  submissions: number
  submissionRate: number
}

export interface EmailLogRow { id: string; user_id: string; type: string; sent_at: number; status: string; error: string; user_name?: string; email?: string }
export interface AuditRow {
  id: string
  actor_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  ip: string | null
  meta: string | null
  created_at: number
  actor_name?: string | null
  actor_email?: string | null
}

export interface AdminStats {
  students: number
  teachers: number
  admins: number
  assignments: number
  submissions: number
  missing: number
  files: number
  storageBytes: number
  emailsToday: number
  chatMessages: number
  groups: GroupStats[]
  recentAudit: AuditRow[]
}

export interface DashboardSummary {
  users: number
  assignments: number
  submissions: number
  missing: number
  topMissing: MissingItem[]
  chatMessages: number
  recentAudit: AuditRow[]
}

// ------------------------------------------------------------------ chat

export interface ChatRoom {
  id: string
  type: ChatRoomType
  groupId: string | null
  name: string
  unread: number
  lastMessageAt: number
}

export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderRole: Role
  senderAvatar: string | null
  text: string
  replyToId: string | null
  replySenderName: string | null
  replyText: string | null
  createdAt: number
  expiresAt: number
}

export interface TypingEvent {
  userId: string
  name: string
  roomId: string
}

export interface ArchiveEntry {
  name: string
  size: number
  directory: boolean
}