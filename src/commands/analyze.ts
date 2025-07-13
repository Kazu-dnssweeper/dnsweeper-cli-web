import { Command } from 'commander';
import type { IAnalyzeOptions } from '../types/index.js';
import { Logger } from '../lib/logger.js';
import { CSVProcessor } from '../lib/csv-processor.js';
import { RiskCalculator } from '../lib/risk-calculator.js';
import { DNSResolver } from '../lib/dns-resolver.js';
import fs from 'fs';
import path from 'path';

export function createAnalyzeCommand(): Command {
  const analyzeCmd = new Command('analyze')
    .alias('scan')
    .description('Analyze DNS records for risks and generate report')
    .argument('<file>', 'CSV file to analyze')
    .option('-f, --format <format>', 'CSV format (cloudflare, route53, generic, auto)', 'auto')
    .option('-l, --level <level>', 'Minimum risk level to report (low, medium, high, critical)', 'medium')
    .option('-c, --check-dns', 'Check current DNS status for each record')
    .option('-o, --output <file>', 'Save report to file')
    .option('-v, --verbose', 'Show detailed output')
    .option('-j, --json', 'Output as JSON')
    .option('-q, --quiet', 'Suppress non-error output')
    .action(async (file: string, options: IAnalyzeOptions) => {
      const logger = new Logger({ verbose: options.verbose, quiet: options.quiet });

      try {
        // Validate file exists
        const filePath = path.resolve(file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const processor = new CSVProcessor();
        const calculator = new RiskCalculator();
        
        logger.startSpinner(`Analyzing DNS records from ${path.basename(filePath)}...`);

        // Parse CSV file
        let parseResult;
        switch (options.format) {
          case 'cloudflare':
            parseResult = await processor.parseCloudflare(filePath);
            break;
          case 'route53':
            parseResult = await processor.parseRoute53(filePath);
            break;
          case 'generic':
            parseResult = await processor.parseGeneric(filePath);
            break;
          default:
            parseResult = await processor.parseAuto(filePath);
        }

        logger.stopSpinner(true, `Loaded ${parseResult.records.length} DNS records`);

        // Check DNS status if requested
        const lastSeenDates = new Map<string, Date>();
        if (options.checkDns) {
          logger.startSpinner('Checking current DNS status...');
          const resolver = new DNSResolver();
          let checkedCount = 0;

          for (const record of parseResult.records) {
            try {
              const result = await resolver.resolve(record.domain, record.type);
              if (result.status === 'success') {
                lastSeenDates.set(record.domain, new Date());
              }
              checkedCount++;
              
              if (!options.quiet && checkedCount % 10 === 0) {
                logger.info(`Checked ${checkedCount}/${parseResult.records.length} records...`);
              }
            } catch (error) {
              // DNS check failed, record might not exist
            }
          }

          logger.stopSpinner(true, `DNS status check complete`);
        }

        // Calculate risk scores
        logger.startSpinner('Calculating risk scores...');
        // Convert CSV records to DNS records format
        const dnsRecords = parseResult.records.map((csvRecord, index) => ({
          id: `record-${index}`,
          name: csvRecord.domain,
          type: csvRecord.type,
          value: csvRecord.value,
          ttl: csvRecord.ttl,
          priority: csvRecord.priority,
          weight: csvRecord.weight,
          port: csvRecord.port,
          created: new Date(),
          updated: new Date(),
        }));

        const riskScores = calculator.calculateBatchRisk(dnsRecords, lastSeenDates);
        const summary = calculator.getRiskSummary(dnsRecords, lastSeenDates);
        logger.stopSpinner(true, 'Risk analysis complete');

        // Filter by minimum risk level
        const minLevel = options.level || 'medium';
        const riskyRecords = calculator.filterByRiskLevel(dnsRecords, minLevel);

        // Generate report
        const report = {
          summary: {
            totalRecords: parseResult.records.length,
            analyzedRecords: parseResult.records.length,
            riskyRecords: riskyRecords.length,
            riskBreakdown: summary.byLevel,
            averageRiskScore: Math.round(summary.averageScore),
            totalRecommendations: summary.recommendations,
          },
          records: riskyRecords.map(record => {
            const risk = riskScores.get(record.id)!;
            return {
              domain: record.name,
              type: record.type,
              value: record.value,
              ttl: record.ttl,
              risk: {
                score: risk.total,
                level: risk.level,
                factors: risk.factors,
                recommendations: risk.recommendations,
              },
            };
          }).sort((a, b) => b.risk.score - a.risk.score), // Sort by risk score descending
        };

        // Display or save report
        if (options.json) {
          if (options.output) {
            fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
            logger.success(`Report saved to ${options.output}`);
          } else {
            logger.json(report);
          }
        } else {
          // Display summary
          logger.info('\n📊 Risk Analysis Summary');
          logger.info('========================');
          logger.info(`Total records analyzed: ${report.summary.totalRecords}`);
          logger.info(`Records at risk (${minLevel}+): ${report.summary.riskyRecords}`);
          logger.info(`Average risk score: ${report.summary.averageRiskScore}/100`);
          logger.info('\nRisk Distribution:');
          logger.info(`  🟢 Low: ${report.summary.riskBreakdown.low}`);
          logger.info(`  🟡 Medium: ${report.summary.riskBreakdown.medium}`);
          logger.info(`  🟠 High: ${report.summary.riskBreakdown.high}`);
          logger.info(`  🔴 Critical: ${report.summary.riskBreakdown.critical}`);

          // Display top risky records
          if (report.records.length > 0) {
            logger.info('\n🚨 Top Risk Records:');
            logger.info('===================');
            
            const topRecords = report.records.slice(0, 10);
            for (const record of topRecords) {
              const icon = record.risk.level === 'critical' ? '🔴' :
                          record.risk.level === 'high' ? '🟠' :
                          record.risk.level === 'medium' ? '🟡' : '🟢';
              
              logger.info(`\n${icon} ${record.domain} (${record.type})`);
              logger.info(`   Risk Score: ${record.risk.score}/100 [${record.risk.level.toUpperCase()}]`);
              logger.info(`   TTL: ${record.ttl}s | Value: ${record.value}`);
              
              if (record.risk.recommendations.length > 0) {
                logger.info('   Recommendations:');
                for (const rec of record.risk.recommendations) {
                  logger.info(`   - ${rec}`);
                }
              }
            }

            if (report.records.length > 10) {
              logger.info(`\n... and ${report.records.length - 10} more records`);
            }
          }

          // Save report to file if requested
          if (options.output) {
            const reportText = JSON.stringify(report, null, 2);
            fs.writeFileSync(options.output, reportText);
            logger.success(`\nDetailed report saved to ${options.output}`);
          }
        }

        // Summary message
        if (!options.json && !options.quiet) {
          logger.success('\n✅ Analysis complete!');
          if (report.summary.riskyRecords > 0) {
            logger.warn(`Found ${report.summary.riskyRecords} records that need attention.`);
          } else {
            logger.success('No significant risks detected.');
          }
        }

      } catch (error) {
        logger.stopSpinner(false, 'Analysis failed');
        logger.error(error instanceof Error ? error.message : 'Unknown error occurred');
        
        if (options.json) {
          logger.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        
        process.exit(1);
      }
    });

  return analyzeCmd;
}