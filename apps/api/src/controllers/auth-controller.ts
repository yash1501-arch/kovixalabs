import type { Request, Response } from "express";
import { z } from "zod";
import {
  registerUser,
  loginUser,
  loadSession,
  refreshAuthSession,
} from "../services/auth-service.js";
import { verifyJwt } from "../utils/jwt.js";

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  workspaceName: z.string().max(100).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function register(request: Request, response: Response) {
  const input = RegisterSchema.parse(request.body);
  const result = await registerUser(input);
  response.status(201).json(result);
}

export async function login(request: Request, response: Response) {
  const input = LoginSchema.parse(request.body);
  const result = await loginUser(input);
  response.json(result);
}

export async function me(request: Request, response: Response) {
  if (!request.user) {
    response.status(401).json({ error: "unauthorized", message: "Not authenticated." });
    return;
  }

  const result = await loadSession(request.user.id);
  response.json(result);
}

export async function refreshToken(request: Request, response: Response) {
  const body = RefreshSchema.parse(request.body);
  const payload = verifyJwt(body.refreshToken);
  const result = await refreshAuthSession(payload.sub);
  response.json(result);
}

export async function logout(request: Request, response: Response) {
  response.status(204).send();
}
