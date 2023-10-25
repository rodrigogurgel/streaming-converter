import { Test, TestingModule } from '@nestjs/testing';
import { SqsConfigService } from './sqs-config.service';

describe('SqsConfigService', () => {
  let service: SqsConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SqsConfigService],
    }).compile();

    service = module.get<SqsConfigService>(SqsConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
