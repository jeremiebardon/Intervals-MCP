// scripts/record-fixtures.ts
import { config } from 'dotenv';
import axios from 'axios';
import { writeFileSync } from 'fs';
import { join } from 'path';

config();

const apiKey = process.env.INTERVALS_API_KEY;
const athleteId = process.env.INTERVALS_ATHLETE_ID ?? '0';

if (!apiKey) {
  console.error('INTERVALS_API_KEY is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const auth = { username: 'API_KEY', password: apiKey };
const base = 'https://intervals.icu/api/v1';
const oldest = '2026-08-01';
const newest = '2026-09-13';

async function record(name: string, url: string, params: Record<string, string>) {
  const response = await axios.get(url, { auth, params });
  writeFileSync(join(__dirname, '../fixtures', name), JSON.stringify(response.data, null, 2));
  console.log(`Wrote fixtures/${name}`);
}

async function main() {
  await record('activities.json', `${base}/athlete/${athleteId}/activities`, { oldest, newest });
  await record('wellness.json', `${base}/athlete/${athleteId}/wellness`, { oldest, newest });
  await record('planned-workouts.json', `${base}/athlete/${athleteId}/events`, { oldest, newest });

  const activities = JSON.parse(
    require('fs').readFileSync(join(__dirname, '../fixtures/activities.json'), 'utf-8'),
  );
  if (activities.length > 0) {
    await record(`activity-detail.json`, `${base}/activity/${activities[0].id}`, {});
  } else {
    console.warn('No activities in range; activity-detail.json was not refreshed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
