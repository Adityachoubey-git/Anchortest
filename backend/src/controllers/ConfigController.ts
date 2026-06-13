import { Request, Response } from 'express';
import { creditConfigRepository } from '../repositories/CreditConfigRepository';

export class ConfigController {
  getConfig = async (req: Request, res: Response) => {
    try {
      let config = await creditConfigRepository.findActive();

      if (!config) {
        config = await creditConfigRepository.findAny();
      }

      return res.status(200).json({ config });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };

  saveConfig = async (req: Request, res: Response) => {
    try {
      const { name, progressionType, startValue, commonDifference, customMap } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Configuration name is required' });
      }

      let config = await creditConfigRepository.findByName(name);

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
        await creditConfigRepository.save(config);
      } else {
        config = await creditConfigRepository.create({
          name,
          progressionType: progressionType || 'ARITHMETIC',
          arithmeticConfig: {
            startValue: startValue !== undefined ? Number(startValue) : 1,
            commonDifference: commonDifference !== undefined ? Number(commonDifference) : 2,
          },
          customMap: customMap ? new Map(Object.entries(customMap)) : new Map(),
          isActive: true,
        });
      }

      await creditConfigRepository.deactivateOthers(config._id);

      return res.status(200).json({ message: 'Configuration saved and activated', config });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  };
}

export const configController = new ConfigController();
