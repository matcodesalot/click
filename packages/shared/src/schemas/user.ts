import { z } from "zod";

export const UserSchema = z.object({
  // Better Auth's default user shape has email, password, and name (not username).
  id: z.string(), // MongoDB ObjectIds are hex strings, not UUIDs
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
});

export const LoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const RegisterSchema = LoginSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

// Infer TypeScript types from the schemas
export type User = z.infer<typeof UserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;