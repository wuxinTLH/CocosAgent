import fs from 'node:fs';
import path from 'node:path';

export interface SkillMeta {
  name: string;
  description: string;
  dir: string;
}

export function loadSkills(root: string): SkillMeta[] {
  const skillsDir = path.join(root, 'skills');
  if (!fs.existsSync(skillsDir)) {
    return [];
  }
  const names = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const skills: SkillMeta[] = [];
  for (const name of names) {
    const skillFile = path.join(skillsDir, name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      continue;
    }
    const text = fs.readFileSync(skillFile, 'utf8');
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const nameMatch = frontmatter?.[1].match(/^name:\s*(.+)$/m);
    const descriptionMatch = frontmatter?.[1].match(/^description:\s*(.+)$/m);
    skills.push({
      name: nameMatch?.[1]?.trim() ?? name,
      description: descriptionMatch?.[1]?.trim() ?? '',
      dir: path.join(skillsDir, name),
    });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function skillManifest(root: string, name: string): string {
  const skill = loadSkills(root).find((item) => item.name === name);
  if (!skill) {
    throw new Error(`SKILL_NOT_FOUND: ${name}`);
  }
  return path.join(skill.dir, 'SKILL.md');
}
