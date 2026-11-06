const DISCORD_ID_PATTERN = /^\d{17,20}$/;

export function authEmailFromDiscordId(value) {
  const discordId = String(value).trim();
  if (!DISCORD_ID_PATTERN.test(discordId)) return null;
  return `discord-${discordId}@imperio.invalid`;
}