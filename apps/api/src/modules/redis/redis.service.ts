import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  get client() {
    return this.redis;
  }

  async cacheJson<T>(key: string, value: T, seconds = 60) {
    await this.redis.set(key, JSON.stringify(value), 'EX', seconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
