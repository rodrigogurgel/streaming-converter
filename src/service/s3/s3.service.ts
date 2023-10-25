import {
  AbortMultipartUploadCommandOutput,
  CompleteMultipartUploadCommandOutput,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  S3Client,
  ObjectIdentifier,
  DeleteObjectsCommandInput,
  DeleteObjectsCommandOutput,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassThrough } from 'stream';
import * as fs from 'fs';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(S3Service.name);

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      endpoint: 'http://127.0.0.1:4566/',
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async getObject(key: string): Promise<Uint8Array> {
    const command = new GetObjectCommand({
      Bucket: 'videos-bucket',
      Key: key,
    });

    this.logger.log('Try get video file');

    const response = await this.s3Client.send(command);

    this.logger.log('Convert to byte array');
    let byteArray = await response.Body?.transformToByteArray();

    if (!byteArray) {
      throw new Error("Can't convert to byte array");
    }

    return byteArray;
  }

  async uploadObject(
    key: string,
    path: string,
  ): Promise<
    AbortMultipartUploadCommandOutput | CompleteMultipartUploadCommandOutput
  > {
    const pass = new PassThrough();

    const params = {
      Bucket: 'videos-bucket',
      Key: key,
      Body: pass,
      ContentType: 'video/mp4',
    };

    const manager = new Upload({
      client: this.s3Client,
      params: params,
      queueSize: 4,
      partSize: 1024 * 1024 * 5,
      leavePartsOnError: false,
    });

    manager.on('httpUploadProgress', (progress) => {
      this.logger.log(
        `Uploading ${progress.loaded}/${progress.total} Part ${progress.part} ----> ${path}`,
      );
    });

    const readStream = fs.createReadStream(path);
    readStream.pipe(pass);

    return manager.done();
  }

  async listObjectV2(
    prefix: string | undefined,
  ): Promise<ListObjectsV2CommandOutput> {
    const command = new ListObjectsV2Command({
      Bucket: 'videos-bucket',
      Prefix: prefix,
    });
    return this.s3Client.send(command);
  }

  async deleteObjects(
    keys: (string | undefined)[],
  ): Promise<DeleteObjectsCommandOutput> {
    const objects = keys.map(
      (key) =>
        ({
          Key: key,
        }) as ObjectIdentifier,
    );

    const input = {
      Bucket: 'videos-bucket',
      Delete: {
        Objects: objects,
      },
    } as DeleteObjectsCommandInput;

    const command = new DeleteObjectsCommand(input);

    return this.s3Client.send(command);
  }
}
