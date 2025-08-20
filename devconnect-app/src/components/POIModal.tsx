import React from 'react';
import { X } from 'lucide-react';
import { POI } from '@/data/poiData';
import { filterCategories } from '@/data/filterCategories';

interface POIModalProps {
  selectedPOI: POI | null;
  onClose: () => void;
  getPOIColor: (category: string) => string;
}

export const POIModal: React.FC<POIModalProps> = ({
  selectedPOI,
  onClose,
  getPOIColor,
}) => {
  if (!selectedPOI) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4"
      onClick={onClose}
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
              onClick={onClose}
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
            <div className={`p-2 rounded-lg ${getPOIColor(selectedPOI.category)}`}>
              {filterCategories.find((f) => f.key === selectedPOI.category)?.icon &&
                React.createElement(
                  filterCategories.find((f) => f.key === selectedPOI.category)!.icon,
                  { className: 'h-5 w-5' }
                )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selectedPOI.name}</h2>
              <p className="text-sm text-gray-600 capitalize">{selectedPOI.category}</p>
            </div>
          </div>
          {!selectedPOI.heroImage && (
            <button
              onClick={onClose}
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
              <p className="text-sm text-gray-700">{selectedPOI.companyDescription}</p>
            </div>
          )}

          {/* Companies List for Districts */}
          {selectedPOI.companies && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Companies Showcasing</h4>
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
          {selectedPOI.currentEvent && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Current Event</h4>
              <p className="text-sm text-blue-700">{selectedPOI.currentEvent}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
