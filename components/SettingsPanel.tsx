
import React, { useState, useEffect } from 'react';
import { AppConfig, TeamMember } from '../types';

interface LinkManagementProps {
  config: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
  onCopyLink: () => void;
  onClose: () => void;
}

export const LinkManagement: React.FC<LinkManagementProps> = ({ config, onUpdateConfig, onCopyLink, onClose }) => {
  const displayUrl = `${window.location.origin}${window.location.pathname}#${config.uuid || ''}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-6">
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase font-black tracking-widest">캘린더 이름</label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => onUpdateConfig({ ...config, title: e.target.value })}
            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg font-bold"
            placeholder="캘린더 이름 입력"
          />
        </div>
        
        <div>
          <label className="block text-sm text-slate-400 mb-2 uppercase font-black tracking-widest">공유 링크</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-sm font-bold truncate flex items-center min-w-0">
              <span className="truncate">{displayUrl}</span>
            </div>
            <button
              onClick={onCopyLink}
              className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 text-sm whitespace-nowrap flex-shrink-0"
            >
              링크 복사
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400 font-bold leading-relaxed">
            * 생성된 링크는 현재 설정과 데이터가 실시간으로 반영됩니다.
          </p>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100">
        <button
          onClick={onClose}
          className="w-full px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all active:scale-95 text-lg"
        >
          확인
        </button>
      </div>
    </div>
  );
};

interface MemberSettingsProps {
  initialMembers: TeamMember[];
  onSave: (members: TeamMember[]) => void;
  onCancel: () => void;
  onDirtyChange: (isDirty: boolean) => void;
}

export const MemberSettings: React.FC<MemberSettingsProps> = ({
  initialMembers,
  onSave,
  onCancel,
  onDirtyChange,
}) => {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const isChanged = JSON.stringify(members) !== JSON.stringify(initialMembers);
    onDirtyChange(isChanged);
  }, [members, initialMembers, onDirtyChange]);

  const handleAddMember = () => {
    if (!newName.trim()) return;
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: newName.trim(),
      leaves: {},
    };
    setMembers(prev => [...prev, newMember]);
    setNewName('');
  };

  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleNameChange = (id: string, name: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, name } : m));
  };

  const handleMoveMember = (id: string, direction: 'up' | 'down') => {
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === members.length - 1) return;

    const newMembers = [...members];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newMembers[index], newMembers[targetIndex]] = [newMembers[targetIndex], newMembers[index]];
    setMembers(newMembers);
  };

  const isAddDisabled = !newName.trim();

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-8">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="새 팀원 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
            className="flex-1 min-w-0 px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg font-bold shadow-sm"
          />
          <button
            onClick={handleAddMember}
            disabled={isAddDisabled}
            className={`flex-shrink-0 px-6 py-3.5 rounded-2xl font-black transition-all text-lg border ${
              isAddDisabled 
              ? 'bg-slate-50 text-slate-300 cursor-not-allowed border-slate-100 shadow-none' 
              : 'bg-slate-900 text-white border-slate-900 hover:bg-black active:scale-95 shadow-lg shadow-slate-200'
            }`}
          >
            추가
          </button>
        </div>
        
        <div className="space-y-3 pb-4">
          {members.map((member, index) => (
            <div 
              key={member.id} 
              className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-100"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="text-sm font-black text-slate-300 w-5 flex-shrink-0">{index + 1}</span>
                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                  <input
                    id={`member-input-${member.id}`}
                    type="text"
                    value={member.name}
                    onChange={(e) => handleNameChange(member.id, e.target.value)}
                    className="bg-transparent border-none p-0 text-lg font-black text-slate-800 outline-none focus:ring-0 focus:text-indigo-600 transition-colors w-full cursor-text min-w-0"
                    placeholder="이름 입력"
                  />
                  <button
                    onClick={() => document.getElementById(`member-input-${member.id}`)?.focus()}
                    className="p-1 text-slate-300 hover:text-indigo-500 transition-all flex-shrink-0"
                    title="이름 수정"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => handleMoveMember(member.id, 'up')}
                  disabled={index === 0}
                  className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                <button
                  onClick={() => handleMoveMember(member.id, 'down')}
                  disabled={index === members.length - 1}
                  className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1 flex-shrink-0" />
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <p className="text-sm text-slate-300 font-black uppercase tracking-widest">등록된 팀원이 없습니다</p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-8 mt-4 border-t border-slate-100 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95 text-lg"
        >
          취소
        </button>
        <button
          onClick={() => onSave(members)}
          className="flex-[2] px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 text-lg"
        >
          적용
        </button>
      </div>
    </div>
  );
};
