import { useEffect, useRef, useState } from 'react';

// Singleton to manage which dropdown is currently open
let currentOpenDropdown: string | null = null;
const listeners: Set<(id: string | null) => void> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener(currentOpenDropdown));
}

export function useDropdownManager(id: string) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = (openId: string | null) => {
      // Close this dropdown if another one opens
      if (openId !== id && isOpen) {
        setIsOpen(false);
      }
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [id, isOpen]);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        currentOpenDropdown = null;
        notifyListeners();
      }
    };

    // Add a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    currentOpenDropdown = newIsOpen ? id : null;
    notifyListeners();
  };

  return {
    isOpen,
    toggleDropdown,
    dropdownRef,
  };
}

