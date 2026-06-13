import { CreditConfigurationModel, ICreditConfiguration } from '../models/CreditConfiguration';
import { ClientSession } from 'mongoose';

export class CreditConfigRepository {
  async findActive(session?: ClientSession): Promise<ICreditConfiguration | null> {
    const query = CreditConfigurationModel.findOne({ isActive: true });
    if (session) {
      query.session(session);
    }
    return query.exec();
  }

  async findAny(): Promise<ICreditConfiguration | null> {
    return CreditConfigurationModel.findOne().exec();
  }

  async findByName(name: string): Promise<ICreditConfiguration | null> {
    return CreditConfigurationModel.findOne({ name }).exec();
  }

  async create(configData: Partial<ICreditConfiguration>): Promise<ICreditConfiguration> {
    const config = new CreditConfigurationModel(configData);
    return config.save();
  }

  async save(config: ICreditConfiguration): Promise<ICreditConfiguration> {
    return config.save();
  }

  async deactivateOthers(activeId: any): Promise<void> {
    await CreditConfigurationModel.updateMany(
      { _id: { $ne: activeId } },
      { $set: { isActive: false } }
    ).exec();
  }

  async count(): Promise<number> {
    return CreditConfigurationModel.countDocuments();
  }
}

export const creditConfigRepository = new CreditConfigRepository();
