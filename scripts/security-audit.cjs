#!/usr/bin/env node
/**
 * 自动化安全审计脚本
 * 定期检查依赖包漏洞并生成报告
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.reportDir = path.join(__dirname, '../security-reports');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.criticalThreshold = 0; // 不允许任何高危漏洞
    this.highThreshold = 5; // 最多 5 个高危漏洞
  }

  /**
   * 执行完整安全审计
   */
  async run() {
    console.log('🔍 开始安全审计...\n');
    
    try {
      // 1. 创建报告目录
      this.ensureReportDir();
      
      // 2. 执行 npm audit
      const auditResult = this.runNpmAudit();
      
      // 3. 解析审计结果
      const vulnerabilities = this.parseAuditResult(auditResult);
      
      // 4. 生成详细报告
      const report = this.generateReport(vulnerabilities);
      
      // 5. 保存报告
      this.saveReport(report);
      
      // 6. 检查是否超过阈值
      this.checkThresholds(vulnerabilities);
      
      // 7. 输出摘要
      this.printSummary(vulnerabilities);
      
      return vulnerabilities;
      
    } catch (error) {
      console.error('❌ 安全审计失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 确保报告目录存在
   */
  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * 执行 npm audit
   */
  runNpmAudit() {
    console.log('📦 检查依赖包漏洞...\n');
    
    try {
      const output = execSync('npm audit --json', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return JSON.parse(output);
    } catch (error) {
      // npm audit 在发现漏洞时会返回非零退出码
      if (error.stdout) {
        return JSON.parse(error.stdout);
      }
      throw error;
    }
  }

  /**
   * 解析审计结果
   */
  parseAuditResult(auditData) {
    const vulnerabilities = {
      critical: [],
      high: [],
      moderate: [],
      low: [],
      info: []
    };

    if (!auditData.vulnerabilities) {
      return vulnerabilities;
    }

    for (const [name, vuln] of Object.entries(auditData.vulnerabilities)) {
      const item = {
        name,
        severity: vuln.severity,
        isDirect: vuln.isDirect,
        fixAvailable: vuln.fixAvailable,
        via: Array.isArray(vuln.via) ? vuln.via : [vuln.via]
      };

      // 提取详细信息
      item.details = item.via
        .filter(v => typeof v === 'object')
        .map(v => ({
          title: v.title,
          url: v.url,
          cwe: v.cwe,
          cvss: v.cvss
        }));

      vulnerabilities[vuln.severity].push(item);
    }

    return vulnerabilities;
  }

  /**
   * 生成详细报告
   */
  generateReport(vulnerabilities) {
    const totalCount = Object.values(vulnerabilities).reduce((sum, arr) => sum + arr.length, 0);
    
    let report = `# 依赖包安全审计报告\n\n`;
    report += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n`;
    report += `**项目**: Yu-Gi-Oh! AI Card Creator\n`;
    report += `**版本**: 2.5.0\n\n`;
    
    report += `## 📊 漏洞统计\n\n`;
    report += `| 严重程度 | 数量 |\n`;
    report += `|----------|------|\n`;
    report += `| 🔴 Critical | ${vulnerabilities.critical.length} |\n`;
    report += `| 🟠 High | ${vulnerabilities.high.length} |\n`;
    report += `| 🟡 Moderate | ${vulnerabilities.moderate.length} |\n`;
    report += `| 🔵 Low | ${vulnerabilities.low.length} |\n`;
    report += `| ⚪ Info | ${vulnerabilities.info.length} |\n`;
    report += `| **总计** | **${totalCount}** |\n\n`;

    // 详细漏洞列表
    for (const [severity, vulns] of Object.entries(vulnerabilities)) {
      if (vulns.length === 0) continue;

      const icon = {
        critical: '🔴',
        high: '🟠',
        moderate: '🟡',
        low: '🔵',
        info: '⚪'
      }[severity];

      report += `## ${icon} ${severity.toUpperCase()} 级别漏洞\n\n`;

      vulns.forEach((vuln, index) => {
        report += `### ${index + 1}. ${vuln.name}\n\n`;
        report += `- **严重程度**: ${vuln.severity}\n`;
        report += `- **直接依赖**: ${vuln.isDirect ? '是' : '否'}\n`;
        
        if (vuln.fixAvailable) {
          report += `- **修复方案**: 升级到 ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}\n`;
          if (vuln.fixAvailable.isSemVerMajor) {
            report += `  ⚠️ 警告：需要升级主版本号\n`;
          }
        } else {
          report += `- **修复方案**: ❌ 暂无可用修复\n`;
        }

        if (vuln.details && vuln.details.length > 0) {
          report += `\n**详细信息**:\n\n`;
          vuln.details.forEach(detail => {
            report += `- ${detail.title}\n`;
            if (detail.url) {
              report += `  - 参考: ${detail.url}\n`;
            }
            if (detail.cvss) {
              report += `  - CVSS 评分: ${detail.cvss.score} (${detail.cvss.vectorString})\n`;
            }
          });
        }

        report += `\n---\n\n`;
      });
    }

    // 修复建议
    report += `## 🛠️ 修复建议\n\n`;
    
    const fixableHigh = [...vulnerabilities.critical, ...vulnerabilities.high]
      .filter(v => v.fixAvailable);
    
    if (fixableHigh.length > 0) {
      report += `### 立即修复的高危漏洞\n\n`;
      report += '```bash\n';
      
      const fixes = new Map();
      fixableHigh.forEach(v => {
        if (v.fixAvailable && v.isDirect) {
          fixes.set(v.fixAvailable.name, v.fixAvailable.version);
        }
      });
      
      if (fixes.size > 0) {
        fixes.forEach((version, name) => {
          report += `npm install ${name}@${version}\n`;
        });
      } else {
        report += `npm audit fix --force\n`;
      }
      
      report += '```\n\n';
    }

    report += `### 监控策略\n\n`;
    report += `1. **定期检查**: 每周运行 \`npm run security:audit\`\n`;
    report += `2. **自动更新**: 启用 Dependabot 或 Renovate Bot\n`;
    report += `3. **CI/CD 集成**: 在 GitHub Actions 中添加安全检查\n`;
    report += `4. **版本锁定**: 使用 \`package-lock.json\` 确保版本一致性\n\n`;

    return report;
  }

  /**
   * 保存报告
   */
  saveReport(report) {
    const reportPath = path.join(this.reportDir, `audit-${this.timestamp}.md`);
    fs.writeFileSync(reportPath, report, 'utf-8');
    
    // 保存最新报告的副本
    const latestPath = path.join(this.reportDir, 'latest.md');
    fs.writeFileSync(latestPath, report, 'utf-8');
    
    console.log(`📄 报告已保存: ${reportPath}\n`);
  }

  /**
   * 检查是否超过阈值
   */
  checkThresholds(vulnerabilities) {
    const criticalCount = vulnerabilities.critical.length;
    const highCount = vulnerabilities.high.length;

    if (criticalCount > this.criticalThreshold) {
      console.error(`\n❌ 发现 ${criticalCount} 个 Critical 级别漏洞（阈值: ${this.criticalThreshold}）`);
      console.error('   请立即修复后再进行部署！\n');
      process.exit(1);
    }

    if (highCount > this.highThreshold) {
      console.warn(`\n⚠️  发现 ${highCount} 个 High 级别漏洞（阈值: ${this.highThreshold}）`);
      console.warn('   建议尽快修复\n');
    }
  }

  /**
   * 打印摘要
   */
  printSummary(vulnerabilities) {
    const totalCount = Object.values(vulnerabilities).reduce((sum, arr) => sum + arr.length, 0);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 安全审计摘要');
    console.log('='.repeat(60));
    console.log(`🔴 Critical: ${vulnerabilities.critical.length}`);
    console.log(`🟠 High:     ${vulnerabilities.high.length}`);
    console.log(`🟡 Moderate: ${vulnerabilities.moderate.length}`);
    console.log(`🔵 Low:      ${vulnerabilities.low.length}`);
    console.log(`⚪ Info:     ${vulnerabilities.info.length}`);
    console.log('─'.repeat(60));
    console.log(`📦 总计:     ${totalCount} 个漏洞`);
    console.log('='.repeat(60) + '\n');

    if (totalCount === 0) {
      console.log('✅ 恭喜！未发现安全漏洞\n');
    } else {
      console.log('💡 查看完整报告: security-reports/latest.md\n');
    }
  }
}

// 执行审计
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = SecurityAuditor;
