import { Module } from '@nestjs/common';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { TrackerModule } from './modules/tracker/tracker.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { EventsModule } from './modules/events/events.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)', '/docs/(.*)'],
      serveStaticOptions: {
        setHeaders: (res, path) => {
          if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        },
      },
    }),
    DatabaseModule,
    EventsModule,
    TrackerModule,
    IngestionModule,
    AuthModule,
  ],
})
export class AppModule {}
