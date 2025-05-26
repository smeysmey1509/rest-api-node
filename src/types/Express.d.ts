// types/express.d.ts (or wherever you keep your types)
import { Request } from "express";

export interface AuthenicationRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}
