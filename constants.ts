
import { WorkType } from './types';

export const INITIAL_START_DATE = '2025-12-18';
export const INITIAL_END_DATE = '2026-01-15';

export const INITIAL_TEAM_ROSTER = [
  '이지훈', '윤성근', '백동열', '강수홍', '윤진', '김은성', '이민옥', '장지원', '이창주', '이동건', '오현석'
];

export const PUBLIC_HOLIDAYS = [
  '2025-12-25', // Christmas
  '2026-01-01', // New Year
];

export const WORK_TYPE_CONFIG: Record<WorkType, { label: string; color: string; textColor: string }> = {
  [WorkType.OFFICE]: { label: '회사', color: 'bg-indigo-200/60', textColor: 'text-indigo-900' },
  [WorkType.REMOTE]: { label: '원격', color: 'bg-emerald-200/80', textColor: 'text-emerald-900' },
  [WorkType.AM_HALF]: { label: '오전반차', color: 'bg-amber-200/90', textColor: 'text-amber-900' },
  [WorkType.PM_HALF]: { label: '오후반차', color: 'bg-orange-300/80', textColor: 'text-orange-900' },
  [WorkType.FULL_LEAVE]: { label: '휴가', color: 'bg-rose-400/80', textColor: 'text-white' },
  [WorkType.HOLIDAY]: { label: '휴일', color: 'bg-slate-200', textColor: 'text-slate-600' },
  [WorkType.NONE]: { label: '', color: 'bg-transparent', textColor: 'text-slate-300' },
};
