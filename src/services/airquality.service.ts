import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csvParser from 'csv-parser';
import { Service } from 'typedi';

@Service()
export class AirQualityService {
  private prisma = new PrismaClient();

  public async ingestData(filePath: string): Promise<void> {
    // Clear the air_quality table
    await this.prisma.air_quality.deleteMany({});

    const records = [];
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser({ separator: ';' }))
        .on('data', row => {
          if (row.Date && row.Time) {
            const record = {
              date: this.parseDate(row.Date),
              time: this.parseTime(row.Time),
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

  public async getAirQualityData(startDate: Date, endDate: Date, parameters: string[], interval: string): Promise<any[]> {
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

    // Build the select clauses
    const selectClauses = ['date', 'time', ...parameters];

    // Adjust startDate and endDate to include the full day
    const adjustedStartDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
    const adjustedEndDate = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1));

    console.log({ startDate, endDate, adjustedStartDate, adjustedEndDate });

    // Fetch data from the database
    const data = await this.prisma.air_quality.findMany({
      where: {
        date: {
          gte: adjustedStartDate,
          lt: adjustedEndDate,
        },
      },
      select: selectClauses.reduce((acc, curr) => ({ ...acc, [curr]: true }), {}),
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    return data;
  }

  public async getAirQualityDataTable(offset: number, limit: number): Promise<{ data: any[]; total: number }> {
    let [data, total] = await Promise.all([
      this.prisma.air_quality.findMany({
        skip: offset,
        take: limit,
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
      }),
      this.prisma.air_quality.count(),
    ]);
    return { data, total };
  }

  private parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/');
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  };

  private parseTime = (timeStr: string): string => {
    return timeStr.replace(/\./g, ':');
  };

  private parseFloatWithLocale = (value: string): number => parseFloat(value.replace(',', '.'));
}
