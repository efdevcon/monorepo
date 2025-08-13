'use client';

import React, { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { useParams, useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import type { Quest as ApiQuest } from '@/types';

type QuestStates = Record<
  string,
  {
    isCheckedIn?: boolean;
  }
>;

export default function BoothPage() {
  const params = useParams();
  const router = useRouter();
  const boothCode = params.boothCode as string;
  
  const [loading, setLoading] = useState(true);
  const [quest, setQuest] = useState<ApiQuest | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const [apiQuests, setApiQuests] = useLocalStorage<ApiQuest[]>(
    'quests-data',
    []
  );

  const [questStates, setQuestStates] = useLocalStorage<QuestStates>(
    'quest-states',
    {}
  );

  // Find quest and update state
  useEffect(() => {
    if (!boothCode) {
      setLoading(false);
      return;
    }

    try {
      const foundQuest = apiQuests.find(q => q.boothCode === boothCode);
      
      if (!foundQuest) {
        setLoading(false);
        return;
      }

      setQuest(foundQuest);
      
      const savedState = questStates[foundQuest.id] || {};
      
      // Auto check-in if not already checked in
      if (!savedState.isCheckedIn) {
        const updatedState = { ...savedState, isCheckedIn: true };
        setQuestStates((prev) => ({
          ...prev,
          [foundQuest.id]: updatedState,
        }));
        setIsCheckedIn(true);
      } else {
        setIsCheckedIn(true);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error processing booth check-in:', error);
      setLoading(false);
    }
  }, [boothCode, apiQuests, questStates, setQuestStates]);

  // Fetch quests if needed
  useEffect(() => {
    if (apiQuests.length > 0) return;
    
    const fetchQuests = async () => {
      try {
        const response = await fetch('/api/quests');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.success && data.quests) {
          const transformedQuests = data.quests.map((quest: any) => ({
            ...quest,
            category: quest.category?.replace(/^\d+\.\s*/, '') || quest.category,
            group: quest.group?.replace(/^\d+\.\s*/, '') || quest.group,
            difficulty: quest.difficulty?.replace(/^\d+\.\s*/, '') || quest.difficulty,
          }));
          setApiQuests(transformedQuests);
        } else {
          console.error('Invalid quest data format');
        }
      } catch (err) {
        console.error('Error fetching quests:', err);
      }
    };

    fetchQuests();
  }, [apiQuests.length, setApiQuests]);



  if (loading) {
    return (
      <PageLayout title="Booth">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1b6fae] mx-auto mb-4"></div>
            <div className="text-[#4b4b66]">Loading...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!quest) {
    return (
      <PageLayout title="Booth Not Found">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-[#4b4b66] text-lg mb-4">Booth not found</div>
            <button
              onClick={() => router.push('/quests')}
              className="px-4 py-2 bg-[#1b6fae] text-white rounded-lg"
            >
              Back to Quests
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Booth Checked In">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-2xl font-bold text-[#232336] mb-2">{quest.name}</h1>
          <p className="text-[#4b4b66] mb-4">Check In Successfully! 🥳</p>
          <button
            onClick={() => router.push('/quests')}
            className="px-6 py-3 bg-[#1b6fae] text-white rounded-lg hover:bg-[#155a8f] transition-colors"
          >
            View Quests
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
