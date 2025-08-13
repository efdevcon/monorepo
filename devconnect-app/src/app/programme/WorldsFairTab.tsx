export default function WorldsFairTab({
  fullHeight = false,
}: {
  fullHeight?: boolean;
}) {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://devconnect-map.vercel.app/"
        className={`w-full ${fullHeight ? 'h-[calc(100vh-90px)]' : 'h-[calc(100vh-290px)]'} border-0`}
        title="OpenIndoorMaps"
        allow="geolocation; microphone; camera"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
