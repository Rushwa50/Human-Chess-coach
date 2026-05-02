const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) {
    return "Cannot reach the backend server. Please start the backend and try again.";
  }
  return error instanceof Error ? error.message : "Request failed";
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new ApiError(response.status, detail.detail ?? "Request failed");
    }
    return response.json() as Promise<T>;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function fetchTts(text: string, token: string): Promise<Blob> {
  try {
    const response = await fetch(`${API_URL}/tts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });
    if (!response.ok) throw new ApiError(response.status, "Voice synthesis unavailable");
    return response.blob();
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
