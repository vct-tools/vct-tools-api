export default async function refreshRiotAccessToken(oldRefreshToken: string): Promise<{
  newRefreshToken: string;
  newAccessToken: string;
  expiresIn: number;
}> {
  const formData = new URLSearchParams();
  formData.append("grant_type", "refresh_token");
  formData.append("refresh_token", oldRefreshToken);
  formData.append("scope", "openid+offline_access");

  const data = await fetch("https://auth.riotgames.com/token", {
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RSO_CLIENT_ID}:${process.env.RSO_CLIENT_SECRET}`).toString(`base64`)}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST",
    body: formData.toString()
  });

  if (data.status !== 200) {
    throw new Error("Failed to refresh access token");
  }

  const payload = await data.json() as { access_token: string; refresh_token: string; expires_in: number; };

  if (payload.access_token && payload.refresh_token && payload.expires_in) {
    return {
      newRefreshToken: payload.refresh_token,
      newAccessToken: payload.access_token,
      expiresIn: payload.expires_in
    };
  } else {
    throw new Error("Failed to refresh access token");
  }
}
