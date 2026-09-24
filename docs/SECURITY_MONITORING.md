# 依赖包安全监控系统文档

## 📋 概述

本项目已配置完整的**自动化依赖包安全监控系统**，用于定期检查和修复 npm 依赖包的安全漏洞。

---

## 🛡️ 监控组件

### 1. 本地安全审计脚本

**文件**: `scripts/security-audit.cjs`

**功能**:
- 执行 `npm audit` 检查依赖漏洞
- 按严重程度分类（Critical/High/Moderate/Low/Info）
- 生成详细的 Markdown 报告
- 自动保存审计历史
- 设置安全阈值（Critical > 0 时构建失败）

**使用方法**:
```bash
# 运行完整安全审计
npm run security:audit

# 自动修复（安全）
npm run security:fix

# 强制修复（可能引入破坏性更新）
npm run security:fix-force
```

**报告位置**: `security-reports/`
- `latest.md` - 最新审计报告
- `audit-YYYY-MM-DDTHH-mm-ss.md` - 历史报告（带时间戳）

---

### 2. GitHub Actions 自动化

**文件**: `.github/workflows/security-audit.yml`

**触发条件**:
- 每周一早上 9:00（UTC）自动运行
- PR 提交时检查
- 推送到 `main` 分支时检查
- `package.json` 或 `package-lock.json` 变更时检查
- 手动触发（GitHub Actions 界面）

**工作流程**:
1. 安装依赖
2. 运行安全审计脚本
3. 生成依赖关系图
4. 上传报告到 Artifacts（保留 90 天）
5. PR 自动评论审计结果
6. 发现 Critical 级别漏洞时构建失败

---

### 3. Dependabot 自动更新

**文件**: `.github/dependabot.yml`

**功能**:
- 每周一自动检查依赖更新
- 安全更新（最高优先级）
- 开发依赖更新（minor/patch）
- 生产依赖更新（仅 patch）
- GitHub Actions 依赖更新

**配置**:
- 时区: `Asia/Shanghai`
- 每周最多 10 个 PR
- 自动打标签: `dependencies`, `security`
- 自动分配审查人

---

## 📊 当前漏洞状态

### 最新审计结果（2026-09-24）

| 严重程度 | 数量 | 状态 |
|----------|------|------|
| 🔴 Critical | 0 | ✅ |
| 🟠 High | 2-3 | ⚠️ 需修复 |
| 🟡 Moderate | 若干 | 📋 已知 |
| 🔵 Low | 若干 | 👀 监控 |

### 已知高危漏洞

#### 1. @capacitor/cli (High)
- **当前版本**: 5.7.8
- **受影响**: `tar` 依赖漏洞
- **修复版本**: 8.5.2
- **影响范围**: 移动端打包工具
- **修复命令**: 
  ```bash
  npm install @capacitor/cli@latest
  ```

#### 2. electron-builder (High - CVE-2024-XXXX)
- **当前版本**: 24.13.3
- **漏洞**: 
  - `app-builder-lib` 不受控的搜索路径 (CVSS 7.8)
  - `builder-util-runtime` 跨域重定向泄露 Token
- **修复版本**: 26.15.3
- **影响范围**: Windows/macOS 打包工具
- **注意**: 需要升级主版本号（24 → 26）
- **修复命令**:
  ```bash
  npm install electron-builder@latest
  ```

---

## 🔧 修复策略

### 立即修复（Critical + High）

```bash
# 1. 尝试自动修复
npm run security:fix

# 2. 如果自动修复不成功，手动升级
npm install @capacitor/cli@latest electron-builder@latest

# 3. 测试兼容性
npm run build
npm run package:win

# 4. 再次审计
npm run security:audit
```

### 定期维护

**每周一**:
- Dependabot 自动创建更新 PR
- GitHub Actions 自动运行安全审计
- 审查并合并安全更新

**每月**:
- 人工审查 `security-reports/` 历史趋势
- 评估是否需要调整安全阈值
- 更新本文档

