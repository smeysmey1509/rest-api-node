// Update the import path below if the User model is located elsewhere
import { IUser } from '../../../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
