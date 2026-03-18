/**
 * Git 操作处理器
 *
 * v1.0 实现：生成 Git 命令供用户手动执行
 * 未来版本可接入本地 companion server 实现自动执行
 */
export class GitHandler {
  private outputDirectory: string;

  constructor(outputDirectory: string) {
    this.outputDirectory = outputDirectory;
  }

  /**
   * 生成 Git 拉取命令（快速模式：ff-only，失败则降级为 reset + pull）
   */
  generatePullCommands(): string[] {
    if (!this.outputDirectory) return [];
    return [
      `cd "${this.outputDirectory}"`,
      'git checkout -- . && git pull --ff-only || (git reset --hard && git clean -dfq && git pull)',
    ];
  }

  /**
   * 生成 Git 提交推送命令
   */
  generatePushCommands(
    modifiedFiles: string[],
    commitMessage: string,
    operator?: string
  ): string[] {
    if (!this.outputDirectory || modifiedFiles.length === 0) return [];

    const commands: string[] = [`cd "${this.outputDirectory}"`];

    // 确保 git 用户信息已配置（仓库级别）
    const userName = operator || 'GameData Studio';
    commands.push(`git config user.name "${userName}" 2>nul`);
    commands.push('git config user.email "gamedata-studio@local" 2>nul');

    for (const file of modifiedFiles) {
      commands.push(`git add "${file}"`);
    }

    commands.push(`git commit -m "${commitMessage}"`);
    commands.push('git push');

    return commands;
  }

  /**
   * 生成提交信息
   * 模板占位符：{0}=版本号.序列号  {1}=版本名  {2}=操作员
   * 默认模板：-{1}{0}数据表提交
   */
  generateCommitMessage(
    template: string,
    versionName: string,
    versionNumber: number,
    sequenceNumber: number,
    operator?: string
  ): string {
    const tpl = template || '-{1}{0}数据表提交';
    const verNum = `${versionNumber}.${sequenceNumber}`;
    return tpl
      .replace(/\{0\}/g, verNum)
      .replace(/\{1\}/g, versionName)
      .replace(/\{2\}/g, operator || '');
  }

  /**
   * 获取完整的 Git 脚本（供用户复制执行）
   */
  getFullPullScript(): string {
    return this.generatePullCommands().join(' && ');
  }

  getFullPushScript(
    modifiedFiles: string[],
    commitMessage: string
  ): string {
    return this.generatePushCommands(modifiedFiles, commitMessage).join(' && ');
  }

  /**
   * 生成查看最近提交历史的命令
   */
  generateLogCommands(): string[] {
    if (!this.outputDirectory) return [];
    return [
      `cd "${this.outputDirectory}"`,
      'git log --pretty=format:"%H||%ai||%an||%s" -10',
    ];
  }


  /**
   * 生成回退到指定提交的命令
   * hash 做正则校验防注入
   */
  generateResetCommands(hash: string): string[] {
    if (!this.outputDirectory) return [];
    if (!/^[0-9a-f]{7,40}$/i.test(hash)) {
      throw new Error(`无效的 commit hash: ${hash}`);
    }
    return [
      `cd "${this.outputDirectory}"`,
      `git reset --hard ${hash}`,
      'git push --force',
    ];
  }

  getOutputDirectory(): string {
    return this.outputDirectory;
  }
}
