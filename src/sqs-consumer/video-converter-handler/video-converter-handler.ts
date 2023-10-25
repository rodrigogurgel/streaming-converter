import { Message } from '@aws-sdk/client-sqs';
import { Injectable, Logger } from '@nestjs/common';
import { SqsConsumerEventHandler, SqsMessageHandler } from '@ssut/nestjs-sqs';
import { FileService } from 'src/service/file/file.service';
import { S3Service } from 'src/service/s3/s3.service';
import { VideoConverterService } from 'src/service/video-converter/video-converter.service';
import * as path from 'path';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CompleteMultipartUploadOutput, _Object } from '@aws-sdk/client-s3';
import { StreamingService } from 'src/service/streaming/streaming.service';
import { UploadProcessStatusEnum } from 'src/model/upload-process-status-enum';
import { SqsConfigService } from 'src/service/sqs-config/sqs-config.service';
import { AsyncLocalStorage } from 'node:async_hooks';
import { EpisodeMetadata } from 'src/model/episode-metadata';

@Injectable()
export class VideoConverterHandler {
  private readonly logger = new Logger(VideoConverterHandler.name);

  constructor(
    private configService: ConfigService,
    private videoConverterService: VideoConverterService,
    private fileService: FileService,
    private s3Service: S3Service,
    private streamingService: StreamingService,
    private sqsConfigService: SqsConfigService,
  ) {}

  @SqsMessageHandler('VIDEO_CONVERTER_CONSUMER', false)
  async handleMessage(message: Message) {
    if (!message.Body) throw new Error('Message is empty');

    const videoUploadedMessage = JSON.parse(message.Body!) as {
      key: string;
      uploadProcessId: string;
      episodeId: number;
    };

    await this.streamingService.updateStatus(
      videoUploadedMessage.uploadProcessId,
      UploadProcessStatusEnum.CONVERSION_STARTED,
    );

    const outputPath = this.fileService.createOutputDir();

    const originalFilePath = path.join(outputPath, 'original');
    const file = await this.s3Service.getObject(videoUploadedMessage.key);

    this.fileService.save(originalFilePath, file);

    const convertionOutputs = await this.videoConverterService.convert(
      originalFilePath,
      outputPath,
    );

    const objects = await this.s3Service.listObjectV2(
      this.getBucketFolderPrefix(videoUploadedMessage.episodeId),
    );

    const keys =
      objects.Contents?.map((item) => (item as _Object).Key) ??
      ([] as string[]);

    if (keys.length) await this.s3Service.deleteObjects(keys);

    const randomPath = this.hash(
      new Date(Date.now() + 1000 * 60 * 60).getTime(),
    );

    const uploads = convertionOutputs.map((convertionOutput) =>
      this.s3Service.uploadObject(
        this.buildKey(
          videoUploadedMessage.episodeId,
          randomPath,
          convertionOutput.fileName,
        ),
        path.join(outputPath, convertionOutput.fileName),
      ),
    );

    const completedUploads = await Promise.all(uploads);

    completedUploads.forEach((completed) => {
      this.logger.log((completed as CompleteMultipartUploadOutput).Key);
    });

    await this.streamingService.updateStatus(
      videoUploadedMessage.uploadProcessId,
      UploadProcessStatusEnum.CONVERSION_COMPLETED,
    );

    const qualities = convertionOutputs.map(
      (convertionOutput) => convertionOutput.quality,
    );

    await this.streamingService.updateMetadata(videoUploadedMessage.episodeId, {
      filePath: randomPath,
      qualities: qualities,
    } as EpisodeMetadata);

    this.fileService.deleteOutputDir(outputPath);
  }

  private getBucketFolderPrefix(id: number): string {
    return `vod/${this.hash(id)}`;
  }

  private buildKey(id: number, path: string, fileName: string) {
    return `${this.getBucketFolderPrefix(id)}/${path}/${fileName}`;
  }

  private hash(name: string | number): string {
    const secret = this.configService.get<string>('MD5_SECRET');
    const input = `${secret}${name}`;
    const binaryHash = crypto.createHash('md5').update(input).digest();
    const base64Value = Buffer.from(binaryHash).toString('base64');
    return base64Value
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  @SqsConsumerEventHandler('VIDEO_CONVERTER_CONSUMER', 'processing_error')
  async handleError(error: Error, message: Message) {
    this.logger.error(error);

    const videoUploadedMessage = JSON.parse(message.Body!) as {
      key: string;
      uploadProcessId: string;
      episodeId: number;
    };

    const queueUrl = this.configService.getOrThrow<string>(
      'SQS_VIDEO_CONVERTER_QUEUE_URL',
    );

    await this.sqsConfigService.ack(queueUrl, message);

    await this.streamingService.updateStatus(
      videoUploadedMessage.uploadProcessId,
      UploadProcessStatusEnum.CONVERSION_FAILED,
    );
  }
}
