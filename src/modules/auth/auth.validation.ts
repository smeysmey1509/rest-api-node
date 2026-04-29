import { Request } from "express";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const NAME_RE = /^[a-zA-Z0-9_.\-\s]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

const isString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const registerValidation = (req: Request) => {
  const errors: string[] = [];
  const name = req.body?.name;
  const email = req.body?.email;
  const password = req.body?.password;

  if (!isString(name)) {
    errors.push("name is required");
  } else {
    const normalizedName = name.trim();
    if (normalizedName.length < 3 || normalizedName.length > 80) {
      errors.push("name must be between 3 and 80 characters");
    }
    if (!NAME_RE.test(normalizedName)) {
      errors.push("name contains unsupported characters");
    }
  }

  if (!isString(email)) {
    errors.push("email is required");
  } else {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length > 120 || !EMAIL_RE.test(normalizedEmail)) {
      errors.push("email must be valid");
    }
  }

  if (!isString(password)) {
    errors.push("password is required");
  } else if (!PASSWORD_RE.test(password)) {
    errors.push("password must be 8-72 characters and include at least one letter and one number");
  }

  return errors;
};

export const loginValidation = (req: Request) => {
  const errors: string[] = [];
  const identifier = req.body?.identifier || req.body?.email || req.body?.name;
  const password = req.body?.password;

  if (!isString(identifier)) {
    errors.push("identifier, email, or name is required");
  } else if (String(identifier).trim().length > 120) {
    errors.push("identifier is too long");
  }

  if (!isString(password)) {
    errors.push("password is required");
  } else if (String(password).length > 72) {
    errors.push("password is too long");
  }

  return errors;
};
