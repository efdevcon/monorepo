import { Briefcase, DollarSign, Microscope, Cpu, Users, Coffee, Utensils, Palette, ShoppingBag, LogIn } from 'lucide-react'

export interface FilterCategory {
  key: string
  label: string
  icon: React.ComponentType<any>
  color: string
}

export const filterCategories: FilterCategory[] = [
  { key: 'cowork', label: 'Coworking', icon: Briefcase, color: 'bg-green-100 text-green-700' },
  { key: 'defi', label: 'DeFi', icon: DollarSign, color: 'bg-blue-100 text-blue-700' },
  { key: 'biotech', label: 'BioTech', icon: Microscope, color: 'bg-purple-100 text-purple-700' },
  { key: 'hardware', label: 'Hardware', icon: Cpu, color: 'bg-orange-100 text-orange-700' },
  { key: 'social', label: 'Social', icon: Users, color: 'bg-cyan-100 text-cyan-700' },
  { key: 'coffee', label: 'Coffee', icon: Coffee, color: 'bg-red-100 text-red-700' },
  { key: 'fnb', label: 'Food & Drink', icon: Utensils, color: 'bg-pink-100 text-pink-700' },
  { key: 'toilets', label: 'Restrooms', icon: Users, color: 'bg-gray-100 text-gray-700' },
  { key: 'art-exhbition', label: 'Art Gallery', icon: Palette, color: 'bg-yellow-100 text-yellow-700' },
  { key: 'swag', label: 'Merchandise', icon: ShoppingBag, color: 'bg-indigo-100 text-indigo-700' },
  { key: 'entrance', label: 'Entrances', icon: LogIn, color: 'bg-teal-100 text-teal-700' }
]
