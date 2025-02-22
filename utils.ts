import { Tokens } from "@prisma/client";

export const isExpired = (token: Tokens | null) => {
  if (!token) return true;
  const decoded = JSON.parse(atob(token.token.split(".")[1]));
  return decoded.exp * 1000 < Date.now();
};

export const now = () => new Date().toLocaleString();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
