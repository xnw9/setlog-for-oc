/** Pastel backgrounds for the initials avatar. Dark text (#3a3346) stays readable on all of them. */
export const AVATAR_COLORS = [
  '#f7a8c4',
  '#c9e4ff',
  '#c8f0d8',
  '#ffd9a8',
  '#d9ccff',
  '#ffe7a3',
  '#ffc9c0',
  '#bfeff0',
];

export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
