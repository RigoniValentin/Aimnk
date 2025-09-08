import mongoose, { Schema } from "mongoose";
import { User } from "types/UserTypes";
import bcrypt from "bcrypt";

const UserSchema: Schema = new Schema<User>(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: { type: String },
    bio: { type: String, maxlength: 500 },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastActive: { type: Date },
    permissions: {
      type: [String],
      default: [],
    },
    roles: [
      {
        type: Schema.Types.ObjectId,
        ref: "Roles",
      },
    ],
    subscription: {
      transactionId: { type: String },
      paymentDate: { type: Date },
      expirationDate: { type: Date },
    },
    couponUsed: { type: Boolean, default: false },
    nationality: {
      type: String,
    },
    locality: {
      type: String,
    },
    age: {
      type: Number,
    },
    // Nuevos campos para recuperación de contraseña
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

UserSchema.pre<User>("save", async function (next) {
  if (this.isModified("password") || this.isNew) {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
  }
  next();
});

UserSchema.method(
  "comparePassword",
  async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password as string);
  }
);

UserSchema.methods.toJSON = function () {
  const userObj = this.toObject();
  delete userObj.password;
  return userObj;
};

export const UserModel = mongoose.model<User>("User", UserSchema);
