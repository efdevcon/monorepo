import { Quest } from './QuestItem';
import StarIcon from './icons/StarIcon';

const SmallStarIcon = ({ isCompleted }: { isCompleted: boolean }) => {
  return (
    <div className={`size-6 p-[3px] relative ${isCompleted ? 'bg-[#9aeea0]' : 'bg-[#efeff5]/50'} flex justify-center items-center gap-2 overflow-hidden`}>
      <StarIcon isCompleted={isCompleted} size="sm" />
    </div>
  );
};

interface QuestRecapProps {
  quests: Quest[];
}

const QuestRecap = ({ quests }: QuestRecapProps) => {
  return (
    <div className="w-full flex justify-center items-center gap-2 mb-6">
      {quests.map((quest) => (
        <SmallStarIcon 
          key={quest.quest_id} 
          isCompleted={quest.status === 'completed'} 
        />
      ))}
    </div>
  );
};

export default QuestRecap; 
