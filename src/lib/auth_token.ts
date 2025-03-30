import jwt from "jsonwebtoken";

export function generate(puuid: string): string {
  return jwt.sign({ puuid }, process.env.JWT_SECRET as string, { expiresIn: "25d" });
}

export function verify(token: string): string | null {
  try {
    const puuid = (jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload).puuid;
    return puuid;
  } catch {
    return null;
  }
}
