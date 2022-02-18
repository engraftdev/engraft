import { objects } from 'friendly-words';

export default function id(): string {
  return `ID${objects[Math.floor(Math.random() * objects.length)]}${Math.random().toFixed(6).slice(2)}`;
}