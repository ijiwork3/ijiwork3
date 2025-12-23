
import React from 'react';
import { WORK_TYPE_CONFIG } from '../constants';
import { WorkType } from '../types';

const LegendItem: React.FC<{ colorClass: string; label: string; textColor: string }> = ({ colorClass, label, textColor }) => (
  <div className="flex items-center space-x-2">
    <div className={`w-4 h-4 rounded shadow-sm border border-slate-200 ${colorClass}`}></div>
    <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
  </div>
);

const Legend: React.FC = () => {
  const displayTypes: WorkType[] = [
    WorkType.OFFICE,
    WorkType.REMOTE,
    WorkType.AM_HALF,
    WorkType.PM_HALF,
    WorkType.FULL_LEAVE,
    WorkType.HOLIDAY
  ];

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 items-center bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
      <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">구분</span>
      {displayTypes.map(type => {
        const config = WORK_TYPE_CONFIG[type];
        return (
          <LegendItem 
            key={type} 
            colorClass={config.color} 
            label={config.label} 
            textColor={config.textColor}
          />
        );
      })}
    </div>
  );
};

export default Legend;
