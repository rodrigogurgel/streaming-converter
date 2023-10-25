import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  private readonly appPath = 'streaming-converter';

  createOutputDir(): string {
    try {
      return fs.mkdtempSync(path.join(os.tmpdir(), this.appPath));
    } catch (error) {
      throw error;
    }
  }

  save(outputPath: string, file: Uint8Array) {
    fs.appendFileSync(outputPath, Buffer.from(file), 'binary');
  }

  deleteOutputDir(path: string) {
    try {
      if (path) {
        fs.rmSync(path, { recursive: true, force: true });
        this.logger.log(`Temp folder ${path} was removed`);
      }
    } catch (e) {
      this.logger.error(
        e,
        `An error has occurred while removing the temp folder at ${path}. Please remove it manually. Error: ${e}`,
      );
    }
  }
}
