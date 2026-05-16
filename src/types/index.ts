export interface User {
  id: string
  name: string
  email: string
  role: string  // Backend can return various formats
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface GoogleAuthRequest {
  id_token: string
  role?: string
}

export interface GoogleAuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export type Optional<T> = T | null | undefined

export interface Course {
  course_id: string;
  course_code: string;
  course_name: string;
  course_type: 'Lecture' | 'Lab';
  units: number;
  semester: string;
  classification?: 'Core' | 'Elective' | 'Major' | string;
  status: string;
  instructor_id?: string;
  instructor_name?: string;
  section_capacity?: number;
  enrolled_count?: number;
  room_requirement?: string;
  price: number | null;
  prerequisites?: string[];
  corequisites?: string[];
  is_elective?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CourseCatalogResponse {
  semester: string;
  total: number;
  page: number;
  limit: number;
  courses: Course[];
}

export interface Instructor {
  instructor_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  created_at: string;
  updated_at: string;
}

export interface CoursePricing {
  pricing_id: string;
  course_id: string;
  base_fee: number;
  lab_fee?: number;
  currency: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

export interface CreateCourseRequest {
  course_code: string;
  course_name: string;
  course_type: 'Lecture' | 'Lab';
  units: number;
  price: number;
  section_capacity: number;
  instructor_id?: string;
  prerequisites?: string[];
  is_elective?: boolean;
  semester: string;
  status?: 'draft' | 'active' | 'archived';
}

export interface InstructorAssignmentRequest {
  instructor_id: string;
  section: string;
}

export interface SectionUpdateRequest {
  section: string;
  section_capacity?: number;
  room?: string;
  schedule?: string;
}
