import EventMap from '@/components/EventMap';

export default function WorldsFairTab({
  fullHeight = false,
}: {
  fullHeight?: boolean;
}) {
  return (
    <div className="w-full h-full">
      <EventMap />
    </div>
  );
}
