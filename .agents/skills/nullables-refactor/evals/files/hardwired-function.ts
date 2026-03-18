// A standalone function that fetches user data from an API
// and formats it — classic HARDWIRED_INFRASTRUCTURE

interface User {
  id: string;
  name: string;
  email: string;
}

export async function getUserProfile(userId: string): Promise<{
  displayName: string;
  avatarUrl: string;
}> {
  const response = await fetch(`https://api.example.com/users/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  const user: User = await response.json();

  // Pure transformation — this part is fine
  const displayName = `${user.name} (${user.email})`;
  const avatarUrl = `https://avatars.example.com/${user.id}.png`;

  return { displayName, avatarUrl };
}

export async function saveUserPreferences(
  userId: string,
  preferences: Record<string, string>,
): Promise<void> {
  await fetch(`https://api.example.com/users/${userId}/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });
}
