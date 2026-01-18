"use client";

import { useState } from "react";
import {
  useSessions,
  useSpeakers,
  useRooms,
} from "@/data/hooks";

export default function DataDashboard() {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Use SWR hooks for data fetching
  const { sessions, isLoading: sessionsLoading } = useSessions();
  const { speakers, isLoading: speakersLoading } = useSpeakers();
  const { rooms, isLoading: roomsLoading } = useRooms();

  const loading = sessionsLoading || speakersLoading || roomsLoading;

  const filteredSessions =
    selectedFilter === "all"
      ? sessions
      : sessions.filter((s) => s.track === selectedFilter);

  const tracks = Array.from(new Set(sessions.map((s) => s.track)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Data Dashboard</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Sessions</h3>
            <p className="text-3xl font-bold">{sessions.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Speakers</h3>
            <p className="text-3xl font-bold">{speakers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Rooms</h3>
            <p className="text-3xl font-bold">{rooms.length}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-4 py-2 rounded-lg ${
              selectedFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            All Tracks
          </button>
          {tracks.map((track) => (
            <button
              key={track}
              onClick={() => setSelectedFilter(track)}
              className={`px-4 py-2 rounded-lg ${
                selectedFilter === track
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {track}
            </button>
          ))}
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">Sessions ({filteredSessions.length})</h2>
          </div>
          <div className="divide-y">
            {filteredSessions.map((session) => (
              <div key={session.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{session.title}</h3>
                    <p className="text-gray-600 mb-2">{session.description}</p>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Track: {session.track}</span>
                      <span>Type: {session.type}</span>
                      <span>Duration: {session.duration} min</span>
                      {session.room && <span>Room: {session.room.name}</span>}
                    </div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {session.speakers.map((speaker) => (
                        <span
                          key={speaker.id}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                        >
                          {speaker.name}
                        </span>
                      ))}
                    </div>
                    {session.tags && session.tags.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {session.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Speakers Grid */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">Speakers ({speakers.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {speakers.map((speaker) => (
              <div key={speaker.id} className="border rounded-lg p-4">
                {speaker.avatar && (
                  <img
                    src={speaker.avatar}
                    alt={speaker.name}
                    className="w-16 h-16 rounded-full mb-3"
                  />
                )}
                <h3 className="font-semibold text-lg">{speaker.name}</h3>
                {speaker.role && (
                  <p className="text-sm text-gray-600">{speaker.role}</p>
                )}
                {speaker.company && (
                  <p className="text-sm text-gray-500">{speaker.company}</p>
                )}
                {speaker.description && (
                  <p className="text-sm text-gray-700 mt-2">{speaker.description}</p>
                )}
                {speaker.tracks && speaker.tracks.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {speaker.tracks.map((track) => (
                      <span
                        key={track}
                        className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
                      >
                        {track}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rooms List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold">Rooms ({rooms.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {rooms.map((room) => (
              <div key={room.id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{room.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{room.description}</p>
                <p className="text-sm text-gray-500">{room.info}</p>
                {room.capacity && (
                  <p className="text-sm font-medium mt-2">
                    Capacity: {room.capacity}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
