export default function QuestReward() {
  return (
    <div className="self-stretch p-4 bg-linear-53 from-[#36364c] to-[#4c4c6b] outline outline-4 outline-offset-[-4px] outline-[#dca008] inline-flex flex-col justify-center items-center gap-1 overflow-hidden">
      <div className="self-stretch inline-flex justify-between items-center">
        <div className="size- inline-flex flex-col justify-center items-start gap-3">
          <div className="text-center justify-center text-[#f7b718] text-[17px] font-black font-['Unibody_8_Pro'] leading-[17px]">
            REWARD
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-1">
            <div className="justify-start text-white text-base font-bold font-['Roboto'] leading-tight">
              Spin the Devconnect Prize Wheel!
            </div>
            <div className="self-stretch justify-start">
              <span className="text-white text-xs font-normal font-['Roboto'] leading-[14.40px]">
                Play to win{' '}
              </span>
              <span className="text-[#74acdf] text-xs font-bold font-['Roboto'] leading-[14.40px]">
                Swag
              </span>
              <span className="text-white text-xs font-normal font-['Roboto'] leading-[14.40px]">
                ,{' '}
              </span>
              <span className="text-[#74acdf] text-xs font-bold font-['Roboto'] leading-[14.40px]">
                T-shirts
              </span>
              <span className="text-white text-xs font-normal font-['Roboto'] leading-[14.40px]">
                {' '}
                and{' '}
              </span>
              <span className="text-[#ff85a6] text-xs font-bold font-['Roboto'] leading-[14.40px]">
                Rare
              </span>
              <span className="text-white text-xs font-normal font-['Roboto'] leading-[14.40px]">
                {' '}
                prizes!
              </span>
            </div>
          </div>
        </div>
        <img
          className="w-[63px] h-[87px]"
          src="/images/wheel.png"
          alt="Prize wheel"
        />
      </div>
    </div>
  );
} 
