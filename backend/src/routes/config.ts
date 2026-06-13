import { Router, Request, Response } from 'express';
import { CreditConfigurationModel } from '../models/CreditConfiguration';

const router = Router();


router.get('/', async (req: Request, res: Response) => {
  try {
    let config = await CreditConfigurationModel.findOne({ isActive: true });


    if (!config) {
      config = await CreditConfigurationModel.findOne();
    }

    return res.status(200).json({ config });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});


router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, progressionType, startValue, commonDifference, customMap } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Configuration name is required' });
    }


    let config = await CreditConfigurationModel.findOne({ name });

    if (config) {
      config.progressionType = progressionType || config.progressionType;
      if (progressionType === 'ARITHMETIC') {
        config.arithmeticConfig = {
          startValue: startValue !== undefined ? Number(startValue) : config.arithmeticConfig.startValue,
          commonDifference: commonDifference !== undefined ? Number(commonDifference) : config.arithmeticConfig.commonDifference,
        };
      } else if (progressionType === 'CUSTOM_MAP' && customMap) {
        config.customMap = new Map(Object.entries(customMap));
      }
      config.isActive = true;
      await config.save();
    } else {
      config = new CreditConfigurationModel({
        name,
        progressionType: progressionType || 'ARITHMETIC',
        arithmeticConfig: {
          startValue: startValue !== undefined ? Number(startValue) : 1,
          commonDifference: commonDifference !== undefined ? Number(commonDifference) : 2,
        },
        customMap: customMap ? new Map(Object.entries(customMap)) : new Map(),
        isActive: true,
      });
      await config.save();
    }


    await CreditConfigurationModel.updateMany(
      { _id: { $ne: config._id } },
      { $set: { isActive: false } }
    );

    return res.status(200).json({ message: 'Configuration saved and activated', config });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
