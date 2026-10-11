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
