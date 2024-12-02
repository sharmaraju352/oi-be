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

      const originalName = req.file.originalname;
      const fileExtension = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
      if (!['.csv'].includes(fileExtension)) {
        res.status(400).json({ message: 'Invalid file type. Only CSV files are allowed.' });
        fs.unlinkSync(req.file.path);
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

  public getAirQualityDataTable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { offset = 0, limit = 50 } = req.query;

      const result = await this.airQualityService.getAirQualityDataTable(Number(offset), Number(limit));

      res.status(200).json({ data: result.data, total: result.total, message: 'Data fetched successfully' });
    } catch (error) {
      next(error);
    }
  };

  public getAirQualityData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate, parameters, interval } = req.query;

      const parameterList = typeof parameters === 'string' ? parameters.split(',') : [];

      const data = await this.airQualityService.getAirQualityData(
        new Date(startDate as string),
        new Date(endDate as string),
        parameterList as string[],
        interval as string,
      );

      res.status(200).json({ data, message: 'Data fetched successfully' });
    } catch (error) {
      next(error);
    }
  };
}
