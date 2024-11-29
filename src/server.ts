import { App } from '@/app';
import { ValidateEnv } from '@utils/validateEnv';
import { AirQualityRoute } from './routes/airquality.route';

ValidateEnv();

const app = new App([new AirQualityRoute()]);

app.listen();
