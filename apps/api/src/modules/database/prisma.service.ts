import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      console.log('💡 [DRL-Hub] DATABASE_URL not set. Running seamlessly in Standalone / In-Memory Mock Mode.');
      return;
    }

    try {
      await this.$connect();
      console.log('✅ [DRL-Hub] Connected to PostgreSQL successfully.');
    } catch (err: any) {
      console.warn('⚠️ [DRL-Hub] PostgreSQL connection failed, falling back to In-Memory Mode:', err.message);
    }
  }

  async onModuleDestroy() {
    if (process.env.DATABASE_URL) {
      await this.$disconnect();
    }
  }
}
