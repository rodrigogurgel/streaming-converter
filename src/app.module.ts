import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SqsConsumerModule } from './sqs-consumer/sqs-consumer.module';
import { ConfigModule } from '@nestjs/config';
import { FileService } from './service/file/file.service';
import { VideoConverterService } from './service/video-converter/video-converter.service';
import { S3Service } from './service/s3/s3.service';
import { SqsConfigService } from './service/sqs-config/sqs-config.service';
import { StreamingService } from './service/streaming/streaming.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    SqsConsumerModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    FileService,
    VideoConverterService,
    S3Service,
    SqsConfigService,
    StreamingService,
  ],
})
export class AppModule {}
