
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity duration-300" 
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-3xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-center px-6 py-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
