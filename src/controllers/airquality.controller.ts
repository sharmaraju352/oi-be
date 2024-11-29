import { AirQualityService } from '@/services/airquality.service';
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

  public getDataByParameter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { parameter } = req.params;
      const data = await this.airQualityService.getDataByParameter(parameter as string);

      res.status(200).json({ data, message: 'Data fetched successfully' });
    } catch (error) {
      next(error);
    }
  };

  public getDataByDateRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;
      const data = await this.airQualityService.getDataByDateRange(new Date(startDate as string), new Date(endDate as string));

      res.status(200).json({ data, message: 'Data fetched successfully' });
    } catch (error) {
      next(error);
    }
  };
}
