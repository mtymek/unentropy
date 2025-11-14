import { S3Client } from 'bun';

const client = new S3Client({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_BUCKET,
    endpoint: process.env.AWS_ENDPOINT,
});

const list = await client.list({});
console.log(list);

const file = client.file("unentropy-metrics.db");


