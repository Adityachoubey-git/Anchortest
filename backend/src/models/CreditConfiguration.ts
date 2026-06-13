import { Schema, model, Document } from 'mongoose';

export interface ICreditConfiguration extends Document {
  name: string;
  progressionType: 'ARITHMETIC' | 'CUSTOM_MAP';
  arithmeticConfig: {
    startValue: number;
    commonDifference: number;
  };
  customMap: Map<string, number>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CreditConfigurationSchema = new Schema<ICreditConfiguration>(
  {
    name: { type: String, required: true, unique: true },
    progressionType: {
      type: String,
      enum: ['ARITHMETIC', 'CUSTOM_MAP'],
      required: true,
      default: 'ARITHMETIC',
    },
    arithmeticConfig: {
      startValue: { type: Number, default: 1 },
      commonDifference: { type: Number, default: 2 },
    },
    customMap: {
      type: Map,
      of: Number,
      default: {},
    },
    isActive: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const CreditConfigurationModel = model<ICreditConfiguration>(
  'CreditConfiguration',
  CreditConfigurationSchema
);
export default CreditConfigurationModel;
