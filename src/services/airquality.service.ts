import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csvParser from 'csv-parser';
import { Service } from 'typedi';
import { AirQuality } from '@/interfaces/airquality.interface';

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

  public async getAirQualityData(startDate: Date, endDate: Date, parameters: string[], interval: string): Promise<AirQuality[]> {
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

    parameters = parameters.filter(param => allowedParameters.includes(param));

    if (parameters.length === 0) {
      throw new Error('No valid parameters provided');
    }

    const adjustedStartDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
    const adjustedEndDate = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1));

    let groupByClause = 'date';
    let selectDateTimeGroup = "strftime('%Y-%m-%d', date(date / 1000, 'unixepoch')) as datetime_group";

    if (interval === 'hourly') {
      groupByClause = "date, strftime('%H', time)";
      selectDateTimeGroup = "strftime('%Y-%m-%d %H:00:00', datetime(date / 1000, 'unixepoch'), time) as datetime_group";
    } else if (interval === 'daily') {
      groupByClause = 'date';
      selectDateTimeGroup = "strftime('%Y-%m-%d 00:00:00', date(date / 1000, 'unixepoch')) as datetime_group";
    } else {
      groupByClause = "date, strftime('%H', time)";
      selectDateTimeGroup = "strftime('%Y-%m-%d %H:00:00', datetime(date / 1000, 'unixepoch'), time) as datetime_group";
    }

    const avgClauses = parameters.map(param => `AVG(${param}) as ${param}`).join(', ');

    const query = `
      SELECT
        ${selectDateTimeGroup},
        ${avgClauses}
      FROM
        air_quality
      WHERE
        date >= ? AND date < ?
      GROUP BY
        ${groupByClause}
      ORDER BY
        datetime_group ASC
    `;

    let data = await this.prisma.$queryRawUnsafe(query, adjustedStartDate.getTime(), adjustedEndDate.getTime());
    data = (data as { datetime_group: string; [key: string]: string }[]).map(d => ({
      ...d,
      date: d.datetime_group.split(' ')[0],
      time: d.datetime_group.split(' ')[1],
    }));
    return data as AirQuality[];
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
