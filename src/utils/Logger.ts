import * as winston from 'winston';
import chalk from 'chalk';

/**
 * Centralized logging utility for PreveraSec
 * Provides structured logging with multiple transports and formatting
 */
export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private level: string = 'info';

  private constructor() {
    this.logger = winston.createLogger({
      level: this.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // File transport for all logs
        new winston.transports.File({
          filename: 'preversec-error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'preversec.log'
        })
      ]
    });

    // Add console transport for non-production environments
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const ts = chalk.gray(`[${timestamp}]`);
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${ts} ${level}: ${message}${metaStr}`;
          })
        )
      }));
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLevel(level: string): void {
    this.level = level;
    this.logger.level = level;
  }

  public getLevel(): string {
    return this.level;
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public error(message: string, error?: Error | any): void {
    if (error instanceof Error) {
      this.logger.error(message, { error: error.message, stack: error.stack });
    } else {
      this.logger.error(message, error);
    }
  }

  public fatal(message: string, error?: Error | any): void {
    this.error(message, error);
    process.exit(1);
  }

  // Convenience methods with colored output for CLI
  public success(message: string): void {
    console.log(chalk.green('✓ ' + message));
  }

  public warning(message: string): void {
    console.log(chalk.yellow('⚠ ' + message));
  }

  public failure(message: string): void {
    console.log(chalk.red('✗ ' + message));
  }

  public progress(message: string): void {
    console.log(chalk.blue('⚡ ' + message));
  }

  // Structured logging for different components
  public compiler(message: string, meta?: any): void {
    this.info(`[COMPILER] ${message}`, meta);
  }

  public ingestor(name: string, message: string, meta?: any): void {
    this.info(`[INGESTOR:${name.toUpperCase()}] ${message}`, meta);
  }

  public enricher(name: string, message: string, meta?: any): void {
    this.info(`[ENRICHER:${name.toUpperCase()}] ${message}`, meta);
  }

  public dast(message: string, meta?: any): void {
    this.info(`[DAST] ${message}`, meta);
  }

  public validator(message: string, meta?: any): void {
    this.info(`[VALIDATOR] ${message}`, meta);
  }

  public rag(message: string, meta?: any): void {
    this.info(`[RAG] ${message}`, meta);
  }

  // Performance logging
  public timing(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.debug(`Timing: ${operation} took ${duration}ms`);
  }

  // Security event logging
  public security(event: string, details: any): void {
    this.warn(`[SECURITY] ${event}`, {
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Audit logging
  public audit(action: string, user: string, resource: string, details?: any): void {
    this.info(`[AUDIT] ${action}`, {
      user,
      resource,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Create child logger with additional context
  public child(context: Record<string, any>): winston.Logger {
    return this.logger.child(context);
  }

  // Flush logs (useful for testing)
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const debug = (message: string, meta?: any) => logger.debug(message, meta);
export const info = (message: string, meta?: any) => logger.info(message, meta);
export const warn = (message: string, meta?: any) => logger.warn(message, meta);
export const error = (message: string, err?: Error | any) => logger.error(message, err);
export const success = (message: string) => logger.success(message);
export const progress = (message: string) => logger.progress(message);
