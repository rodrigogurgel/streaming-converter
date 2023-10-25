import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import { ConvertionOutput } from 'src/model/convertion-output';
import { Quality } from 'src/model/quality';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

@Injectable()
export class VideoConverterService {
  private readonly logger = new Logger(VideoConverterService.name);

  constructor() {}

  async convert(
    originalFilePath: string,
    outputPath: string,
  ): Promise<ConvertionOutput[]> {
    const qualities = await this.getQualities(originalFilePath);

    const convertions = qualities.map((quality) =>
      this.ffmpegConvert(originalFilePath, outputPath, quality),
    );

    return Promise.all(convertions);
  }

  private async ffmpegConvert(
    originalFilePath: string,
    outputPath: string,
    quality: Quality,
  ): Promise<ConvertionOutput> {
    const outputOption = this.getOutputOption(quality);
    // const key = `vod/${hashName(episodeId, false)}/_${q.h}p.mp4`;
    const fileName = `_${quality.height}p.mp4`;
    const outputFilePath = `${outputPath}/${fileName}`;

    return new Promise<ConvertionOutput>((resolve, reject) => {
      ffmpeg(originalFilePath)
        .output(outputFilePath)
        .outputOptions(outputOption)
        .on('start', (command) => {
          this.logger.log(command);
        })
        .on('progress', (progress) => {
          this.logger.log(
            `Processing ${outputFilePath} --> ${parseFloat(
              progress.percent,
            ).toFixed(2)}%`,
          );
        })
        .on('error', (err, stdout, stderr) => {
          reject(err);
        })
        .on('end', async function (stdout, stderr) {
          const result = {
            quality: quality.name,
            fileName: fileName,
          } as ConvertionOutput;
          resolve(result);
        })
        .run();
    });
  }

  private getOutputOption(quality: Quality): string[] {
    return [
      '-c:s mov_text',
      `-vf scale=${quality.width}:${quality.height}`,
      `-b:a ${quality.adaptiveBitrate}k`,
      `-maxrate ${quality.variableBitrate}k`,
      `-bufsize ${quality.variableBitrate}k`,
    ];
  }

  private async getQualities(originalFilePath: string): Promise<Quality[]> {
    return new Promise<Quality[]>((resolve, reject) => {
      ffmpeg.ffprobe(originalFilePath, (err: any, data: ffmpeg.FfprobeData) => {
        if (err) reject(err);

        const meta = data.streams.find((item) => item.codec_type === 'video');

        if (meta === undefined || meta.height === undefined) reject(Error());

        const height = meta?.height ?? 0;

        const qualities: Quality[] = [];

        if (height >= 480) {
          qualities.push({
            width: 842,
            height: 480,
            variableBitrate: 1400,
            adaptiveBitrate: 128,
            name: '480',
          });
        }
        if (height >= 720) {
          qualities.push({
            width: 1280,
            height: 720,
            variableBitrate: 2800,
            adaptiveBitrate: 160,
            name: '720',
          });
        }
        if (height >= 1080) {
          qualities.push({
            width: 1920,
            height: 1080,
            variableBitrate: 5000,
            adaptiveBitrate: 192,
            name: '1080',
          });
        }
        resolve(qualities);
      });
    });
  }
}
