import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { QuestPOI } from '@/hooks/useQuestPOIs';
import { filterCategories } from '@/data/to-delete/filterCategories';

interface POIModalProps {
  selectedPOI: QuestPOI | null;
  onClose: () => void;
  getPOIColor: (category: string) => string;
  position?: { x: number; y: number };
}

export const POIModal: React.FC<POIModalProps> = ({
  selectedPOI,
  onClose,
  getPOIColor,
  position,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, onClose]);

  if (!selectedPOI) return null;

  // Tooltip version (minimalist)
  if (!isExpanded) {
    return (
      <div
        ref={tooltipRef}
        data-tooltip
        className="absolute z-60 pointer-events-none"
        style={{
          left: position?.x || 0,
          top: position?.y || 0,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div
          className="bg-gray-600 border border-white rounded-lg shadow-lg p-3 pointer-events-auto cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded ${getPOIColor(selectedPOI.category)}`}
            >
              {filterCategories.find((f) => f.key === selectedPOI.category)
                ?.icon &&
                React.createElement(
                  filterCategories.find((f) => f.key === selectedPOI.category)!
                    .icon,
                  { className: 'h-4 w-4' }
                )}
            </div>
            {/* Logo */}
            {selectedPOI.logo && (
              <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 border border-gray-300">
                <img
                  src={selectedPOI.logo}
                  alt={`${selectedPOI.name} logo`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">
                {selectedPOI.name}
              </h3>
              <p className="text-xs text-white capitalize">
                {selectedPOI.questCategory}
              </p>
            </div>
            {/* Quest indicator */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600 font-medium">Quest</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-white">Click to view details</div>
        </div>
        {/* Rectangle pointing down */}
        <div className="w-1 h-20 bg-gray-600 mx-auto mt-[-1px]"></div>
      </div>
    );
  }

  // Expanded modal version (full details)
  return (
    <div
      ref={tooltipRef}
      data-tooltip
      className="absolute inset-0 bg-black/60 z-60 flex items-center justify-center p-4"
      onClick={() => setIsExpanded(false)}
    >
      <div
        className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Image */}
        {selectedPOI.heroImage && (
          <div className="relative">
            <img
              src={selectedPOI.heroImage}
              alt={selectedPOI.name}
              className="w-full h-48 object-cover rounded-t-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.style.display = 'none';
                }
              }}
            />
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-3 right-3 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div
          className={`flex items-center justify-between p-4 ${selectedPOI.heroImage ? '' : 'border-b'}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${getPOIColor(selectedPOI.category)}`}
            >
              {filterCategories.find((f) => f.key === selectedPOI.category)
                ?.icon &&
                React.createElement(
                  filterCategories.find((f) => f.key === selectedPOI.category)!
                    .icon,
                  { className: 'h-5 w-5' }
                )}
            </div>
            {/* Logo */}
            {selectedPOI.logo && (
              <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-gray-300">
                <img
                  src={selectedPOI.logo}
                  alt={`${selectedPOI.name} logo`}
                  className="w-full h-full object-cover"
                  onLoad={() =>
                    console.log(
                      'Modal logo loaded successfully:',
                      selectedPOI.logo
                    )
                  }
                  onError={(e) => {
                    console.log('Modal logo failed to load:', selectedPOI.logo);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {selectedPOI.name}
              </h2>
              <p className="text-sm text-gray-600 capitalize">
                {selectedPOI.questCategory}
              </p>
            </div>
          </div>
          {!selectedPOI.heroImage && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4">
          {/* Company Description */}
          {selectedPOI.companyDescription && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">About</h4>
              <p className="text-sm text-gray-700">
                {selectedPOI.companyDescription}
              </p>
            </div>
          )}

          {/* Companies List for Districts */}
          {selectedPOI.companies && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                Companies Showcasing
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {selectedPOI.companies.map((company, index) => (
                  <div key={index} className="text-sm text-gray-700">
                    {company}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Event */}
          {/* {selectedPOI.currentEvent && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Current Event</h4>
              <p className="text-sm text-blue-700">
                {selectedPOI.currentEvent}
              </p>
            </div>
          )} */}

          {/* Website Link */}
          {selectedPOI?.websiteLink && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Website</h4>
              <p className="text-sm text-blue-700 cursor-pointer">
                {selectedPOI.websiteLink}
              </p>
            </div>
          )}

          {/* Social Link */}
          {selectedPOI?.socialLink && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Social</h4>
              <p className="text-sm text-blue-700 cursor-pointer">
                {selectedPOI.socialLink}
              </p>
            </div>
          )}

          {/* View Related Quest Button */}
          <div className="border-t pt-4">
            <a
              href={`/quests#${selectedPOI.questId}`}
              className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              onClick={() => {
                setIsExpanded(false);
                onClose();
              }}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              View Quest Details
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
