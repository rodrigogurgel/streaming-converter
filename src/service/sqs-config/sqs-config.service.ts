import {
  SqsModuleOptionsFactory,
  SqsOptions,
} from '@ssut/nestjs-sqs/dist/sqs.types';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { DeleteMessageCommand, Message, SQSClient } from '@aws-sdk/client-sqs';

@Injectable()
export class SqsConfigService implements SqsModuleOptionsFactory {
  private readonly client: SQSClient;

  constructor(private configService: ConfigService) {
    this.client = new SQSClient({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      endpoint: this.configService.getOrThrow<string>('AWS_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  public async ack(queueUrl: string, message: Message): Promise<void> {
    this.client.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
  }

  public createOptions(): SqsOptions {
    return {
      consumers: [
        {
          sqs: this.client,
          name: 'VIDEO_CONVERTER_CONSUMER',
          queueUrl: this.configService.getOrThrow<string>(
            'SQS_VIDEO_CONVERTER_QUEUE_URL',
          ),
          pollingWaitTimeMs: this.configService.getOrThrow<number>(
            'VIDEO_CONVERTER_CONSUMER_POLLING_WAIT_TIME_MS',
          ),
        },
      ],
    };
  }
}
