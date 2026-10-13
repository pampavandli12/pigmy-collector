/** Fallback text labels (first letter / initials) for a customer avatar when no photo is available. */
export function getFirstLetterLabel(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'U';
}

export function getInitialsLabel(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
