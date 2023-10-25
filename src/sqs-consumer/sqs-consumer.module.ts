import { Module } from '@nestjs/common';
import { VideoConverterHandler } from './video-converter-handler/video-converter-handler';
import { SqsModule } from '@ssut/nestjs-sqs';
import { FileService } from 'src/service/file/file.service';
import { S3Service } from 'src/service/s3/s3.service';
import { VideoConverterService } from 'src/service/video-converter/video-converter.service';
import { SqsConfigService } from 'src/service/sqs-config/sqs-config.service';
import { StreamingService } from 'src/service/streaming/streaming.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    SqsModule.registerAsync({
      useClass: SqsConfigService,
    }),
  ],
  controllers: [],
  providers: [
    VideoConverterHandler,
    VideoConverterService,
    FileService,
    S3Service,
    StreamingService,
    SqsConfigService,
  ],
  exports: [VideoConverterHandler],
})
export class SqsConsumerModule {}
