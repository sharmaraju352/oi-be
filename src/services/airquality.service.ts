import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csvParser from 'csv-parser';
import { Service } from 'typedi';
import { AirQuality } from '@/interfaces/airquality.interface';

@Service()
export class AirQualityService {
  private prisma = new PrismaClient();

  public async ingestData(filePath: string): Promise<void> {
    const records = [];
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser({ separator: ';' }))
        .on('data', row => {
          if (row.Date && row.Time) {
            const record = {
              datetime: this.parseDateTime(row.Date, row.Time),
              co_gt: this.parseFloatWithLocale(row['CO(GT)']),
              pt08_s1_co: parseInt(row['PT08.S1(CO)'], 10),
              nmhc_gt: parseInt(row['NMHC(GT)'], 10),
              c6h6_gt: this.parseFloatWithLocale(row['C6H6(GT)']),
              pt08_s2_nmhc: parseInt(row['PT08.S2(NMHC)'], 10),
              nox_gt: parseInt(row['NOx(GT)'], 10),
              pt08_s3_nox: parseInt(row['PT08.S3(NOx)'], 10),
              no2_gt: parseInt(row['NO2(GT)'], 10),
              pt08_s4_no2: parseInt(row['PT08.S4(NO2)'], 10),
              pt08_s5_o3: parseInt(row['PT08.S5(O3)'], 10),
              t: this.parseFloatWithLocale(row.T),
              rh: this.parseFloatWithLocale(row.RH),
              ah: this.parseFloatWithLocale(row.AH),
            };
            records.push(record);
          }
        })
        .on('end', async () => {
          // SQLite does not support batch insertion
          for (const record of records) {
            await this.prisma.air_quality.create({ data: record });
          }
          resolve();
        })
        .on('error', error => reject(error));
    });
  }

  public async getAirQualityData(startDate: Date, endDate: Date, parameters: string[], interval: string): Promise<AirQuality[]> {
    let groupByFormat: string;

    if (interval === 'hourly') {
      groupByFormat = '%Y-%m-%d %H:00:00';
    } else if (interval === 'daily') {
      groupByFormat = '%Y-%m-%d 00:00:00';
    } else {
      groupByFormat = '%Y-%m-%d %H:00:00';
    }

    const allowedParameters = [
      'co_gt',
      'pt08_s1_co',
      'nmhc_gt',
      'c6h6_gt',
      'pt08_s2_nmhc',
      'nox_gt',
      'pt08_s3_nox',
      'no2_gt',
      'pt08_s4_no2',
      'pt08_s5_o3',
      't',
      'rh',
      'ah',
    ];

    // Sanitize and validate the parameters
    parameters = parameters.filter(param => allowedParameters.includes(param));

    if (parameters.length === 0) {
      throw new Error('No valid parameters provided');
    }

    const avgClauses = parameters.map(param => `AVG(${param}) as ${param}`).join(', ');

    const query = `
      SELECT 
        strftime('${groupByFormat}', datetime(datetime / 1000, 'unixepoch')) as datetime_group,
        ${avgClauses}
      FROM 
        air_quality
      WHERE 
        datetime BETWEEN ? AND ?
      GROUP BY 
        datetime_group
      ORDER BY 
        datetime_group ASC
    `;

    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const data = await this.prisma.$queryRawUnsafe(query, startTimestamp, endTimestamp);

    return data as AirQuality[];
  }

  private parseDateTime = (date, time) => {
    const [day, month, year] = date.split('/');
    const formattedDate = `${year}-${month}-${day}`;
    const formattedTime = time.replace(/\./g, ':');
    return new Date(`${formattedDate}T${formattedTime}`);
  };

  private parseFloatWithLocale = value => parseFloat(value.replace(',', '.'));
}
