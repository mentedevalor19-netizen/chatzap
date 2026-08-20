'use client';

const NEW_MESSAGE_SOUND_URL = '/sounds/new-message.mp3';
const MAX_PLAYED_MESSAGE_IDS = 120;

let newMessageAudio: HTMLAudioElement | null = null;
let unlockListenerAttached = false;

function getNewMessageAudio() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!newMessageAudio) {
    newMessageAudio = new Audio(NEW_MESSAGE_SOUND_URL);
    newMessageAudio.preload = 'auto';
    newMessageAudio.volume = 0.7;
  }

  return newMessageAudio;
}

export function warmNewMessageSound() {
  if (unlockListenerAttached || typeof window === 'undefined') {
    return;
  }

  unlockListenerAttached = true;

  const unlockAudio = () => {
    const audio = getNewMessageAudio();
    if (!audio) return;

    audio.muted = true;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => undefined)
      .finally(() => {
        audio.muted = false;
      });
  };

  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

export function playNewMessageSound() {
  const audio = getNewMessageAudio();
  if (!audio) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function rememberPlayedMessageId(playedIds: Set<string>, messageId: string) {
  if (playedIds.has(messageId)) {
    return false;
  }

  playedIds.add(messageId);

  if (playedIds.size > MAX_PLAYED_MESSAGE_IDS) {
    const [oldestMessageId] = playedIds;
    playedIds.delete(oldestMessageId);
  }

  return true;
}
