import notificationSoundUrl from "../assets/audio/toque.mp3";

let audio: HTMLAudioElement | null = null;

function getNotificationAudio(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!audio) {
    audio = new Audio(notificationSoundUrl);
    audio.volume = 0.5;
    audio.preload = "auto";
  }
  return audio;
}

export async function unlockNotificationSound(): Promise<void> {
  const notificationAudio = getNotificationAudio();
  if (!notificationAudio) return;

  const currentVolume = notificationAudio.volume;
  notificationAudio.volume = 0;

  try {
    await notificationAudio.play();
    notificationAudio.pause();
    notificationAudio.currentTime = 0;
  } catch {
    // O navegador tentará novamente após a próxima interação do usuário.
  } finally {
    notificationAudio.volume = currentVolume;
  }
}

export async function playNotificationSound(): Promise<void> {
  const notificationAudio = getNotificationAudio();
  if (!notificationAudio) return;

  notificationAudio.currentTime = 0;

  try {
    await notificationAudio.play();
  } catch (error: unknown) {
    console.error("Erro ao reproduzir notificação:", error);
  }
}
