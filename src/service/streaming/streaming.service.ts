import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { EpisodeMetadata } from 'src/model/episode-metadata';
import { UploadProcessStatusEnum } from 'src/model/upload-process-status-enum';

@Injectable()
export class StreamingService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  updateStatus(
    uploadProcessId: String,
    status: UploadProcessStatusEnum,
  ): Promise<AxiosResponse> {
    return this.httpService.axiosRef.put(
      `/upload-process/${uploadProcessId}/status`,
      {
        status: status,
      },
      {
        baseURL: this.configService.getOrThrow<string>('STREAMING_BASE_URL'),
      },
    );
  }

  updateMetadata(
    episodeId: number,
    episodeMetadata: EpisodeMetadata,
  ): Promise<AxiosResponse> {
    return this.httpService.axiosRef.patch(
      `/episode/${episodeId}/metadata`,
      episodeMetadata,
      {
        baseURL: this.configService.getOrThrow<string>('STREAMING_BASE_URL'),
      },
    );
  }
}
