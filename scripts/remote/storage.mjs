import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'node:crypto'

export function r2Client(accountId, credentials) {
  return new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: credentials.R2_ACCESS_KEY_ID, secretAccessKey: credentials.R2_SECRET_ACCESS_KEY } })
}
export class ObjectStore {
  constructor(client, bucket) { this.client = client; this.bucket = bucket }
  async bytes(key) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
    return Buffer.from(await result.Body.transformToByteArray())
  }
  async read(key) {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      return { value: JSON.parse(await result.Body.transformToString()), etag: result.ETag }
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) return null
      throw error
    }
  }
  async write(key, value, condition = {}) {
    const result = await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key,
      Body: JSON.stringify(value), ContentType: 'application/json', ...condition }))
    return result.ETag
  }
  async remove(key, etag) {
    if (!etag) throw new Error('Conditional deletion requires an ETag')
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key, IfMatch: etag }))
  }
  async upload(key, bytes, contentType) {
    const digest = createHash('sha256').update(bytes).digest('hex')
    try {
      const old = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      if (old.ContentLength === bytes.length && old.Metadata?.sha256 === digest) return
    } catch (error) { if (error.$metadata?.httpStatusCode !== 404) throw error }
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes,
      ContentType: contentType, Metadata: { sha256: digest } }))
  }
  async list(prefix) {
    let token
    const objects = []
    do {
      const result = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }))
      objects.push(...(result.Contents ?? []))
      token = result.NextContinuationToken
    } while (token)
    return objects
  }
}
