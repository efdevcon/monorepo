'use client';

import { useState } from 'react';

interface Quest {
  number: number;
  quest_id: string;
  type: string;
  title: string;
  description?: string;
  points: number;
  action?: string;
  status: 'completed' | 'active' | 'locked';
  is_locked: boolean;
}

const StarIcon = ({ isCompleted }: { isCompleted: boolean }) => {
  const fillColor = isCompleted ? '#232336' : '#F6B40E';
  
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.43 3.9975H7.99875V4.57125H7.42875V5.14125H6.85875V5.71125H6.285V1.71375H6.85875V0.57H6.285V0H5.715V0.57H5.14125V1.71375H4.57125V2.8575H4.00125V3.9975H0.57V4.57125H0V5.14125H0.57V5.71125H1.14375V6.285H2.2875V6.855H2.8575V7.99875H3.4275V7.42875H4.57125V6.855H5.715V7.42875H5.14125V7.99875H4.57125V8.56875H4.00125V9.1425H3.4275V9.7125H2.8575V10.2863H2.2875V10.8563H1.71375V10.2863H1.14375V11.4262H1.71375V12H2.8575V11.4262H3.4275V10.8563H4.57125V10.2863H5.14125V9.7125H5.715V9.1425H6.285V7.42875H6.85875V7.99875H7.42875V8.56875H7.99875V9.1425H8.5725V9.7125H9.1425V10.2863H9.7125V11.4262H9.1425V12H10.2863V11.4262H10.8563V10.2863H10.2863V9.1425H9.7125V7.99875H9.1425V6.855H9.7125V6.285H8.5725V6.855H6.285V6.285H7.99875V5.71125H8.5725V5.14125H10.8563V5.71125H11.43V5.14125H12V4.57125H11.43V3.9975ZM5.14125 6.285H4.00125V5.71125H2.8575V5.14125H1.71375V4.57125H4.57125V5.14125H5.14125V6.285Z" fill={fillColor}/>
      <path d="M10.8557 5.71204H9.71191V6.28579H10.8557V5.71204Z" fill={fillColor}/>
      <path d="M9.14227 10.8549H8.57227V11.4249H9.14227V10.8549Z" fill={fillColor}/>
      <path d="M8.57258 10.2858H7.42883V10.8558H8.57258V10.2858Z" fill={fillColor}/>
      <path d="M7.99883 2.85608H7.42883V3.99608H7.99883V2.85608Z" fill={fillColor}/>
      <path d="M7.4284 9.71289H6.8584V10.2866H7.4284V9.71289Z" fill={fillColor}/>
      <path d="M7.4284 1.71423H6.8584V2.85798H7.4284V1.71423Z" fill={fillColor}/>
      <path d="M6.85793 9.14392H6.28418V9.71392H6.85793V9.14392Z" fill={fillColor}/>
      <path d="M2.85711 7.99902H2.28711V9.14277H2.85711V7.99902Z" fill={fillColor}/>
      <path d="M2.28762 9.14392H1.71387V10.2877H2.28762V9.14392Z" fill={fillColor}/>
    </svg>
  );
};

const LockIcon = () => {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.2844 5.14136H9.71436V10.8564H10.2844V5.14136Z" fill="white"/>
      <path d="M9.71438 10.8562H9.14062V11.43H9.71438V10.8562Z" fill="white"/>
      <path d="M9.14059 11.4299H2.85559V11.9999H9.14059V11.4299Z" fill="white"/>
      <path d="M8.57061 0.570068H8.00061V1.14382H8.57061V0.570068Z" fill="white"/>
      <path d="M6.85684 7.42866H6.28684V6.85866H6.85684V6.28491H5.14309V6.85866H4.56934V7.99866H5.14309V8.57241H5.71309V10.2862H6.28684V8.57241H6.85684V7.99866H7.42684V6.85866H6.85684V7.42866Z" fill="white"/>
      <path d="M8.00052 0H3.99927V0.57H8.00052V0Z" fill="white"/>
      <path d="M3.99932 0.570068H3.42932V1.14382H3.99932V0.570068Z" fill="white"/>
      <path d="M9.71427 5.1413V4.5713H9.14052V1.1438H8.57052V4.5713H3.42927V1.1438H2.85552V4.5713H2.28552V5.1413H9.71427Z" fill="white"/>
      <path d="M2.85552 10.8562H2.28552V11.43H2.85552V10.8562Z" fill="white"/>
      <path d="M2.28558 5.14136H1.71558V10.8564H2.28558V5.14136Z" fill="white"/>
    </svg>
  );
};