---

## 📈 监控指标

### 安全阈值
- **Critical**: `0` 个（不允许）
- **High**: `≤ 5` 个（警告）
- **Moderate**: 不限制（监控）

### 响应时间 SLA
- **Critical**: 24 小时内修复
- **High**: 1 周内修复
- **Moderate**: 1 个月内评估
- **Low**: 下次依赖更新时处理

---

## 🚀 最佳实践

### 开发者工作流

1. **提交代码前**:
   ```bash
   npm run security:audit
   ```

2. **发现漏洞时**:
   ```bash
   # 先尝试安全修复
   npm run security:fix
   
   # 如果需要破坏性更新，谨慎使用
   npm run security:fix-force
   
   # 测试功能是否正常
   npm run build
   npm test
   ```

3. **升级依赖时**:
   - 优先查看 Dependabot PR
   - 审查 CHANGELOG 和 Breaking Changes
   - 在独立分支测试
   - 通过 CI/CD 验证后合并

### CI/CD 集成

GitHub Actions 已自动集成：
- ✅ PR 自动安全检查
- ✅ 主分支推送触发审计
- ✅ 定期扫描（每周一）
- ✅ 报告自动归档
- ✅ Critical 漏洞阻断构建

---

## 🔗 相关资源

### 内部文档
- [Phase 11 安全修复](../SECURITY_FIXES.md)
- [构建脚本文档](../docs/PACKAGING.md)

### 外部工具
- [npm audit](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
- [GitHub Security Advisories](https://github.com/advisories)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)

### 漏洞查询
- [CVE Details](https://www.cvedetails.com/)
- [NVD - National Vulnerability Database](https://nvd.nist.gov/)

---

## 📝 变更日志

### 2026-09-24
- ✅ 初始化安全监控系统
- ✅ 创建 `security-audit.cjs` 脚本
- ✅ 配置 GitHub Actions 工作流
- ✅ 配置 Dependabot 自动更新
- ✅ 添加 npm scripts (`security:*`)
- ⚠️ 发现 2-3 个 High 级别漏洞待修复

---

## 🤝 贡献指南

### 报告安全问题

如果发现安全漏洞，请：
1. **不要**在 GitHub Issues 公开披露
2. 发送邮件到项目维护者
3. 提供详细的漏洞描述和复现步骤
4. 等待安全补丁发布后再公开

### 改进监控系统

欢迎提交 PR 改进：
- 优化审计脚本性能
- 添加更多安全检查规则
- 集成其他安全扫描工具（如 Snyk, Trivy）
- 改进报告格式

---

## ❓ 常见问题

### Q1: 为什么要设置安全阈值？
**A**: 阻止高危漏洞进入生产环境，确保代码质量和用户安全。

### Q2: Dependabot PR 太多怎么办？
**A**: 可以在 `.github/dependabot.yml` 调整：
```yaml
open-pull-requests-limit: 5  # 减少数量
schedule:
  interval: "monthly"  # 改为每月检查
```

### Q3: 升级依赖后功能异常怎么办？
**A**: 
1. 回滚到上一个 commit
2. 逐个升级依赖包，定位问题
3. 查看依赖的 Breaking Changes 文档
4. 如果无法修复，暂时固定版本并在 `dependabot.yml` 忽略该依赖

### Q4: Critical 漏洞但没有修复版本怎么办？
**A**:
1. 查看是否有临时缓解措施
2. 考虑替换该依赖包
3. 评估实际风险（如仅影响开发环境）
4. 在 SECURITY.md 中记录已知风险

---

## 📞 联系方式

- **项目维护者**: YGO AI Studio Team
- **安全问题邮箱**: [待配置]
- **GitHub Issues**: [项目地址]/issues
- **Discord/Slack**: [待配置]

---

**最后更新**: 2026-09-24  
**文档版本**: v1.0  
**系统状态**: ✅ 运行中
