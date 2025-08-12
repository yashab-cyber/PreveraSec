#!/usr/bin/env node
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
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const AppSpecCompiler_1 = require("./core/AppSpecCompiler");
const AppSpecValidator_1 = require("./core/AppSpecValidator");
const DASTScanner_1 = require("./dast/DASTScanner");
const DiffTool_1 = require("./core/DiffTool");
const Logger_1 = require("./utils/Logger");
const ConfigManager_1 = require("./utils/ConfigManager");
const package_json_1 = require("../package.json");
const program = new commander_1.Command();
const logger = Logger_1.Logger.getInstance();
program
    .name('preversec')
    .description('PreveraSec - AppSpec++ Full Grey-Box Context Compiler')
    .version(package_json_1.version);
// Compile command
program
    .command('compile')
    .description('Compile multiple sources into unified AppSpec')
    .option('--openapi <path>', 'OpenAPI/Swagger specification file')
    .option('--graphql <path>', 'GraphQL SDL file')
    .option('--postman <path>', 'Postman collection file')
    .option('--har <path>', 'HAR (HTTP Archive) file')
    .option('--gateway <path>', 'API Gateway configuration file')
    .option('--source-maps <path>', 'Source maps directory')
    .option('--typescript <pattern>', 'TypeScript definition files pattern')
    .option('--source <path>', 'Source code directory for analysis')
    .option('--docs <path>', 'Documentation directory')
    .option('--roles <path>', 'Role matrix configuration')
    .option('--features <path>', 'Feature flags configuration')
    .option('-o, --output <path>', 'Output AppSpec file path', './appspec.json')
    .option('-c, --config <path>', 'Configuration file path')
    .option('--verbose', 'Enable verbose logging')
    .action(async (options) => {
    try {
        if (options.verbose) {
            logger.setLevel('debug');
        }
        logger.info(chalk_1.default.blue('🚀 Starting AppSpec compilation...'));
        const config = await ConfigManager_1.ConfigManager.load(options.config);
        const compiler = new AppSpecCompiler_1.AppSpecCompiler(config);
        const sources = {
            openapi: options.openapi,
            graphql: options.graphql,
            postman: options.postman,
            har: options.har,
            gateway: options.gateway,
            sourceMaps: options.sourceMaps,
            typescript: options.typescript,
            source: options.source,
            docs: options.docs,
            roles: options.roles,
            features: options.features
        };
        const appSpec = await compiler.compile(sources);
        await compiler.save(appSpec, options.output);
        logger.info(chalk_1.default.green(`✅ AppSpec compiled successfully to ${options.output}`));
        logger.info(chalk_1.default.cyan(`📊 Endpoints: ${appSpec.endpoints.length}`));
        logger.info(chalk_1.default.cyan(`🔧 Parameters: ${Object.keys(appSpec.parameters).length}`));
        logger.info(chalk_1.default.cyan(`🛡️  Security schemes: ${Object.keys(appSpec.security).length}`));
    }
    catch (error) {
        logger.error(chalk_1.default.red('❌ Compilation failed:'), error);
        process.exit(1);
    }
});
// Validate command
program
    .command('validate')
    .description('Validate AppSpec against schema')
    .argument('<spec>', 'AppSpec file to validate')
    .option('--schema <path>', 'Custom schema file path')
    .option('--verbose', 'Enable verbose logging')
    .action(async (spec, options) => {
    try {
        if (options.verbose) {
            logger.setLevel('debug');
        }
        logger.info(chalk_1.default.blue('🔍 Validating AppSpec...'));
        const validator = new AppSpecValidator_1.AppSpecValidator(options.schema);
        const result = await validator.validate(spec);
        if (result.valid) {
            logger.info(chalk_1.default.green('✅ AppSpec is valid'));
            logger.info(chalk_1.default.cyan(`📊 Coverage: ${result.coverage}%`));
        }
        else {
            logger.error(chalk_1.default.red('❌ AppSpec validation failed:'));
            result.errors?.forEach(error => {
                logger.error(chalk_1.default.red(`  • ${error.instancePath}: ${error.message}`));
            });
            process.exit(1);
        }
    }
    catch (error) {
        logger.error(chalk_1.default.red('❌ Validation failed:'), error);
        process.exit(1);
    }
});
// Scan command
program
    .command('scan')
    .description('Run DAST scan using AppSpec')
    .option('-s, --spec <path>', 'AppSpec file path', './appspec.json')
    .option('-t, --target <url>', 'Target URL to scan')
    .option('-o, --output <path>', 'Output results file', './scan-results.json')
    .option('-c, --config <path>', 'Configuration file path')
    .option('--depth <number>', 'Maximum scan depth', '3')
    .option('--concurrent <number>', 'Number of concurrent requests', '10')
    .option('--timeout <number>', 'Request timeout in milliseconds', '30000')
    .option('--auth <token>', 'Authentication token')
    .option('--headers <json>', 'Custom headers as JSON')
    .option('--verbose', 'Enable verbose logging')
    .action(async (options) => {
    try {
        if (options.verbose) {
            logger.setLevel('debug');
        }
        if (!options.target) {
            logger.error(chalk_1.default.red('❌ Target URL is required'));
            process.exit(1);
        }
        logger.info(chalk_1.default.blue(`🛡️  Starting DAST scan on ${options.target}...`));
        const config = await ConfigManager_1.ConfigManager.load(options.config);
        const scanner = new DASTScanner_1.DASTScanner(config);
        const scanOptions = {
            specPath: options.spec,
            target: options.target,
            maxDepth: parseInt(options.depth),
            maxConcurrent: parseInt(options.concurrent),
            timeout: parseInt(options.timeout),
            auth: options.auth,
            customHeaders: options.headers ? JSON.parse(options.headers) : {}
        };
        const results = await scanner.scan(scanOptions);
        await scanner.saveResults(results, options.output);
        logger.info(chalk_1.default.green(`✅ Scan completed: ${options.output}`));
        logger.info(chalk_1.default.cyan(`🔍 Tests run: ${results.summary.testsRun}`));
        logger.info(chalk_1.default.cyan(`⚠️  Vulnerabilities: ${results.summary.vulnerabilities.length}`));
        logger.info(chalk_1.default.cyan(`🚨 Critical: ${results.summary.vulnerabilities.filter(v => v.severity === 'critical').length}`));
    }
    catch (error) {
        logger.error(chalk_1.default.red('❌ Scan failed:'), error);
        process.exit(1);
    }
});
// Diff command
program
    .command('diff')
    .description('Compare AppSpec against runtime behavior')
    .option('-s, --spec <path>', 'AppSpec file path', './appspec.json')
    .option('-r, --runtime <url>', 'Runtime URL to compare against')
    .option('-o, --output <path>', 'Output diff report', './diff-report.html')
    .option('-c, --config <path>', 'Configuration file path')
    .option('--format <type>', 'Output format: html, json, text', 'html')
    .option('--verbose', 'Enable verbose logging')
    .action(async (options) => {
    try {
        if (options.verbose) {
            logger.setLevel('debug');
        }
        if (!options.runtime) {
            logger.error(chalk_1.default.red('❌ Runtime URL is required'));
            process.exit(1);
        }
        logger.info(chalk_1.default.blue('🔄 Generating diff report...'));
        const config = await ConfigManager_1.ConfigManager.load(options.config);
        const diffTool = new DiffTool_1.DiffTool(config);
        const diff = await diffTool.compare(options.spec, options.runtime);
        await diffTool.generateReport(diff, options.output, options.format);
        logger.info(chalk_1.default.green(`✅ Diff report generated: ${options.output}`));
        logger.info(chalk_1.default.cyan(`📊 Differences found: ${diff.differences.length}`));
        logger.info(chalk_1.default.cyan(`➕ New endpoints: ${diff.newEndpoints.length}`));
        logger.info(chalk_1.default.cyan(`➖ Missing endpoints: ${diff.missingEndpoints.length}`));
    }
    catch (error) {
        logger.error(chalk_1.default.red('❌ Diff generation failed:'), error);
        process.exit(1);
    }
});
// Server command (for continuous monitoring)
program
    .command('server')
    .description('Start PreveraSec server for continuous monitoring')
    .option('-p, --port <number>', 'Server port', '3000')
    .option('-c, --config <path>', 'Configuration file path')
    .option('--verbose', 'Enable verbose logging')
    .action(async (options) => {
    try {
        if (options.verbose) {
            logger.setLevel('debug');
        }
        logger.info(chalk_1.default.blue(`🌐 Starting PreveraSec server on port ${options.port}...`));
        // Import server module dynamically to avoid loading it for CLI commands
        const { PreveraSecServer } = await Promise.resolve().then(() => __importStar(require('./server/PreveraSecServer')));
        const config = await ConfigManager_1.ConfigManager.load(options.config);
        const server = new PreveraSecServer(config);
        await server.start(parseInt(options.port));
        logger.info(chalk_1.default.green(`✅ Server started at http://localhost:${options.port}`));
        logger.info(chalk_1.default.cyan('📊 Web dashboard available at /dashboard'));
        logger.info(chalk_1.default.cyan('🔧 API documentation at /api-docs'));
    }
    catch (error) {
        logger.error(chalk_1.default.red('❌ Server startup failed:'), error);
        process.exit(1);
    }
});
// Parse command line arguments
program.parse();
// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=cli.js.map