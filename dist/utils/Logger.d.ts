import * as winston from 'winston';
/**
 * Centralized logging utility for PreveraSec
 * Provides structured logging with multiple transports and formatting
 */
export declare class Logger {
    private static instance;
    private logger;
    private level;
    private constructor();
    static getInstance(): Logger;
    setLevel(level: string): void;
    getLevel(): string;
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, error?: Error | any): void;
    fatal(message: string, error?: Error | any): void;
    success(message: string): void;
    warning(message: string): void;
    failure(message: string): void;
    progress(message: string): void;
    compiler(message: string, meta?: any): void;
    ingestor(name: string, message: string, meta?: any): void;
    enricher(name: string, message: string, meta?: any): void;
    dast(message: string, meta?: any): void;
    validator(message: string, meta?: any): void;
    rag(message: string, meta?: any): void;
    timing(operation: string, startTime: number): void;
    security(event: string, details: any): void;
    audit(action: string, user: string, resource: string, details?: any): void;
    child(context: Record<string, any>): winston.Logger;
    flush(): Promise<void>;
}
export declare const logger: Logger;
export declare const debug: (message: string, meta?: any) => void;
export declare const info: (message: string, meta?: any) => void;
export declare const warn: (message: string, meta?: any) => void;
export declare const error: (message: string, err?: Error | any) => void;
export declare const success: (message: string) => void;
export declare const progress: (message: string) => void;
//# sourceMappingURL=Logger.d.ts.map