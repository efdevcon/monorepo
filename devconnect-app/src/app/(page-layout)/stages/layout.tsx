'use server';
// import { getProgramming, getStageEvents } from '@/utils/programming';
// import { SWRConfig } from 'swr';

export default async function StagesDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // API down - avoid 500 from https://devconnect.pblvrt.com/events
  // const stages = await getStageEvents();

  // return children;

  // return (
  //   <SWRConfig
  //     value={{
  //       fallback: {
  //         'https://devconnect.pblvrt.com/events': {
  //           success: true,
  //           data: stages,
  //         },
  //       },
  //     }}
  //   >
  //     {children}
  //   </SWRConfig>
  // );
  return <>{children}</>;
}
