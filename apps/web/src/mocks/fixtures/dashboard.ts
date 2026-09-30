export type Dashboard = {
  greeting: string;
  date: string;
  today: {
    badge: string;
    weather: string;
    title: string;
    detail: string;
    distanceKm: number;
    targetPace: string;
  };
  metrics: {
    id: string;
    label: string;
    value: string;
    unit: string;
    delta: string;
    tone: 'up' | 'down' | 'steady';
    icon: 'route' | 'gauge' | 'heart' | 'flame';
  }[];
  trainingLoad: {
    deltaLabel: string;
    weeks: { week: number; value: number }[];
  };
  upNext: {
    id: string;
    day: string;
    title: string;
    detail: string;
    tag: 'KEY' | 'EASY' | 'LONG';
    icon: 'gauge' | 'waves' | 'route';
  }[];
  route: {
    name: string;
    detail: string;
    badge: string;
  };
  recovery: {
    score: number;
    headline: string;
    sleep: string;
    hrv: string;
    rhr: string;
    note: string;
  };
  plan: {
    title: string;
    detail: string;
    progress: number;
  };
};

export const dashboardFixture: Dashboard = {
  greeting: 'Good morning, Alex',
  date: 'Saturday, September 26 · Build week 8',
  today: {
    badge: 'Today · Key session',
    weather: '16° · Clear · 8 km/h',
    title: 'Progressive tempo',
    detail: '2 km easy · 6 km progressive · 2 km cool-down',
    distanceKm: 10.0,
    targetPace: '04:48',
  },
  metrics: [
    {
      id: 'distance',
      label: 'Weekly distance',
      value: '42.8',
      unit: 'KM',
      delta: '+12%',
      tone: 'up',
      icon: 'route',
    },
    {
      id: 'pace',
      label: 'Average pace',
      value: '04:42',
      unit: '/KM',
      delta: '-0:08',
      tone: 'down',
      icon: 'gauge',
    },
    {
      id: 'heart',
      label: 'Heart load',
      value: '148',
      unit: 'BPM',
      delta: 'STABLE',
      tone: 'steady',
      icon: 'heart',
    },
    {
      id: 'consistency',
      label: 'Consistency',
      value: '92',
      unit: '%',
      delta: '+4%',
      tone: 'up',
      icon: 'flame',
    },
  ],
  trainingLoad: {
    deltaLabel: '+8.4%',
    weeks: [
      { week: 1, value: 38 },
      { week: 2, value: 46 },
      { week: 3, value: 40 },
      { week: 4, value: 58 },
      { week: 5, value: 52 },
      { week: 6, value: 64 },
      { week: 7, value: 50 },
      { week: 8, value: 72 },
      { week: 9, value: 60 },
      { week: 10, value: 82 },
      { week: 11, value: 70 },
      { week: 12, value: 92 },
    ],
  },
  upNext: [
    {
      id: 'today',
      day: 'Today',
      title: 'Progressive tempo',
      detail: '10.0 km · 52 min',
      tag: 'KEY',
      icon: 'gauge',
    },
    {
      id: 'thu',
      day: 'Thu 27',
      title: 'Easy aerobic',
      detail: '7.0 km · 38 min',
      tag: 'EASY',
      icon: 'waves',
    },
    {
      id: 'sat',
      day: 'Sat 29',
      title: 'Long run',
      detail: '18.0 km · 1h 34m',
      tag: 'LONG',
      icon: 'route',
    },
  ],
  route: {
    name: 'Riverside tempo loop',
    detail: '8.4 KM · +62 M · PAVED',
    badge: 'Recommended',
  },
  recovery: {
    score: 86,
    headline: 'Ready for quality work',
    sleep: '8:12',
    hrv: '71',
    rhr: '48',
    note: 'All signals inside your baseline',
  },
  plan: {
    title: 'Race day in 26 days',
    detail: 'River City Half · Build phase',
    progress: 62,
  },
};
