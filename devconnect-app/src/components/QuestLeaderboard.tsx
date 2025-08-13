import StarIcon from '@/components/icons/StarIcon';

export default function QuestLeaderboard() {
  return (
    <div className="w-full p-4 bg-linear-53 from-[#36364c] to-[#4c4c6b] outline outline-4 outline-offset-[-4px] outline-[#dca008] flex flex-col justify-center items-center gap-1 overflow-hidden">
      <div className="w-full flex justify-between items-center">
        <div className="flex flex-col justify-center items-start gap-3">
          <div className="text-center justify-center text-[#f7b718] text-[17px] font-black font-['Unibody_8_Pro'] leading-[17px]">
            LEADERBOARD
          </div>
          <div className="flex flex-col justify-start items-start gap-1">
            <div className="justify-start text-white text-base font-bold font-['Roboto'] leading-tight">
              Check Your Ranking!
            </div>
            <div className="justify-start">
              <span className="text-white text-xs font-normal font-['Roboto'] leading-[14.40px]">
                See how you rank against{' '}
              </span>
              <span className="text-[#74acdf] text-xs font-bold font-['Roboto'] leading-[14.40px]">
                other users
              </span>
              <span className="text-white text-xs font-normal font-['Roboto'] leading-[14.40px]">
                {' '}
                and compete for{' '}
              </span>
              <span className="text-[#ff85a6] text-xs font-bold font-['Roboto'] leading-[14.40px]">
                top spots
              </span>
              <span className="text-white text-xs font-normal font-['Roboto'] leading-[14.40px]">
                !
              </span>
            </div>
          </div>
        </div>
        <StarIcon />
        <StarIcon />
        <StarIcon />
        <StarIcon />
        <StarIcon />
      </div>
    </div>
  );
}
