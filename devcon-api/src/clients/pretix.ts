const PRETIX_QUESTIONS = {
  years: 98, // 'I'm new to the space!
  tracks: 100,
  role: 101,
  otherRole: 102,
  expertise: 100,
  audience: 101,
  favoriteSpeakers: 102,
  favoriteTags: 103,
}

export function RemapPretixRoles(role: string) {
  if (role === 'Developer') return ['Engineering', 'Developer']
  if (role === 'Founder / Co-Founder') return ['Engineering', 'Business', 'Product']
  if (role === 'Researcher') return ['Research']
  if (role === 'Marketing') return ['Marketing', 'Community']
  if (role === 'Product Lead') return ['Product', 'Design']
  if (role === 'Other') return ['Business']
  if (role === 'Entrepreneur / Independent') return ['Developer', 'Business', 'Product']
  if (role === 'Investor / VC') return ['Business']
  if (role === 'Project Manager') return ['Business']
  if (role === 'Operations') return ['Business', 'Community']
  if (role === 'Sales') return ['Business', 'Marketing']
  if (role === 'Designer') return ['Design', 'Product']
  if (role === 'Social / Community Enthusiast') return ['Community', 'Hobby']
  if (role === 'Education') return ['Academic']
  if (role === 'Financial') return ['Business']
  if (role === 'Legal / Compliance') return ['Business', 'Lobby']
  if (role === 'Human Resources') return ['Business', 'Community']
  if (role === 'Customer Support') return ['Community']
  if (role === 'Regulator / Government Official') return ['Business', 'Lobby']

  return []
}
