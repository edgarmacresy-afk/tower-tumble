import { BeanCharacter } from './BeanCharacter.js';
import { FriendBillboard } from './FriendBillboard.js';

const STORAGE_KEY = 'tower-tumble-skin';
const FRIEND_TEXTURE = '/friends/subject.png';

export const SKINS = ['bean', 'cardboard'];

export function getSkin() {
  const s = localStorage.getItem(STORAGE_KEY);
  return SKINS.includes(s) ? s : 'bean';
}

export function setSkin(skin) {
  if (!SKINS.includes(skin)) return;
  localStorage.setItem(STORAGE_KEY, skin);
}

export function createPlayerCharacter() {
  if (getSkin() === 'cardboard') return new FriendBillboard(FRIEND_TEXTURE);
  return new BeanCharacter();
}
