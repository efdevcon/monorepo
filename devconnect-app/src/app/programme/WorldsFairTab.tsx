export default function WorldsFairTab() {
  return (
    <div className="w-full h-full">
      <iframe
        src="https://devconnect-map.vercel.app/"
        className="w-full h-[calc(100vh-290px)] border-0"
        title="OpenIndoorMaps"
        allow="geolocation; microphone; camera"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
