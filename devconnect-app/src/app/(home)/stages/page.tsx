import React from 'react';
import { Separator } from 'lib/components/ui/separator';

const StagesPage = () => {
  return (
    <div className="flex flex-col">
      <div className="mx-4 mt-4 aspect-[16/9] bg-neutral-100 p-4">
        <h1>Stream</h1>
      </div>
      <div className="p-4 flex gap-2">
        <div className="border border-solid border-neutral-100 p-4 px-6 self-start">
          <div className="text-sm font-bold">Join live Q/A</div>
          <div className="text-[11px]">Powered by Meerkat</div>
        </div>
      </div>
      <Separator className="my-2 mx-4 grow w-auto" />
      <div className="p-4">
        <h1>Programming for this stage....</h1>
      </div>
    </div>
  );
};

export default StagesPage;
