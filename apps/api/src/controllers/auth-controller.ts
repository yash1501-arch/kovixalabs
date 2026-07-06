import type { Request, Response } from "express";
import { z } from "zod";
import {
  registerUser,
  loginUser,
  loadSession,
  refreshAuthSession,
  generatePasswordResetToken,
  resetPassword,
  updateProfile,
  changePassword,
  updateWorkspace,
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

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6).max(128),
});

export async function forgotPassword(request: Request, response: Response) {
  const { email } = ForgotPasswordSchema.parse(request.body);
  await generatePasswordResetToken(email);
  response.json({ success: true, message: "If an account exists, a reset link has been sent." });
}

export async function handleResetPassword(request: Request, response: Response) {
  const { token, password } = ResetPasswordSchema.parse(request.body);
  await resetPassword(token, password);
  response.json({ success: true, message: "Password reset successfully. You can now sign in." });
}

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(128),
});

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function handleUpdateProfile(request: Request, response: Response) {
  if (!request.user) { response.status(401).json({ error: "unauthorized" }); return; }
  const { name } = UpdateProfileSchema.parse(request.body);
  const user = await updateProfile(request.user.id, name);
  response.json(user);
}

export async function handleChangePassword(request: Request, response: Response) {
  if (!request.user) { response.status(401).json({ error: "unauthorized" }); return; }
  const { currentPassword, newPassword } = ChangePasswordSchema.parse(request.body);
  await changePassword(request.user.id, currentPassword, newPassword);
  response.json({ success: true, message: "Password changed. Please sign in again." });
}

export async function handleUpdateWorkspace(request: Request, response: Response) {
  if (!request.user) { response.status(401).json({ error: "unauthorized" }); return; }
  const { workspaceId } = z.object({ workspaceId: z.string().min(1) }).parse(request.params);
  const { name } = UpdateWorkspaceSchema.parse(request.body);
  const workspace = await updateWorkspace(workspaceId, request.user.id, name);
  response.json(workspace);
}
