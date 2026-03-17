import { BarChart3, Languages, BookOpen, ShieldCheck, History, Database, Settings2 } from 'lucide-react';
import { DashboardPage } from '../features/dashboard';
import { TranslatePage } from '../features/translate';
import { TranslationsPage } from '../features/translations';
import { QualityPage } from '../features/quality';
import { AuditPage } from '../features/audit';
import { GlossaryPage } from '../features/glossary';
import { SettingsPage } from '../features/settings';

export const routes = [
  { path: '/', element: <DashboardPage />, label: 'Dashboard', icon: BarChart3 },
  { path: '/translate', element: <TranslatePage />, label: 'Translate', icon: Languages },
  { path: '/translations', element: <TranslationsPage />, label: 'Translations', icon: BookOpen },
  { path: '/quality', element: <QualityPage />, label: 'Quality', icon: ShieldCheck },
  { path: '/audit', element: <AuditPage />, label: 'Audit', icon: History },
  { path: '/glossary', element: <GlossaryPage />, label: 'Glossary', icon: Database },
  { path: '/settings', element: <SettingsPage />, label: 'Settings', icon: Settings2 },
];
