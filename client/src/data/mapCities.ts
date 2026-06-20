export interface MapCity {
  name: string;
  country: string;
  province?: string;
  adcode?: string;
  level?: string;
  lat: number;
  lon: number;
}

export const mapCities: MapCity[] = [
  { name: "北京", country: "中国", lat: 39.9, lon: 116.4 },
  { name: "上海", country: "中国", lat: 31.23, lon: 121.47 },
  { name: "杭州", country: "中国", lat: 30.27, lon: 120.15 },
  { name: "广州", country: "中国", lat: 23.13, lon: 113.26 },
  { name: "深圳", country: "中国", lat: 22.54, lon: 114.06 },
  { name: "成都", country: "中国", lat: 30.67, lon: 104.06 },
  { name: "西安", country: "中国", lat: 34.27, lon: 108.94 },
  { name: "哈尔滨", country: "中国", lat: 45.8, lon: 126.53 },
  { name: "乌鲁木齐", country: "中国", lat: 43.82, lon: 87.62 },
  { name: "拉萨", country: "中国", lat: 29.65, lon: 91.13 },
  { name: "香港", country: "中国", lat: 22.32, lon: 114.17 },
  { name: "台北", country: "中国", lat: 25.03, lon: 121.56 },
  { name: "东京", country: "日本", lat: 35.68, lon: 139.76 },
  { name: "首尔", country: "韩国", lat: 37.57, lon: 126.98 },
  { name: "新加坡", country: "新加坡", lat: 1.35, lon: 103.82 },
  { name: "曼谷", country: "泰国", lat: 13.75, lon: 100.5 },
  { name: "伦敦", country: "英国", lat: 51.51, lon: -0.13 },
  { name: "巴黎", country: "法国", lat: 48.86, lon: 2.35 },
  { name: "柏林", country: "德国", lat: 52.52, lon: 13.4 },
  { name: "莫斯科", country: "俄罗斯", lat: 55.75, lon: 37.62 },
  { name: "纽约", country: "美国", lat: 40.71, lon: -74.01 },
  { name: "洛杉矶", country: "美国", lat: 34.05, lon: -118.24 },
  { name: "温哥华", country: "加拿大", lat: 49.28, lon: -123.12 },
  { name: "悉尼", country: "澳大利亚", lat: -33.87, lon: 151.21 },
  { name: "开罗", country: "埃及", lat: 30.04, lon: 31.24 },
  { name: "迪拜", country: "阿联酋", lat: 25.2, lon: 55.27 },
  { name: "约翰内斯堡", country: "南非", lat: -26.2, lon: 28.04 },
  { name: "圣保罗", country: "巴西", lat: -23.55, lon: -46.63 }
];
