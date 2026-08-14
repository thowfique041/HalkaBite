export const parseEventData = <T>(event: MessageEvent<string>): T | null => {
  try { return JSON.parse(event.data) as T; }
  catch { return null; }
};
