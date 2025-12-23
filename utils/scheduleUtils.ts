import { PUBLIC_HOLIDAYS, WORK_TYPE_CONFIG } from '../constants';
import { DayStatus, WorkType, TeamMember } from '../types';

export const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const curr = new Date(startDate);
  const last = new Date(endDate);

  if (isNaN(curr.getTime()) || isNaN(last.getTime())) return [];

  while (curr <= last) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

export const formatDateKR = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDayMap = ['일', '월', '화', '수', '목', '금', '토'];
  const weekDay = weekDayMap[date.getDay()];
  return `${month}/${day}(${weekDay})`;
};

export const getDayStatus = (dateStr: string, memberLeaves: Record<string, WorkType>): DayStatus => {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = PUBLIC_HOLIDAYS.includes(dateStr);

  let workType = memberLeaves[dateStr] || WorkType.NONE;

  // If workType is NONE (meaning no specific user input), decide default based on day type
  if (workType === WorkType.NONE) {
    if (isWeekend || isHoliday) {
      workType = WorkType.HOLIDAY;
    } else {
      workType = WorkType.OFFICE; // Standard default for weekdays
    }
  }

  return {
    date: dateStr,
    isWeekend,
    isHoliday,
    workType,
  };
};

export const getCellStyles = (workType: WorkType): string => {
  return WORK_TYPE_CONFIG[workType]?.color || 'bg-slate-50';
};

export const getCellTextColor = (workType: WorkType): string => {
  return WORK_TYPE_CONFIG[workType]?.textColor || 'text-slate-400';
};

export const getCellLabel = (workType: WorkType): string => {
  // Hide labels for specific types as per user request
  if (
    workType === WorkType.OFFICE ||
    workType === WorkType.HOLIDAY ||
    workType === WorkType.FULL_LEAVE
  ) {
    return '';
  }
  return WORK_TYPE_CONFIG[workType]?.label || '';
};

export const calculateDailyStats = (members: TeamMember[], dates: string[]) => {
  return dates.map(date => {
    const dayStatusList = members.map(m => getDayStatus(date, m.leaves));
    const leaveTypes = [WorkType.AM_HALF, WorkType.PM_HALF, WorkType.FULL_LEAVE];
    const workingTypes = [WorkType.OFFICE, WorkType.REMOTE];
    
    return {
      date,
      formattedDate: formatDateKR(date),
      leaveCount: dayStatusList.filter(s => leaveTypes.includes(s.workType)).length,
      workingCount: dayStatusList.filter(s => workingTypes.includes(s.workType)).length,
    };
  });
};
