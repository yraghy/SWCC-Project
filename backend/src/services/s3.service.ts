import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/aws.config";

export const s3 = new S3Client({ region: env.awsRegion });

export async function presignUpload(key: string, contentType: string, expiresIn = 300): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.s3.originals,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function presignDownload(bucket: string, key: string, expiresIn = 300): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.s3.originals,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteOriginal(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.s3.originals, Key: key }));
}

export async function deleteResized(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.s3.resized, Key: key }));
}

export const BUCKETS = env.s3;
