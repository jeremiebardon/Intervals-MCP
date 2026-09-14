// scripts/record-fixtures.ts
import { config } from 'dotenv';
import axios from 'axios';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

config();

const outDir = join(__dirname, '../fixtures/recorded');
mkdirSync(outDir, { recursive: true });

const apiKey = process.env.INTERVALS_API_KEY;
const athleteId = process.env.INTERVALS_ATHLETE_ID ?? '0';

if (!apiKey) {
  console.error(
    'INTERVALS_API_KEY is not set. Copy .env.example to .env and fill it in.',
  );
  process.exit(1);
}

const auth = { username: 'API_KEY', password: apiKey };
const base = 'https://intervals.icu/api/v1';
const oldest = '2026-08-01';
const newest = '2026-09-13';

async function record(
  name: string,
  url: string,
  params: Record<string, string>,
) {
  const response = await axios.get(url, { auth, params });
  writeFileSync(join(outDir, name), JSON.stringify(response.data, null, 2));
  console.log(`Wrote fixtures/recorded/${name}`);
}

async function main() {
  await record('activities.json', `${base}/athlete/${athleteId}/activities`, {
    oldest,
    newest,
  });
  await record('wellness.json', `${base}/athlete/${athleteId}/wellness`, {
    oldest,
    newest,
  });
  await record('planned-workouts.json', `${base}/athlete/${athleteId}/events`, {
    oldest,
    newest,
  });

  const activities = JSON.parse(
    readFileSync(join(outDir, 'activities.json'), 'utf-8'),
  ) as Array<{ id: string }>;
  if (activities.length > 0) {
    await record(
      `activity-detail.json`,
      `${base}/activity/${activities[0].id}`,
      {},
    );
  } else {
    console.warn(
      'No activities in range; activity-detail.json was not refreshed.',
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
