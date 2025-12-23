
import React, { useState, useCallback, useRef, useEffect } from 'react';
import AttendanceGrid from './components/AttendanceGrid';
import { MemberSettings, LinkManagement } from './components/SettingsPanel';
import Modal from './components/Modal';
import { AppConfig, TeamMember, WorkType } from './types';
import { supabase } from './supabaseClient';

const getInitialDates = () => {
  const today = new Date();
  const twoWeeksLater = new Date();
  twoWeeksLater.setDate(today.getDate() + 14);
  return {
    start: today.toISOString().split('T')[0],
    end: twoWeeksLater.toISOString().split('T')[0]
  };
};

const getUuidFromUrl = () => {
  const hash = window.location.hash.replace('#', '');
  if (hash.length > 10) return hash;
  
  const path = window.location.pathname.substring(1);
  if (path.length > 10) return path;
  
  return null;
};

function App() {
  const [loading, setLoading] = useState(true);
  const [calendarUuid, setCalendarUuid] = useState<string | null>(getUuidFromUrl());
  const [enterLink, setEnterLink] = useState('');

  const [config, setConfig] = useState<AppConfig>(() => {
    const defaults = getInitialDates();
    return {
      title: '',
      emoji: '', 
      startDate: defaults.start,
      endDate: defaults.end,
    };
  });

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);
  const [tempPeriod, setTempPeriod] = useState({ start: config.startDate, end: config.endDate });
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const newUuid = getUuidFromUrl();
      if (newUuid !== calendarUuid) {
        setCalendarUuid(newUuid);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [calendarUuid]);

  useEffect(() => {
    const loadCalendarData = async () => {
      if (!calendarUuid) {
        setMembers([]);
        setConfig(prev => ({ ...prev, title: '', id: undefined, uuid: undefined }));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: calendarData, error: calendarError } = await supabase
          .from('calendars')
          .select('*')
          .eq('uuid', calendarUuid)
          .single();

        if (calendarError || !calendarData) {
          console.error("Calendar not found:", calendarError);
          setToast('캘린더를 찾을 수 없습니다.');
          setCalendarUuid(null);
          window.location.hash = '';
          setLoading(false);
          return;
        }

        setConfig(prev => ({ 
          ...prev, 
          id: calendarData.id, 
          uuid: calendarData.uuid, 
          title: calendarData.name 
        }));

        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('id, name')
          .eq('calendar_id', calendarData.id)
          .order('id', { ascending: true });

        if (membersError) throw membersError;

        if (membersData && membersData.length > 0) {
          const memberIds = membersData.map(m => m.id);
          const { data: schedulesData, error: schedulesError } = await supabase
            .from('schedules')
            .select('member_id, date, work_type')
            .in('member_id', memberIds);

          if (schedulesError) throw schedulesError;

          const membersList: TeamMember[] = membersData.map(m => {
            const leaves: Record<string, WorkType> = {};
            schedulesData
              ?.filter(s => s.member_id === m.id)
              .forEach(s => {
                leaves[s.date] = s.work_type as WorkType;
              });
            return {
              id: String(m.id),
              name: m.name,
              leaves
            };
          });
          setMembers(membersList);
        } else {
          setMembers([]);
        }

      } catch (err) {
        console.error("Error loading data:", err);
        setToast('데이터 로드 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, [calendarUuid]);

  const handleCreateCalendar = async () => {
    const title = config.title.trim() === '' ? '새 캘린더' : config.title;
    const uuid = crypto.randomUUID();
    
    try {
      const { data, error } = await supabase
        .from('calendars')
        .insert([{ uuid, name: title }])
        .select()
        .single();

      if (error) throw error;

      window.location.hash = uuid;
      setCalendarUuid(uuid);
      setConfig(prev => ({ ...prev, id: data.id, uuid: data.uuid, title: data.name }));
      setIsEditingTitle(false);
      setToast('새 캘린더가 생성되었습니다!');
    } catch (err) {
      console.error("Error creating calendar:", err);
      setToast('캘린더 생성에 실패했습니다.');
    }
  };

  const handleUpdateTitle = async () => {
    if (!calendarUuid) {
      handleCreateCalendar();
      return;
    }

    try {
      const { error } = await supabase
        .from('calendars')
        .update({ name: config.title })
        .eq('uuid', calendarUuid);
      
      if (error) throw error;
      setIsEditingTitle(false);
      setToast('제목이 변경되었습니다.');
    } catch (err) {
      console.error("Error updating title:", err);
      setToast('제목 변경에 실패했습니다.');
    }
  };

  const handleEnterCalendar = () => {
    if (!enterLink.trim()) return;
    let uuid = enterLink.trim();
    if (uuid.includes('#')) {
      uuid = uuid.split('#').pop() || '';
    } else if (uuid.includes('/')) {
      uuid = uuid.split('/').pop() || '';
    }
    
    if (uuid.length > 10) {
      window.location.hash = uuid;
    } else {
      setToast('올바른 링크 형식이 아닙니다.');
    }
  };

  const handleUpdateStatus = useCallback(async (memberId: string, date: string, type: WorkType) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      return { ...m, leaves: { ...m.leaves, [date]: type } };
    }));

    try {
      const { error } = await supabase
        .from('schedules')
        .upsert(
          { member_id: parseInt(memberId), date, work_type: type },
          { onConflict: 'member_id,date' }
        );
      if (error) throw error;
    } catch (err) {
      console.error("Error updating status:", err);
      setToast('상태 저장에 실패했습니다.');
    }
  }, []);

  const handleSaveMembers = async (newMembers: TeamMember[]) => {
    if (!config.id) return;

    try {
      const existingIds = members.map(m => parseInt(m.id)).filter(id => !isNaN(id));
      const currentIds = newMembers.map(m => parseInt(m.id)).filter(id => !isNaN(id));
      const deletedIds = existingIds.filter(id => !currentIds.includes(id));

      if (deletedIds.length > 0) {
        await supabase.from('members').delete().in('id', deletedIds);
      }

      const finalMembers: TeamMember[] = [];
      for (const m of newMembers) {
        if (m.id.startsWith('member-')) {
          const { data, error } = await supabase
            .from('members')
            .insert({ calendar_id: config.id, name: m.name })
            .select()
            .single();
          if (error) throw error;
          finalMembers.push({ ...m, id: String(data.id) });
        } else {
          const { error } = await supabase
            .from('members')
            .update({ name: m.name })
            .eq('id', parseInt(m.id));
          if (error) throw error;
          finalMembers.push(m);
        }
      }

      setMembers(finalMembers);
      setShowRosterModal(false);
      setIsSettingsDirty(false);
      setToast('팀원 정보가 저장되었습니다.');
    } catch (err) {
      console.error("Error saving members:", err);
      setToast('팀원 저장 중 오류가 발생했습니다.');
    }
  };

  const handleTogglePeriodEdit = () => {
    if (!isEditingPeriod) {
      setTempPeriod({ start: config.startDate, end: config.endDate });
    }
    setIsEditingPeriod(!isEditingPeriod);
  };

  const handleSavePeriod = () => {
    setConfig({ ...config, startDate: tempPeriod.start, endDate: tempPeriod.end });
    setIsEditingPeriod(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${calendarUuid}`;
    navigator.clipboard.writeText(url).then(() => {
      setToast('공유 링크가 복사되었습니다!');
      setTimeout(() => setToast(null), 3000);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-black">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const displayTitle = config.title.trim() === '' ? '캘린더 이름' : config.title;

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden transition-colors duration-700 ${!calendarUuid ? 'bg-white' : 'bg-slate-100'}`}>
      <div className="max-w-[1280px] w-full mx-auto flex flex-col flex-1 px-4 sm:px-12 py-10 md:py-20">
        
        {toast && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
              <span className="text-sm font-black tracking-tight">{toast}</span>
            </div>
          </div>
        )}

        {!calendarUuid ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
            <div className="mb-12">
              <span className="text-xs font-black text-indigo-500 tracking-[0.3em] uppercase block mb-4">EONJE SWIM?</span>
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-4">언제쉼?</h1>
              <p className="text-slate-400 font-bold text-lg md:text-xl">팀의 근무 일정을 한눈에 공유하세요</p>
            </div>

            <div className="w-full max-w-md space-y-12">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">새로운 시작</h3>
                <button 
                  onClick={() => setIsEditingTitle(true)}
                  className="w-full px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                >
                  새 캘린더 생성하기
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-sm uppercase"><span className="bg-white px-4 text-slate-300 font-black tracking-widest">또는</span></div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">기존 캘린더 참여</h3>
                <div className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    placeholder="공유받은 링크 또는 ID 입력"
                    value={enterLink}
                    onChange={(e) => setEnterLink(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEnterCalendar()}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-center placeholder:text-slate-300"
                  />
                  <button 
                    onClick={handleEnterCalendar}
                    className="w-full px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xl hover:bg-black transition-all active:scale-95"
                  >
                    캘린더 입장하기
                  </button>
                </div>
              </div>
            </div>

            {isEditingTitle && (
              <Modal isOpen={isEditingTitle} onClose={() => setIsEditingTitle(false)} title="새 캘린더 이름">
                <div className="space-y-6">
                  <input
                    ref={titleInputRef}
                    autoFocus
                    type="text"
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCalendar()}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-center"
                    placeholder="이름을 입력하세요 (예: 개발1팀)"
                  />
                  <button 
                    onClick={handleCreateCalendar}
                    className="w-full px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                  >
                    생성하기
                  </button>
                </div>
              </Modal>
            )}
          </div>
        ) : (
          <>
            <header className="px-4 sm:px-2 flex flex-col animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-[10px] sm:text-xs font-black text-indigo-500 tracking-[0.25em] uppercase select-none mb-1">언제쉼?</span>
                  <div className="flex items-center gap-3 sm:gap-5 group max-w-full">
                    {isEditingTitle ? (
                      <div className="relative flex-1 animate-in fade-in slide-in-from-left-2 duration-300 flex items-center gap-3 max-w-full">
                        <input
                          ref={titleInputRef}
                          type="text"
                          value={config.title}
                          onChange={(e) => setConfig({ ...config, title: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                          className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter bg-transparent border-b-4 border-slate-900 px-0 py-1 outline-none flex-1 transition-all placeholder:text-slate-300 min-w-0"
                          placeholder="캘린더 이름"
                        />
                        <button 
                          onClick={handleUpdateTitle}
                          className="flex-shrink-0 p-2 sm:p-2.5 bg-slate-900 text-white rounded-xl active:scale-90 transition-transform shadow-lg shadow-slate-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="sm:w-7 sm:h-7"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                      </div>
                    ) : (
                      <h1 
                        className={`text-3xl sm:text-5xl font-black tracking-tighter break-keep hover:cursor-text select-none flex items-center gap-4 group/h1 transition-colors min-w-0 overflow-hidden ${config.title.trim() === '' ? 'text-slate-300' : 'text-slate-900'}`} 
                        onClick={() => setIsEditingTitle(true)}
                      >
                        <span className="truncate">{displayTitle}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-slate-300 transition-all opacity-100 group-hover/h1:text-indigo-400 sm:w-7 sm:h-7"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </h1>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setShowLinkModal(true)}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-lg transition-all active:scale-95 group/link"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover/link:text-indigo-500 transition-colors sm:w-5 sm:h-5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  <span className="text-sm">링크 관리</span>
                </button>
              </div>

              <div className="h-6 sm:h-8" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 py-2">
                <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                  {isEditingPeriod ? (
                    <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-1 duration-300 max-w-full">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
                        <input
                          type="date"
                          value={tempPeriod.start}
                          onChange={(e) => setTempPeriod({ ...tempPeriod, start: e.target.value })}
                          className="min-w-0 px-2 sm:px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <span className="text-slate-300 font-bold">—</span>
                        <input
                          type="date"
                          value={tempPeriod.end}
                          onChange={(e) => setTempPeriod({ ...tempPeriod, end: e.target.value })}
                          className="min-w-0 px-2 sm:px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm sm:text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={handleSavePeriod} className="p-2 sm:p-2.5 bg-slate-900 text-white rounded-xl active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="sm:w-5 sm:h-5"><polyline points="20 6 9 17 4 12"/></svg></button>
                        <button onClick={() => setIsEditingPeriod(false)} className="p-2 sm:p-2.5 bg-slate-200 text-slate-600 rounded-xl active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="sm:w-5 sm:h-5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 group/period overflow-hidden cursor-pointer" onClick={handleTogglePeriodEdit}>
                      <p className="text-xl sm:text-2xl font-bold text-slate-400 tracking-tight leading-none whitespace-nowrap group-hover/period:text-slate-600 transition-colors">
                        {config.startDate.replace(/-/g, '.')} — {config.endDate.replace(/-/g, '.')}
                      </p>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 opacity-100 transition-all sm:w-5 sm:h-5 flex-shrink-0"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    </div>
                  )}
                </div>
                
                {members.length > 0 && (
                  <button 
                    onClick={() => setShowRosterModal(true)}
                    className="flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black hover:bg-slate-50 hover:text-slate-900 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.03)] active:scale-95 text-base sm:text-lg tracking-tight group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-indigo-500 transition-colors sm:w-5 sm:h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    팀원 관리
                  </button>
                )}
              </div>
            </header>

            <div className="h-4 sm:h-6" />

            <main className="flex-1 bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-200/60 overflow-hidden ring-1 ring-black/5 mb-5 min-h-[480px] h-full flex flex-col mx-2 sm:mx-0 animate-in fade-in zoom-in-95 duration-1000 delay-150">
              <AttendanceGrid 
                startDate={config.startDate}
                endDate={config.endDate}
                members={members}
                onUpdateStatus={handleUpdateStatus}
                onOpenRoster={() => setShowRosterModal(true)}
              />
            </main>

            <Modal isOpen={showRosterModal} onClose={() => setShowRosterModal(false)} title="팀원 관리">
              <MemberSettings initialMembers={members} onSave={handleSaveMembers} onCancel={() => setShowRosterModal(false)} onDirtyChange={setIsSettingsDirty} />
            </Modal>

            <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} title="링크 관리">
              <LinkManagement 
                config={config} 
                onUpdateConfig={setConfig} 
                onCopyLink={handleCopyLink} 
                onClose={() => setShowLinkModal(false)}
              />
            </Modal>
          </>
        )}

        <footer className="mt-auto pt-16 pb-6 text-center flex flex-col items-center gap-1.5 select-none">
          <p className="font-black text-slate-400 text-sm tracking-tighter italic opacity-80">EonjeSwim?</p>
          <p className="font-black text-slate-300 text-[10px] tracking-[0.3em] uppercase">made by jhlee</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
