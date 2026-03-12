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
   * 生成 Git 拉取命令
   */
  generatePullCommands(): string[] {
    if (!this.outputDirectory) return [];
    return [
      `cd "${this.outputDirectory}"`,
      'git reset --hard',
      'git clean -dfq',
      'git pull',
    ];
  }

  /**
   * 生成 Git 提交推送命令
   */
  generatePushCommands(
    modifiedFiles: string[],
    commitMessage: string
  ): string[] {
    if (!this.outputDirectory || modifiedFiles.length === 0) return [];

    const commands: string[] = [`cd "${this.outputDirectory}"`];

    for (const file of modifiedFiles) {
      commands.push(`git add "${file}"`);
    }

    commands.push(`git commit -m "${commitMessage}"`);
    commands.push('git push');

    return commands;
  }

  /**
   * 生成提交信息
   */
  generateCommitMessage(
    template: string,
    versionName: string,
    versionNumber: number,
    sequenceNumber: number
  ): string {
    if (!template) {
      return `${versionName} ${versionNumber}.${sequenceNumber}`;
    }

    return template
      .replace('{VerName}', versionName)
      .replace('{VerNum}', String(versionNumber))
      .replace('{SeqNum}', String(sequenceNumber))
      .replace('{User}', '')
      .replace('{Date}', new Date().toLocaleDateString('zh-CN'))
      + ` ${versionName} ${versionNumber}.${sequenceNumber}`;
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

  getOutputDirectory(): string {
    return this.outputDirectory;
  }
}
