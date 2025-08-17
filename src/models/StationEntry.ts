import mongoose, { Document, Schema, Types } from "mongoose";

export interface StationEntry extends Document {
  userId: Types.ObjectId;
  stationKey: string;
  payload: any; // JSON payload per-station
  createdAt: Date;
  updatedAt: Date;
}

const StationEntrySchema = new Schema<StationEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "User",
    },
    stationKey: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false, collection: "station_entries" }
);

// Índice único compuesto { userId: 1, stationKey: 1 }
StationEntrySchema.index({ userId: 1, stationKey: 1 }, { unique: true });

export const StationEntryModel = mongoose.model<StationEntry>(
  "StationEntry",
  StationEntrySchema
);
