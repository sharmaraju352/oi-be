import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';
import { AirQualityController } from '@/controllers/airquality.controller';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

export class AirQualityRoute implements Routes {
  public path = '/air-quality';
  public router = Router();
  public airQualityController = new AirQualityController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/ingest`, upload.single('file'), this.airQualityController.ingestData);
    this.router.get(`${this.path}/parameter/:parameter`, this.airQualityController.getDataByParameter);
    this.router.get(`${this.path}/date-range`, this.airQualityController.getDataByDateRange);
  }
}
