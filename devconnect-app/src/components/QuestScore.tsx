import type { ComponentQuest } from '@/types';
import StarIcon from './icons/StarIcon';

interface QuestScoreProps {
  quests: ComponentQuest[];
  onResetStates?: () => void;
}

const SmallStarIcon = ({ isCompleted }: { isCompleted: boolean }) => {
  return (
    <div
      className={`size-6 p-[3px] relative ${isCompleted ? 'bg-[#9aeea0]' : 'bg-[#efeff5]/50'} flex justify-center items-center gap-2 overflow-hidden`}
    >
      <StarIcon isCompleted={isCompleted} size="sm" />
    </div>
  );
};

const QuestScore = ({ quests, onResetStates }: QuestScoreProps) => {
  // Calculate total points from completed quests
  const totalPoints = quests.reduce((total, quest) => {
    if (quest.state.status === 'completed') {
      return total + quest.points;
    }
    return total;
  }, 0);

  // Calculate total possible points
  const totalPossiblePoints = quests.reduce((total, quest) => {
    return total + quest.points;
  }, 0);

  // Calculate completion percentage
  const completionPercentage = totalPossiblePoints > 0 
    ? Math.round((totalPoints / totalPossiblePoints) * 100) 
    : 0;

  // Count completed quests
  const completedQuests = quests.filter(quest => quest.state.status === 'completed').length;
  const totalQuests = quests.length;

  const handleReset = () => {
    if (onResetStates) {
      onResetStates();
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-4 mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      {/* Score Display */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <StarIcon isCompleted={true} size="md" />
          <span className="text-2xl font-bold text-blue-800">
            {totalPoints}
          </span>
        </div>
        <span className="text-gray-500 text-lg">
          / {totalPossiblePoints} points
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Quest Completion Stats */}
      {/* <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <span className="font-medium">{completedQuests}</span>
          <span>of</span>
          <span className="font-medium">{totalQuests}</span>
          <span>quests completed</span>
        </div>
      </div> */}

      {/* Quest Stars */}
      <div className="flex justify-center items-center gap-2">
        {quests.map((quest, index) => (
          <SmallStarIcon
            key={quest.id || `quest-${index}`}
            isCompleted={quest.state.status === 'completed'}
          />
        ))}
      </div>

      {/* Debug Reset Button */}
      <button
        onClick={handleReset}
        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium transition-colors cursor-pointer border border-red-300"
        title="Reset all quest states (Debug)"
      >
        🔄 Reset States
      </button>

      {/* Achievement Message */}
      {completionPercentage === 100 && (
        <div className="text-center">
          <div className="text-green-600 font-semibold text-sm">
            🎉 All quests completed!
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestScore;
