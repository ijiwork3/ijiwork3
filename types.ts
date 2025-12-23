
export enum WorkType {
  OFFICE = 'OFFICE',         // 회사 근무
  REMOTE = 'REMOTE',         // 원격 근무
  AM_HALF = 'AM_HALF',       // 오전 반차
  PM_HALF = 'PM_HALF',       // 오후 반차
  FULL_LEAVE = 'FULL_LEAVE', // 휴가
  HOLIDAY = 'HOLIDAY',       // 휴일
  NONE = 'NONE',             // 미지정 (기본)
}

export interface LeaveRecord {
  date: string; // YYYY-MM-DD
  type: WorkType;
}

export interface TeamMember {
  id: string; // This will map to DB 'id' (int) converted to string or UUID
  name: string;
  leaves: Record<string, WorkType>; // Mapping date -> WorkType
}

export interface AppConfig {
  id?: number;
  uuid?: string;
  title: string;
  emoji: string;
  startDate: string;
  endDate: string;
}

export interface DayStatus {
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  workType: WorkType;
}
