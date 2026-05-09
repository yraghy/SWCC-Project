"use strict";

const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

const REGION = process.env.AWS_REGION || "eu-central-1";
const RESIZED_BUCKET = process.env.RESIZED_BUCKET;
const MAX_WIDTH = Number(process.env.MAX_WIDTH || 800);

const s3 = new S3Client({ region: REGION });

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

exports.handler = async (event) => {
  if (!RESIZED_BUCKET) throw new Error("RESIZED_BUCKET env var is required");

  const results = [];
  for (const record of event.Records || []) {
    const srcBucket = record.s3.bucket.name;
    const srcKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    const obj = await s3.send(new GetObjectCommand({ Bucket: srcBucket, Key: srcKey }));
    const buf = await streamToBuffer(obj.Body);

    const resized = await sharp(buf)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    const dstKey = srcKey.replace(/\.[^.]+$/, "") + ".jpg";

    await s3.send(
      new PutObjectCommand({
        Bucket: RESIZED_BUCKET,
        Key: dstKey,
        Body: resized,
        ContentType: "image/jpeg",
        Metadata: { "source-bucket": srcBucket, "source-key": srcKey },
      }),
    );

    results.push({ srcKey, dstKey, bytes: resized.length });
  }
  return { ok: true, processed: results };
};
