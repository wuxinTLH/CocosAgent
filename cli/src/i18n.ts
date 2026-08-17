import { SUPPORTED_LOCALES, type SupportedLocale } from './config.js';

const MESSAGES: Record<SupportedLocale, Record<string, string>> = {
  'zh-CN': {
    localeName: '简体中文',
    dialogueLanguage: '请使用简体中文回答，除非用户明确要求使用其他语言。',
    workspaceReady: '模型工作区已就绪',
  },
  'en-US': {
    localeName: 'English',
    dialogueLanguage: 'Reply in English unless the user explicitly requests another language.',
    workspaceReady: 'Model workspace is ready',
  },
};

export function translate(locale: SupportedLocale, key: string): string {
  return MESSAGES[locale][key] ?? key;
}

export function localeCatalog(): Array<{ id: SupportedLocale; name: string }> {
  return SUPPORTED_LOCALES.map((id) => ({ id, name: translate(id, 'localeName') }));
}
