
import React, { useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TeamMember, WorkType } from '../types';
import { getDatesInRange, formatDateKR, getDayStatus, getCellStyles, getCellLabel, getCellTextColor } from '../utils/scheduleUtils';
import { WORK_TYPE_CONFIG } from '../constants';

interface AttendanceGridProps {
  startDate: string;
  endDate: string;
  members: TeamMember[];
  onUpdateStatus: (memberId: string, date: string, type: WorkType) => void;
  onOpenRoster?: () => void;
}

const AttendanceGrid: React.FC<AttendanceGridProps> = ({
  startDate,
  endDate,
  members,
  onUpdateStatus,
  onOpenRoster
}) => {
  const dates = useMemo(() => getDatesInRange(startDate, endDate), [startDate, endDate]);
  const [activeCell, setActiveCell] = useState<{ memberId: string, date: string, element: HTMLElement } | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({ opacity: 0, visibility: 'hidden' });
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const updatePopoverPosition = useCallback(() => {
    if (activeCell && popoverRef.current) {
      const cellRect = activeCell.element.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const spacing = 8;
      const viewportPadding = 16;

      let top = cellRect.bottom + spacing;
      let left = cellRect.left + cellRect.width / 2 - popoverRect.width / 2;

      // Flip logic: if it goes below screen, show above cell
      const bottomEdge = top + popoverRect.height;
      if (bottomEdge > viewportHeight - viewportPadding) {
        const flippedTop = cellRect.top - popoverRect.height - spacing;
        if (flippedTop >= viewportPadding) {
          top = flippedTop;
        } else {
          top = Math.max(viewportPadding, viewportHeight - popoverRect.height - viewportPadding);
        }
      }

      // Horizontal boundary clamp
      if (left < viewportPadding) {
        left = viewportPadding;
      } else if (left + popoverRect.width > viewportWidth - viewportPadding) {
        left = viewportWidth - popoverRect.width - viewportPadding;
      }

      setPopoverStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        opacity: 1,
        visibility: 'visible'
      });
    }
  }, [activeCell]);

  useLayoutEffect(() => {
    updatePopoverPosition();
  }, [updatePopoverPosition]);

  useEffect(() => {
    const handleScroll = () => {
      if (activeCell) {
        updatePopoverPosition();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.attendance-cell-active')) {
          setActiveCell(null);
        }
      }
    };

    if (activeCell) {
      document.addEventListener('mousedown', handleClickOutside);
      // Listen to scroll events on both window and the grid container to update position
      window.addEventListener('scroll', handleScroll, true);
      const container = scrollContainerRef.current;
      if (container) {
        container.addEventListener('scroll', handleScroll);
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      const container = scrollContainerRef.current;
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [activeCell, updatePopoverPosition]);

  const formatName = (name: string) => {
    const hasCJK = /[가-힣ㄱ-ㅎㅏ-ㅣぁ-ゔァ-ヴー々〆〤一-龥]/.test(name);
    const limit = hasCJK ? 5 : 10;
    
    const chunks = [];
    for (let i = 0; i < name.length; i += limit) {
      chunks.push(name.slice(i, i + limit));
    }
    return (
      <div className="flex flex-col items-center justify-center">
        {chunks.map((chunk, i) => (
          <div key={i} className="whitespace-nowrap">{chunk}</div>
        ))}
      </div>
    );
  };

  const handleCellClick = (e: React.MouseEvent<HTMLTableCellElement>, memberId: string, date: string, isCalendarHoliday: boolean) => {
    if (isCalendarHoliday) return;

    if (activeCell?.memberId === memberId && activeCell?.date === date) {
      setActiveCell(null);
    } else {
      const element = e.currentTarget;
      setPopoverStyle({ opacity: 0, visibility: 'hidden' });
      setActiveCell({ memberId, date, element });
    }
  };

  if (members.length === 0) {
    return (
      <div className="flex-1 py-20 md:py-32 px-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="16" x2="22" y1="11" y2="11"/></svg>
        </div>
        <p className="text-xl md:text-2xl font-black text-slate-300 tracking-tight mb-8 break-keep">아무도 등록되지 않았어요.</p>
        <button 
          onClick={onOpenRoster}
          className="w-full max-w-[240px] px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 text-lg"
        >
          팀원 추가하기
        </button>
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div className="flex-1 py-32 px-6 flex items-center justify-center text-center">
        <p className="text-3xl md:text-5xl font-black text-slate-200 tracking-tighter uppercase break-keep">지정된 일정이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col relative bg-white h-full">
      <div ref={scrollContainerRef} className="overflow-auto custom-scrollbar flex-1">
        <div className="inline-block min-w-full align-middle pb-6">
          <table className="min-w-full min-w-[400px] divide-y divide-slate-100 border-collapse table-fixed">
            <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-20">
              <tr>
                <th scope="col" className="sticky left-0 z-30 bg-slate-50 py-7 pl-5 pr-5 text-center text-lg font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-100/50 shadow-[15px_0_30px_-15px_rgba(0,0,0,0.05)] w-[100px] md:w-[160px]">
                  팀원
                </th>
                {dates.map((date) => {
                   const formatted = formatDateKR(date);
                   const isWeekend = formatted.includes('일') || formatted.includes('토');
                   return (
                    <th key={date} scope="col" className={`px-1 py-7 text-center text-lg font-black border-b border-slate-100/50 min-w-[60px] md:min-w-[80px] whitespace-nowrap transition-colors ${isWeekend ? 'text-rose-400 bg-rose-50/30' : 'text-slate-400'}`}>
                        <div className="flex flex-col gap-1">
                            <span className="leading-none tracking-tight">{formatted.split('(')[0]}</span>
                            <span className="opacity-70 text-slate-500 text-base font-black uppercase tracking-widest">{formatted.split('(')[1].replace(')', '')}</span>
                        </div>
                    </th>
                   );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/40 transition-colors group/row">
                  <td className="sticky left-0 z-10 bg-white py-6 pl-5 pr-5 text-xl font-black text-slate-800 border-r border-slate-100 shadow-[15px_0_30px_-15px_rgba(0,0,0,0.05)] group-hover/row:bg-slate-50 transition-all duration-300 text-center">
                    <div className="flex justify-center transition-transform duration-300 group-hover/row:translate-x-1 leading-tight">
                      {formatName(member.name)}
                    </div>
                  </td>
                  {dates.map((date) => {
                    const status = getDayStatus(date, member.leaves);
                    const isCalendarHoliday = status.isWeekend || status.isHoliday;
                    const colorClass = getCellStyles(status.workType);
                    const textColorClass = getCellTextColor(status.workType);
                    const label = getCellLabel(status.workType);
                    const isActive = activeCell?.memberId === member.id && activeCell?.date === date;
                    
                    return (
                      <td
                        key={date}
                        className={`px-1 md:px-1.5 py-1.5 md:py-2 text-center border-r border-slate-50 last:border-r-0 h-16 md:h-20 relative transition-all ${isCalendarHoliday ? 'cursor-default' : 'cursor-pointer group/cell'} ${isActive ? 'attendance-cell-active' : ''}`}
                        onClick={(e) => handleCellClick(e, member.id, date, isCalendarHoliday)}
                      >
                         <div className={`w-full h-full rounded-xl flex items-center justify-center text-base font-black transition-all duration-300 ease-out border-2 border-transparent ${colorClass} ${textColorClass} 
                          ${!isCalendarHoliday ? 'group-hover/cell:scale-[1.08] group-hover/cell:shadow-xl group-hover/cell:shadow-indigo-100 group-hover/cell:z-10 group-active:scale-95' : ''} 
                          ${isActive ? 'scale-[1.08] shadow-2xl shadow-indigo-200 ring-2 ring-indigo-400 z-10' : ''}`}>
                           {label}
                         </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {activeCell && createPortal(
        <div 
          key={`${activeCell.memberId}-${activeCell.date}`}
          ref={popoverRef}
          className="fixed z-[999] bg-white/95 backdrop-blur-xl rounded-[1.75rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] border border-slate-200/50 p-4 flex flex-col gap-2 min-w-[210px] pointer-events-auto"
          style={popoverStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-sm font-black text-slate-400 px-4 pb-2 border-b border-slate-100 mb-1 uppercase tracking-[0.2em] text-center select-none">근무 상태 변경</div>
          <div className="flex flex-col gap-1.5">
            {(Object.keys(WORK_TYPE_CONFIG) as WorkType[]).map((type) => {
              if (type === WorkType.NONE || type === WorkType.HOLIDAY) return null;
              const config = WORK_TYPE_CONFIG[type];
              const currentStatus = getDayStatus(activeCell.date, members.find(m => m.id === activeCell.memberId)?.leaves || {});
              return (
                <button
                  key={type}
                  onClick={() => {
                    onUpdateStatus(activeCell.memberId, activeCell.date, type);
                    setActiveCell(null);
                  }}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[17px] font-black hover:bg-slate-50 transition-all text-left group/btn active:scale-95 ${currentStatus.workType === type ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' : 'text-slate-600'}`}
                >
                  <div className={`w-5 h-5 rounded-md ${config.color} border-2 border-white/50 group-hover/btn:scale-110 transition-transform shadow-sm`}></div>
                  <span>{config.label}</span>
                  {currentStatus.workType === type && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-indigo-400"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      <div className="h-4 w-full bg-white"></div>
    </div>
  );
};

export default AttendanceGrid;
