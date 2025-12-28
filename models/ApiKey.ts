import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface ApiKeyDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  key: string;
  keyHash: string;
  isActive: boolean;
  requestCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  incrementRequestCount(): Promise<ApiKeyDocument>;
  populate(path: string): Promise<ApiKeyDocument>;
}

const ApiKeySchema = new Schema<ApiKeyDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      default: 'Default Key',
    },
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    keyHash: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    requestCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: Date,
  },
  {
    timestamps: true,
    collection: 'apikeys',
  }
);

// Indexes
ApiKeySchema.index({ userId: 1 });
ApiKeySchema.index({ keyHash: 1 });
ApiKeySchema.index({ isActive: 1 });

// Static methods
interface ApiKeyModel extends Model<ApiKeyDocument> {
  generateKey(): string;
  hashKey(key: string): string;
  findByKey(key: string): Promise<ApiKeyDocument | null>;
}

// Generate API key
ApiKeySchema.statics.generateKey = function(): string {
  return `rdb_${crypto.randomBytes(32).toString('hex')}`;
};

// Hash API key
ApiKeySchema.statics.hashKey = function(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
};

// Find API key by key string
ApiKeySchema.statics.findByKey = async function(key: string) {
  const keyHash = (this as ApiKeyModel).hashKey(key);
  const apiKey = await this.findOne({ keyHash, isActive: true });
  if (!apiKey) return null;
  
  // Populate user
  await apiKey.populate('userId');
  return apiKey;
};

// Increment request count
ApiKeySchema.methods.incrementRequestCount = function() {
  this.requestCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

const ApiKeyModel = (mongoose.models.ApiKey || mongoose.model<ApiKeyDocument, ApiKeyModel>('ApiKey', ApiKeySchema)) as ApiKeyModel;

export default ApiKeyModel;

