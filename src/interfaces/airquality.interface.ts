export interface AirQuality {
  id: number;
  datetime: Date;
  co_gt: number;
  pt08_s1_co: number;
  nmhc_gt: number;
  c6h6_gt: number;
  pt08_s2_nmhc: number;
  nox_gt: number;
  pt08_s3_nox: number;
  no2_gt: number;
  pt08_s4_no2: number;
  pt08_s5_o3: number;
  t: number;
  rh: number;
  ah: number;
}
