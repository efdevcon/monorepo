import type { ComponentQuest } from '@/types';
import QuestScore from './QuestScore';

interface QuestRecapProps {
  quests: ComponentQuest[];
  onResetStates?: () => void;
}

const QuestRecap = ({ quests, onResetStates }: QuestRecapProps) => {
  return (
    <div className="w-full flex flex-col items-center gap-4 p-4">
      {/* Quest Score Component */}
      <QuestScore quests={quests} onResetStates={onResetStates} />
    </div>
  );
};

export default QuestRecap;
