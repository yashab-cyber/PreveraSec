#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { AppSpecCompiler } from './core/AppSpecCompiler';
import { AppSpecValidator } from './core/AppSpecValidator';
import { DASTScanner } from './dast/DASTScanner';
import { DiffTool } from './core/DiffTool';
import { Logger } from './utils/Logger';
import { ConfigManager } from './utils/ConfigManager';
import { version } from '../package.json';

const program = new Command();
const logger = Logger.getInstance();

program
  .name('preversec')
  .description('PreveraSec - AppSpec++ Full Grey-Box Context Compiler')
  .version(version);

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

      logger.info(chalk.blue('🚀 Starting AppSpec compilation...'));
      
      const config = await ConfigManager.load(options.config);
      const compiler = new AppSpecCompiler(config);
      
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

      logger.info(chalk.green(`✅ AppSpec compiled successfully to ${options.output}`));
      logger.info(chalk.cyan(`📊 Endpoints: ${appSpec.endpoints.length}`));
      logger.info(chalk.cyan(`🔧 Parameters: ${Object.keys(appSpec.parameters).length}`));
      logger.info(chalk.cyan(`🛡️  Security schemes: ${Object.keys(appSpec.security).length}`));
      
    } catch (error) {
      logger.error(chalk.red('❌ Compilation failed:'), error);
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

      logger.info(chalk.blue('🔍 Validating AppSpec...'));
      
      const validator = new AppSpecValidator(options.schema);
      const result = await validator.validate(spec);

      if (result.valid) {
        logger.info(chalk.green('✅ AppSpec is valid'));
        logger.info(chalk.cyan(`📊 Coverage: ${result.coverage}%`));
      } else {
        logger.error(chalk.red('❌ AppSpec validation failed:'));
        result.errors?.forEach(error => {
          logger.error(chalk.red(`  • ${error.instancePath}: ${error.message}`));
        });
        process.exit(1);
      }
    } catch (error) {
      logger.error(chalk.red('❌ Validation failed:'), error);
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
        logger.error(chalk.red('❌ Target URL is required'));
        process.exit(1);
      }

      logger.info(chalk.blue(`🛡️  Starting DAST scan on ${options.target}...`));
      
      const config = await ConfigManager.load(options.config);
      const scanner = new DASTScanner(config);
      
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

      logger.info(chalk.green(`✅ Scan completed: ${options.output}`));
      logger.info(chalk.cyan(`🔍 Tests run: ${results.summary.testsRun}`));
      logger.info(chalk.cyan(`⚠️  Vulnerabilities: ${results.summary.vulnerabilities.length}`));
      logger.info(chalk.cyan(`🚨 Critical: ${results.summary.vulnerabilities.filter(v => v.severity === 'critical').length}`));
      
    } catch (error) {
      logger.error(chalk.red('❌ Scan failed:'), error);
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
        logger.error(chalk.red('❌ Runtime URL is required'));
        process.exit(1);
      }

      logger.info(chalk.blue('🔄 Generating diff report...'));
      
      const config = await ConfigManager.load(options.config);
      const diffTool = new DiffTool(config);
      
      const diff = await diffTool.compare(options.spec, options.runtime);
      await diffTool.generateReport(diff, options.output, options.format);

      logger.info(chalk.green(`✅ Diff report generated: ${options.output}`));
      logger.info(chalk.cyan(`📊 Differences found: ${diff.differences.length}`));
      logger.info(chalk.cyan(`➕ New endpoints: ${diff.newEndpoints.length}`));
      logger.info(chalk.cyan(`➖ Missing endpoints: ${diff.missingEndpoints.length}`));
      
    } catch (error) {
      logger.error(chalk.red('❌ Diff generation failed:'), error);
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

      logger.info(chalk.blue(`🌐 Starting PreveraSec server on port ${options.port}...`));
      
      // Import server module dynamically to avoid loading it for CLI commands
      const { PreveraSecServer } = await import('./server/PreveraSecServer');
      const config = await ConfigManager.load(options.config);
      const server = new PreveraSecServer(config);
      
      await server.start(parseInt(options.port));
      
      logger.info(chalk.green(`✅ Server started at http://localhost:${options.port}`));
      logger.info(chalk.cyan('📊 Web dashboard available at /dashboard'));
      logger.info(chalk.cyan('🔧 API documentation at /api-docs'));
      
    } catch (error) {
      logger.error(chalk.red('❌ Server startup failed:'), error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
