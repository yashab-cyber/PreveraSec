"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.progress = exports.success = exports.error = exports.warn = exports.info = exports.debug = exports.logger = exports.Logger = void 0;
const winston = __importStar(require("winston"));
const chalk_1 = __importDefault(require("chalk"));
/**
 * Centralized logging utility for PreveraSec
 * Provides structured logging with multiple transports and formatting
 */
class Logger {
    constructor() {
        this.level = 'info';
        this.logger = winston.createLogger({
            level: this.level,
            format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
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
                format: winston.format.combine(winston.format.colorize(), winston.format.simple(), winston.format.printf(({ level, message, timestamp, ...meta }) => {
                    const ts = chalk_1.default.gray(`[${timestamp}]`);
                    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                    return `${ts} ${level}: ${message}${metaStr}`;
                }))
            }));
        }
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setLevel(level) {
        this.level = level;
        this.logger.level = level;
    }
    getLevel() {
        return this.level;
    }
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    info(message, meta) {
        this.logger.info(message, meta);
    }
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    error(message, error) {
        if (error instanceof Error) {
            this.logger.error(message, { error: error.message, stack: error.stack });
        }
        else {
            this.logger.error(message, error);
        }
    }
    fatal(message, error) {
        this.error(message, error);
        process.exit(1);
    }
    // Convenience methods with colored output for CLI
    success(message) {
        console.log(chalk_1.default.green('✓ ' + message));
    }
    warning(message) {
        console.log(chalk_1.default.yellow('⚠ ' + message));
    }
    failure(message) {
        console.log(chalk_1.default.red('✗ ' + message));
    }
    progress(message) {
        console.log(chalk_1.default.blue('⚡ ' + message));
    }
    // Structured logging for different components
    compiler(message, meta) {
        this.info(`[COMPILER] ${message}`, meta);
    }
    ingestor(name, message, meta) {
        this.info(`[INGESTOR:${name.toUpperCase()}] ${message}`, meta);
    }
    enricher(name, message, meta) {
        this.info(`[ENRICHER:${name.toUpperCase()}] ${message}`, meta);
    }
    dast(message, meta) {
        this.info(`[DAST] ${message}`, meta);
    }
    validator(message, meta) {
        this.info(`[VALIDATOR] ${message}`, meta);
    }
    rag(message, meta) {
        this.info(`[RAG] ${message}`, meta);
    }
    // Performance logging
    timing(operation, startTime) {
        const duration = Date.now() - startTime;
        this.debug(`Timing: ${operation} took ${duration}ms`);
    }
    // Security event logging
    security(event, details) {
        this.warn(`[SECURITY] ${event}`, {
            timestamp: new Date().toISOString(),
            ...details
        });
    }
    // Audit logging
    audit(action, user, resource, details) {
        this.info(`[AUDIT] ${action}`, {
            user,
            resource,
            timestamp: new Date().toISOString(),
            ...details
        });
    }
    // Create child logger with additional context
    child(context) {
        return this.logger.child(context);
    }
    // Flush logs (useful for testing)
    async flush() {
        return new Promise((resolve) => {
            this.logger.on('finish', resolve);
            this.logger.end();
        });
    }
}
exports.Logger = Logger;
// Export singleton instance
exports.logger = Logger.getInstance();
// Export convenience functions
const debug = (message, meta) => exports.logger.debug(message, meta);
exports.debug = debug;
const info = (message, meta) => exports.logger.info(message, meta);
exports.info = info;
const warn = (message, meta) => exports.logger.warn(message, meta);
exports.warn = warn;
const error = (message, err) => exports.logger.error(message, err);
exports.error = error;
const success = (message) => exports.logger.success(message);
exports.success = success;
const progress = (message) => exports.logger.progress(message);
exports.progress = progress;
//# sourceMappingURL=Logger.js.map