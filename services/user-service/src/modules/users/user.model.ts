import mongoose, { Document, Schema } from "mongoose";
import { Role } from "@shared/types/role";
import bcrypt from "bcryptjs";
import { normalizeRole, RoleValue, Roles } from "@shared/constants/roles";

export type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role | RoleValue;
  status: UserStatus;
  limit: number;
  createdAt: Date;
  modifiedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema: Schema<IUser> = new Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 80,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
      match: [/\S+@\S+\.\S+/, "Invalid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 72,
      select: false,
    },
    role: {
      type: String,
      enum: [...Object.values(Roles), Role.USER, Role.EDITOR, Role.VIEWER],
      default: Roles.CUSTOMER,
      set: (value: string) => normalizeRole(value),
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "BLOCKED"],
      default: "ACTIVE",
      index: true,
    },
      limit: {
          type: Number,
          default: 10,
      },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("validate", function (next) {
  this.name = this.name?.trim();
  this.email = this.email?.toLowerCase().trim();
  this.role = normalizeRole(String(this.role)) as any;
  next();
});

//Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

//method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ createdAt: -1, _id: -1 });
userSchema.index({ status: 1, role: 1, createdAt: -1 });

export default mongoose.model<IUser>("User", userSchema);
