"use client";

import { useRooms } from "@/data/hooks";
import APP_CONFIG from "@/CONFIG";
import { Link, BackButton } from "@/routing";

export default function RoomScreens() {
  const { rooms, isLoading, isError, error } = useRooms();

  if (!APP_CONFIG.ROOMS_ENABLED) {
    return <div className="p-4 text-gray-500">Room screens are not enabled</div>;
  }

  if (isLoading) {
    return <div className="p-4">Loading rooms...</div>;
  }

  if (isError) {
    return <div className="p-4 text-red-500">{error?.message}</div>;
  }

  return (
    <div className="p-4">
      <BackButton className="text-blue-500 hover:underline mb-4 block cursor-pointer" />

      <h1 className="text-2xl font-bold mb-4">Room Screens</h1>
      <p className="text-gray-600 mb-4">Select a room to view its schedule display</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/room-screens/${room.id}`}
            className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <h2 className="font-semibold">{room.name}</h2>
            {room.description && (
              <p className="text-sm text-gray-600">{room.description}</p>
            )}
            {room.capacity && (
              <p className="text-sm text-gray-500">Capacity: {room.capacity}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
