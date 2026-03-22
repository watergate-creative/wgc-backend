import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        return {
          level: isProduction ? 'info' : 'debug',
          transports: [
            new winston.transports.Console({
              format: isProduction
                ? winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json(),
                  )
                : winston.format.combine(
                    winston.format.timestamp({ format: 'HH:mm:ss' }),
                    winston.format.colorize({ all: true }),
                    winston.format.printf(({ timestamp, level, message, context }) => {
                      return `${timestamp} [${context || 'App'}] ${level}: ${message}`;
                    }),
                  ),
            }),
            ...(isProduction
              ? [
                  new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                    format: winston.format.combine(
                      winston.format.timestamp(),
                      winston.format.json(),
                    ),
                    maxsize: 10 * 1024 * 1024, // 10MB
                    maxFiles: 5,
                  }),
                  new winston.transports.File({
                    filename: 'logs/combined.log',
                    format: winston.format.combine(
                      winston.format.timestamp(),
                      winston.format.json(),
                    ),
                    maxsize: 10 * 1024 * 1024,
                    maxFiles: 10,
                  }),
                ]
              : []),
          ],
        };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