const QuestItem = ({ quest }: { quest: Quest }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusStyles = () => {
    switch (quest.status) {
      case 'completed':
        return {
          container: 'bg-[#eaf9eb]',
          badge: 'bg-[#9aeea0]',
          points: 'text-[#232336]',
        };
      case 'active':
        return {
          container: 'bg-[#e8f3fb] outline outline-1 outline-offset-[-1px] outline-[#1b6fae]',
          badge: 'bg-[#4b4b66] rounded-[1px]',
          points: 'text-[#f6b40e]',
        };
      case 'locked':
        return {
          container: 'bg-[#f5f5f9] outline outline-1 outline-offset-[-1px] outline-[#dfdfeb]',
          badge: 'bg-[#4b4b66] rounded-[1px]',
          points: 'text-[#f6b40e]',
        };
    }
  };

  const styles = getStatusStyles();

  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={`w-full p-4 relative ${styles.container} rounded-[1px] flex flex-col justify-start items-start gap-2 cursor-pointer transition-all duration-200 min-h-[80px] ${
        isExpanded ? 'shadow-lg' : 'hover:shadow-md'
      }`}
      onClick={handleClick}
    >
      <div className="w-full flex flex-col justify-start items-start gap-1">
        <div className={`w-full justify-start text-[11px] font-medium font-['Roboto'] leading-[14.30px] tracking-wide ${
          quest.status === 'completed' ? 'text-[#199821]' : 'text-[#4b4b66]'
        }`}>
          {quest.number === 6 ? 'FINAL QUEST' : `QUEST ${quest.type.toUpperCase()}`}
        </div>
        <div className="w-full justify-start text-[#232336] text-lg font-bold font-['Roboto'] leading-normal">
          {quest.title}
        </div>
        {isExpanded && quest.description && (
          <div className="w-full justify-start text-[#232336] text-sm font-normal font-['Roboto'] leading-[21px] mt-2">
            {quest.description}
          </div>
        )}
      </div>

      {/* Points badge */}
      <div className={`size- p-1 left-[${quest.number >= 3 ? '300' : '292'}px] top-[8px] absolute ${styles.badge} inline-flex justify-center items-center gap-1`}>
        <StarIcon isCompleted={quest.status === 'completed'} />
        <div className={`justify-start ${styles.points} text-${quest.number >= 3 ? 'xs' : 'sm'} font-black font-['Unibody_8_Pro'] leading-${quest.number >= 3 ? '3' : '[14px]'}`}>
          {quest.points}
        </div>
      </div>

      {/* Action button - only show when expanded */}
      {isExpanded && quest.action && (
        <div className={`w-full pl-6 pr-4 py-4 flex justify-center items-center gap-1 mt-2 ${
          quest.status === 'active' 
            ? 'bg-[#1b6fae] shadow-[inset_0px_6px_0px_0px_rgba(75,138,185,1.00)] shadow-[inset_0px_-6px_0px_0px_rgba(19,79,124,1.00)]' 
            : 'bg-[#4b4b66] shadow-[inset_0px_6px_0px_0px_rgba(75,75,102,1.00)] shadow-[inset_0px_-6px_0px_0px_rgba(37,37,51,1.00)]'
        }`}>
          <div className="text-center text-white text-sm font-bold font-['Roboto'] uppercase leading-[14px]">
            {quest.action}
          </div>
          <div className="size-5 relative overflow-hidden">
            <div className="w-[7.20px] h-3 left-[6.40px] top-[4px] absolute bg-white" />
          </div>
        </div>
      )}

      {/* Lock icon for locked quests */}
      {quest.status === 'locked' && quest.number === 6 && (
        <div className="size- p-1 left-[276px] top-[8px] absolute bg-[#4b4b66] rounded-[1px] inline-flex justify-center items-center gap-1">
          <LockIcon />
        </div>
      )}

      {/* Expand/collapse indicator */}
      <div className={`absolute right-4 top-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 4L6 8L10 4" stroke={quest.status === 'completed' ? '#232336' : '#4b4b66'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
};

export default QuestItem;
export type { Quest }; 
