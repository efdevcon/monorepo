'use client';

import React, { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import PageLayout from '@/components/PageLayout';
import BoothCard from '@/components/BoothCard';
import type { Quest as ApiQuest } from '@/types';

const navLabel = 'Booths';
const title = navLabel;

export default function BoothsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Local storage for quests data
  const [apiQuests, setApiQuests] = useLocalStorage<ApiQuest[]>(
    'quests-data',
    []
  );

  // Ensure client-side rendering to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch quests from API on first load
  useEffect(() => {
    const fetchQuests = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/quests');
        const data = await response.json();

        if (data.success) {
          // Transform the quests to trim numbered prefixes from category, group, and difficulty
          const transformedQuests = data.quests.map((quest: any) => ({
            ...quest,
            category: quest.category.replace(/^\d+\.\s*/, ''), // Remove "1. ", "2. ", etc.
            group: quest.group.replace(/^\d+\.\s*/, ''), // Remove "1. ", "2. ", etc.
            difficulty: quest.difficulty.replace(/^\d+\.\s*/, ''), // Remove "1. ", "2. ", etc.
          }));

          setApiQuests(transformedQuests);
        } else {
          setError('Failed to fetch quests');
        }
      } catch (err) {
        setError('Error fetching quests');
        console.error('Error fetching quests:', err);
      } finally {
        setLoading(false);
      }
    };

    // Always fetch on first load
    fetchQuests();
  }, []); // Empty dependency array to only fetch once on mount

  // Filter quests that have booth codes
  const boothQuests = apiQuests.filter(quest => quest.boothCode && quest.boothCode.trim() !== '');

  // Get unique categories for filter
  const categories = ['all', ...Array.from(new Set(boothQuests.map(quest => quest.category)))];

  // Filter booths based on search term and category
  const filteredBoothQuests = boothQuests.filter(quest => {
    const matchesSearch = quest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quest.boothCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || quest.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Show loading only if not client-side yet
  if (!isClient) {
    return (
      <PageLayout title={title}>
        <div className="w-full max-w-4xl mx-auto flex flex-col justify-start items-start gap-3">
          <div className="text-center">Loading booths...</div>
        </div>
      </PageLayout>
    );
  }

  if (loading && apiQuests.length === 0) {
    return (
      <PageLayout title={title}>
        <div className="w-full max-w-4xl mx-auto flex flex-col justify-start items-start gap-3">
          <div className="text-center">Loading booths...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title={title}>
        <div className="w-full max-w-4xl mx-auto flex flex-col justify-start items-start gap-3">
          <div className="text-center text-red-500">Error: {error}</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={title}>
      <div className="w-full max-w-4xl mx-auto flex flex-col justify-start items-start gap-6">
        {/* Header */}
        <div className="w-full text-center">
          <h1 className="text-3xl font-bold text-[#232336] mb-2">Booth Check-in Codes</h1>
          <p className="text-[#4b4b66] text-lg">
            Scan these QR codes to check in at the corresponding booths
          </p>
        </div>

        {/* Search and Filter */}
        {boothQuests.length > 0 && (
          <div className="w-full flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search booths by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-[#dfdfeb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6fae] focus:border-transparent"
              />
            </div>
            <div className="md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-[#dfdfeb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6fae] focus:border-transparent bg-white"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Booth Grid */}
        {boothQuests.length === 0 ? (
          <div className="w-full text-center py-12">
            <div className="text-[#4b4b66] text-lg">
              No booth check-in codes available at the moment.
            </div>
          </div>
        ) : filteredBoothQuests.length === 0 ? (
          <div className="w-full text-center py-12">
            <div className="text-[#4b4b66] text-lg">
              No booths match your search criteria.
            </div>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoothQuests.map((quest, index) => (
              <BoothCard key={quest.id || `booth-${index}`} quest={quest} />
            ))}
          </div>
        )}

        {/* Summary */}
        {boothQuests.length > 0 && (
          <div className="w-full text-center pt-6 border-t border-[#dfdfeb]">
            <p className="text-[#4b4b66]">
              Showing {filteredBoothQuests.length} of {boothQuests.length} booth{boothQuests.length !== 1 ? 's' : ''} available for check-in
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
