// A class that mixes business logic with direct I/O calls.
// It should be a NULLABLE_CLASS but currently has HARDWIRED_INFRASTRUCTURE.

import fs from 'node:fs/promises';

interface ReportData {
  title: string;
  rows: Array<{ label: string; value: number }>;
}

export class ReportGenerator {
  private templateDir: string;

  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }

  async generate(data: ReportData): Promise<string> {
    // OUTSIDE_WORLD: reads from disk
    const template = await fs.readFile(
      `${this.templateDir}/${data.title}.html`,
      'utf-8',
    );

    // PURE: transforms data
    const totalValue = data.rows.reduce((sum, row) => sum + row.value, 0);
    const rowsHtml = data.rows
      .map((row) => `<tr><td>${row.label}</td><td>${row.value}</td></tr>`)
      .join('\n');

    const html = template
      .replace('{{title}}', data.title)
      .replace('{{rows}}', rowsHtml)
      .replace('{{total}}', String(totalValue));

    // OUTSIDE_WORLD: writes to disk
    const outputPath = `./output/${data.title}-report.html`;
    await fs.writeFile(outputPath, html);

    // OUTSIDE_WORLD: posts to a webhook
    await fetch('https://hooks.example.com/reports', {
      method: 'POST',
      body: JSON.stringify({ title: data.title, path: outputPath }),
    });

    return outputPath;
  }
}
