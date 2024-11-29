import { AirQualityService } from '@/services/airQuality.service';
import { NextFunction, Request, Response } from 'express';
import { Container } from 'typedi';
import fs from 'fs';

export class AirQualityController {
  public airQualityService = Container.get(AirQualityService);

  public ingestData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }
      const filePath = req.file.path;
      await this.airQualityService.ingestData(filePath);

      // Remove the file after processing
      fs.unlinkSync(filePath);

      res.status(200).json({ message: 'Data ingested successfully' });
    } catch (error) {
      next(error);
    }
  };
}
