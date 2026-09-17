import { ConfigModule } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
  try {
    console.log('Testing resources by prefix...');
    const res1 = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'wgc/',
      max_results: 10,
    });
    console.log(`Found ${res1.resources.length} via prefix wgc/`);

    console.log('Testing search API...');
    const res2 = await cloudinary.search
      .expression('folder:wgc')
      .sort_by('created_at', 'desc')
      .max_results(10)
      .execute();
    console.log(`Found ${res2.resources.length} via search API`);

  } catch (e) {
    console.error(e);
  }
}

run();
