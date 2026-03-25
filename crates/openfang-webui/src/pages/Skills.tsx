// Skills - Claymorphism Design System
// Purple theme, soft 3D, rounded cards - consistent with Overview.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import type { Skill, ClawHubSkill, McpServersResponse } from '@/api/types';
import { toaster } from '@/lib/toast';
import {
  Puzzle, Search, Check, X, Code2, Loader2,
  Globe, Server, Plus, Eye, Sparkles,
  TrendingUp, Calendar, GitBranch, Download, Star,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// ============================================
// CLAYMORPHISM DESIGN TOKENS
// ============================================
const clay = {
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  bgGradient: 'from-gray-50 via-violet-50/30 to-purple-50/20',
  card: 'bg-white border-[3px] border-white',
  cardShadow: 'shadow-[0_4px_16px_rgba(139,92,246,0.15),inset_0_1px_3px_rgba(255,255,255,0.8)]',
  cardHover: 'hover:shadow-[0_8px_24px_rgba(139,92,246,0.25)]',
  active: 'bg-violet-50 shadow-[inset_0_2px_4px_rgba(139,92,246,0.15)]',
  radius: 'rounded-2xl',
  radiusLg: 'rounded-3xl',
  textPrimary: 'text-gray-800',
  textMuted: 'text-gray-500',
  textViolet: 'text-violet-600',
};

interface SkillWithSource extends Skill {
  source: { type: string; slug?: string; version?: string };
}

// Runtime badge colors - violet theme
const runtimeColors: Record<string, { bg: string; text: string; icon: string }> = {
  prompt: { bg: 'bg-violet-100', text: 'text-violet-700', icon: 'text-violet-600' },
  python: { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-600' },
  nodejs: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-600' },
  wasm: { bg: 'bg-rose-100', text: 'text-rose-700', icon: 'text-rose-600' },
};

// Categories from ServiceMe Hub
const categories = [
  { id: 'coding', name: 'Coding & IDEs' },
  { id: 'git', name: 'Git & GitHub' },
  { id: 'web', name: 'Web & Frontend' },
  { id: 'devops', name: 'DevOps & Cloud' },
  { id: 'browser', name: 'Browser & Automation' },
  { id: 'search', name: 'Search & Research' },
  { id: 'ai', name: 'AI & LLMs' },
  { id: 'data', name: 'Data & Analytics' },
  { id: 'productivity', name: 'Productivity' },
  { id: 'communication', name: 'Communication' },
  { id: 'media', name: 'Media & Streaming' },
  { id: 'notes', name: 'Notes & PKM' },
  { id: 'security', name: 'Security' },
  { id: 'cli', name: 'CLI Utilities' },
  { id: 'marketing', name: 'Marketing & Sales' },
  { id: 'finance', name: 'Finance' },
  { id: 'smart-home', name: 'Smart Home & IoT' },
  { id: 'docs', name: 'PDF & Documents' },
];

// Quick start skills
const quickStartSkills = [
  { name: 'code-review-guide', description: 'Adds code review best practices and checklist to agent context.', prompt_context: 'You are an expert code reviewer. When reviewing code:\n1. Check for bugs and logic errors\n2. Evaluate code style and readability\n3. Look for security vulnerabilities\n4. Suggest performance improvements\n5. Verify error handling\n6. Check test coverage' },
  { name: 'writing-style', description: 'Configurable writing style guide for content generation.', prompt_context: 'Follow these writing guidelines:\n- Use clear, concise language\n- Prefer active voice over passive voice\n- Keep paragraphs short (3-4 sentences)\n- Use bullet points for lists\n- Maintain consistent tone throughout' },
  { name: 'api-design', description: 'REST API design patterns and conventions.', prompt_context: 'When designing REST APIs:\n- Use nouns for resources, not verbs\n- Use HTTP methods correctly (GET, POST, PUT, DELETE)\n- Return appropriate status codes\n- Use pagination for list endpoints\n- Version your API\n- Document all endpoints' },
  { name: 'security-checklist', description: 'OWASP-aligned security review checklist.', prompt_context: 'Security review checklist (OWASP aligned):\n- Input validation on all user inputs\n- Output encoding to prevent XSS\n- Parameterized queries to prevent SQL injection\n- Authentication and session management\n- Access control checks\n- CSRF protection\n- Security headers\n- Error handling without information leakage' },
];

// ============================================
// SKILL CARD COMPONENT
// ============================================
function SkillCard({
  skill,
  onToggle,
  onDelete,
  onDetail
}: {
  skill: SkillWithSource;
  onToggle: () => void;
  onDelete?: () => void;
  onDetail?: () => void;
}) {
  const colors = runtimeColors[skill.runtime] || runtimeColors.prompt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className={cn(
        clay.card,
        clay.cardShadow,
        clay.cardHover,
        clay.radius,
        'transition-all duration-300'
      )}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colors.bg)}>
            <Code2 className={cn('w-6 h-6', colors.icon)} />
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium uppercase', colors.bg, colors.text)}>
              {skill.runtime}
            </span>
            {skill.source?.type === 'builtin' && (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-gray-100 text-gray-600">
                BUILTIN
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <h3 className="font-semibold text-gray-800 mb-1">{skill.name}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{skill.description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {skill.tools_count} tool{skill.tools_count !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            {onDetail && (
              <button
                onClick={onDetail}
                className="p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {onDelete && skill.source?.type !== 'builtin' && (
              <button
                onClick={onDelete}
                className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onToggle}
              className={cn(
                'p-2 rounded-lg transition-colors',
                skill.enabled
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              )}
            >
              {skill.enabled ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// SERVICEME HUB SKILL CARD
// ============================================
function ClawHubSkillCard({
  skill,
  onInstall,
  onDetail,
  installing
}: {
  skill: ClawHubSkill;
  onInstall: () => void;
  onDetail: () => void;
  installing: boolean;
}) {
  const colors = runtimeColors[skill.runtime || 'prompt'] || runtimeColors.prompt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className={cn(
        clay.card,
        clay.cardShadow,
        clay.cardHover,
        clay.radius,
        'transition-all duration-300'
      )}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colors.bg)}>
            <Globe className={cn('w-6 h-6', colors.icon)} />
          </div>
          {skill.stars !== undefined && skill.stars > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
              <Star className="w-3 h-3 fill-amber-600" />
              {skill.stars}
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className="font-semibold text-gray-800 mb-1">{skill.name}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{skill.description}</p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
          {skill.author && <span>@{skill.author}</span>}
          {skill.downloads !== undefined && (
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {formatDownloads(skill.downloads)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={onDetail}
            className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            Details
          </button>
          <button
            onClick={onInstall}
            disabled={installing || skill.installed}
            className={cn(
              'flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors',
              skill.installed
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
            )}
          >
            {installing && <Loader2 className="w-4 h-4 animate-spin" />}
            {skill.installed ? 'Installed' : 'Install'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function formatDownloads(n: number): string {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// ============================================
// MAIN SKILLS COMPONENT
// ============================================
export function Skills() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'installed' | 'clawhub' | 'mcp' | 'create'>('installed');
  const queryClient = useQueryClient();

  // Installed skills state
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'enabled' | 'builtin'>('all');

  // ServiceMe Hub state
  const [clawhubSearch, setClawhubSearch] = useState('');
  const [clawhubResults, setClawhubResults] = useState<ClawHubSkill[]>([]);
  const [clawhubBrowseResults, setClawhubBrowseResults] = useState<ClawHubSkill[]>([]);
  const [clawhubLoading, setClawhubLoading] = useState(false);
  const [clawhubSort, setClawhubSort] = useState<'trending' | 'downloads' | 'stars' | 'updated'>('trending');
  const [clawhubNextCursor, setClawhubNextCursor] = useState<string | null>(null);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const browseCacheRef = useRef<Record<string, { ts: number; data: ClawHubSkill[]; cursor?: string }>>({});

  // Skill detail modal
  const [detailSkill, setDetailSkill] = useState<ClawHubSkill | null>(null);
  const [skillCode, setSkillCode] = useState('');
  const [showSkillCode, setShowSkillCode] = useState(false);

  // Create skill form
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    prompt_context: ''
  });

  // Fetch installed skills
  const { data: skills = [], isLoading } = useQuery<SkillWithSource[]>({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await api.get<{ skills: SkillWithSource[] }>('/api/skills');
      return res.skills || [];
    },
  });

  // Fetch MCP servers
  const { data: mcpData } = useQuery<McpServersResponse>({
    queryKey: ['mcp-servers'],
    queryFn: () => api.getMcpServers(),
    enabled: activeTab === 'mcp',
  });

  // Toggle skill mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ name, enabled }: { name: string; enabled: boolean }) => {
      await api.post(`/api/skills/${name}/toggle`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });

  // Delete skill mutation
  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.del(`/api/skills/${name}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });

  // Create skill mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof createForm) => api.createSkill({ ...data, runtime: 'prompt_only' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setActiveTab('installed');
      setCreateForm({ name: '', description: '', prompt_context: '' });
      toaster.success('Skill created successfully');
    },
    onError: (err) => toaster.error('Failed to create skill: ' + (err as Error).message),
  });

  // ServiceMe Hub search with debounce
  const onSearchInput = useCallback((value: string) => {
    setClawhubSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!value.trim()) {
      setClawhubResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setClawhubLoading(true);
      try {
        const data = await api.searchClawHub(value.trim());
        setClawhubResults(data.items || []);
      } catch {
        setClawhubResults([]);
      }
      setClawhubLoading(false);
    }, 350);
  }, []);

  // ServiceMe Hub browse with cache
  const browseClawHub = useCallback(async (sort: typeof clawhubSort) => {
    setClawhubSort(sort);
    const ckey = `browse:${sort}`;
    const cached = browseCacheRef.current[ckey];

    if (cached && (Date.now() - cached.ts) < 60000) {
      setClawhubBrowseResults(cached.data);
      setClawhubNextCursor(cached.cursor || null);
      return;
    }

    setClawhubLoading(true);
    try {
      const data = await api.browseClawHub(sort);
      setClawhubBrowseResults(data.items || []);
      setClawhubNextCursor(data.next_cursor || null);
      browseCacheRef.current[ckey] = { ts: Date.now(), data: data.items || [], cursor: data.next_cursor };
    } catch {
      setClawhubBrowseResults([]);
    }
    setClawhubLoading(false);
  }, []);

  // Install from ServiceMe Hub
  const installFromClawHub = useCallback(async (slug: string) => {
    setInstallingSlug(slug);
    try {
      const data = await api.installFromClawHub(slug);
      if (data.warnings && data.warnings.length > 0) {
        toaster.success(`Skill "${data.name}" installed with ${data.warnings.length} warning(s)`);
      } else {
        toaster.success(`Skill "${data.name}" installed successfully`);
      }
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      if (detailSkill && detailSkill.slug === slug) {
        setDetailSkill({ ...detailSkill, installed: true });
      }
    } catch (err) {
      const msg = (err as Error).message || 'Install failed';
      if (msg.includes('already_installed')) {
        toaster.error('Skill is already installed');
      } else if (msg.includes('SecurityBlocked')) {
        toaster.error('Skill blocked by security scan');
      } else {
        toaster.error('Install failed: ' + msg);
      }
    }
    setInstallingSlug(null);
  }, [queryClient, detailSkill]);

  // View skill code
  const viewSkillCode = useCallback(async (slug: string) => {
    if (showSkillCode) {
      setShowSkillCode(false);
      return;
    }
    try {
      const data = await api.getSkillCode(slug);
      setSkillCode(data.code || '');
      setShowSkillCode(true);
    } catch {
      toaster.error('Could not load skill source code');
    }
  }, [showSkillCode]);

  // Create quick start skill
  const createQuickStart = useCallback(async (skill: typeof quickStartSkills[0]) => {
    try {
      await api.createSkill({
        name: skill.name,
        description: skill.description,
        runtime: 'prompt_only',
        prompt_context: skill.prompt_context
      });
      toaster.success(`Skill "${skill.name}" created`);
      setActiveTab('installed');
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    } catch (err) {
      toaster.error('Failed to create skill: ' + (err as Error).message);
    }
  }, [queryClient]);

  // Check if skill is installed by slug
  const isSkillInstalled = useCallback((slug?: string) => {
    if (!slug) return false;
    return skills.some(s => s.source?.type === 'clawhub' && s.source?.slug === slug);
  }, [skills]);

  // Load browse data when tab changes
  useEffect(() => {
    if (activeTab === 'clawhub' && clawhubBrowseResults.length === 0) {
      browseClawHub('trending');
    }
  }, [activeTab, browseClawHub, clawhubBrowseResults.length]);

  // Filter installed skills
  const filteredSkills = skills.filter((skill) => {
    if (activeFilter === 'enabled') return skill.enabled;
    if (activeFilter === 'builtin') return skill.source?.type === 'builtin';
    return true;
  }).filter((skill) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return skill.name.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q);
  });

  // ServiceMe Hub display results
  const clawhubDisplayResults = clawhubSearch ? clawhubResults : clawhubBrowseResults;

  const enabledCount = skills.filter(s => s.enabled).length;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Skills</h1>
            <p className="text-gray-500 mt-1">
              {skills.length} skill{skills.length !== 1 ? 's' : ''} • {enabledCount} enabled
            </p>
          </div>

          {/* Tabs */}
          <div className={cn(
            'flex bg-white rounded-2xl p-1.5 border-[3px] border-white shadow-[0_4px_16px_rgba(139,92,246,0.15)]'
          )}>
            {[
              { id: 'installed', label: 'Installed', icon: Puzzle },
              { id: 'clawhub', label: 'ServiceMe Hub', icon: Globe },
              { id: 'mcp', label: 'MCP', icon: Server },
              { id: 'create', label: 'Create', icon: Plus },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  activeTab === id
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Installed Tab */}
        {activeTab === 'installed' && (
          <>
            <motion.div
              className="flex flex-wrap items-center gap-4 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex bg-white rounded-xl p-1 shadow-[0_2px_8px_rgba(139,92,246,0.1)]">
                {(['all', 'enabled', 'builtin'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm capitalize font-medium transition-all',
                      activeFilter === filter
                        ? 'bg-violet-100 text-violet-700'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search skills..."
                  className="bg-white border-2 border-white shadow-[0_2px_8px_rgba(139,92,246,0.1)] rounded-xl pl-10 pr-4 py-2.5 text-gray-800 text-sm placeholder:text-gray-400 w-56 focus:outline-none focus:border-violet-200"
                />
              </div>
            </motion.div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSkills.length === 0 ? (
              <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className={cn(
                  'w-20 h-20 rounded-3xl bg-white flex items-center justify-center mx-auto mb-6',
                  clay.cardShadow
                )}>
                  <Puzzle className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No skills found</h3>
                <p className="text-gray-500">
                  {search ? 'Try a different search term' : 'Install skills to extend agent capabilities'}
                </p>
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" layout>
                <AnimatePresence mode="popLayout">
                  {filteredSkills.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      skill={skill}
                      onToggle={() => toggleMutation.mutate({ name: skill.name, enabled: !skill.enabled })}
                      onDelete={skill.source?.type !== 'builtin' ? () => {
                        if (confirm(`Delete skill "${skill.name}"?`)) {
                          deleteMutation.mutate(skill.name);
                        }
                      } : undefined}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}

        {/* ServiceMe Hub Tab */}
        {activeTab === 'clawhub' && (
          <>
            {/* Search & Sort */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={clawhubSearch}
                  onChange={(e) => onSearchInput(e.target.value)}
                  placeholder="Search ServiceMe Hub..."
                  className={cn(
                    'w-full bg-white border-[3px] border-white shadow-[0_2px_8px_rgba(139,92,246,0.1)] rounded-xl pl-12 pr-4 py-3',
                    'text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-violet-200'
                  )}
                />
                {clawhubSearch && (
                  <button
                    onClick={() => { setClawhubSearch(''); setClawhubResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!clawhubSearch && (
                <div className="flex bg-white rounded-xl p-1 shadow-[0_2px_8px_rgba(139,92,246,0.1)]">
                  {[
                    { id: 'trending', label: 'Trending', icon: TrendingUp },
                    { id: 'downloads', label: 'Downloads', icon: Download },
                    { id: 'stars', label: 'Stars', icon: Star },
                    { id: 'updated', label: 'Updated', icon: Calendar },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => browseClawHub(id as typeof clawhubSort)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        clawhubSort === id
                          ? 'bg-violet-100 text-violet-700'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Categories */}
            {!clawhubSearch && (
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onSearchInput(cat.name)}
                    className="px-4 py-2 rounded-xl bg-white text-gray-600 hover:text-violet-600 hover:bg-violet-50 text-sm font-medium shadow-[0_2px_8px_rgba(139,92,246,0.1)] transition-all"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {clawhubLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : clawhubDisplayResults.length === 0 ? (
              <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className={cn(
                  'w-20 h-20 rounded-3xl bg-white flex items-center justify-center mx-auto mb-6',
                  clay.cardShadow
                )}>
                  <Globe className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {clawhubSearch ? 'No results' : 'Browse ServiceMe Hub'}
                </h3>
                <p className="text-gray-500">
                  {clawhubSearch ? 'Try a different search term' : 'Discover and install skills from the community'}
                </p>
              </motion.div>
            ) : (
              <>
                <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" layout>
                  <AnimatePresence mode="popLayout">
                    {clawhubDisplayResults.map((skill) => (
                      <ClawHubSkillCard
                        key={skill.slug}
                        skill={{ ...skill, installed: isSkillInstalled(skill.slug) }}
                        onInstall={() => installFromClawHub(skill.slug)}
                        onDetail={() => setDetailSkill(skill)}
                        installing={installingSlug === skill.slug}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>

                {clawhubNextCursor && !clawhubSearch && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={async () => {
                        setClawhubLoading(true);
                        try {
                          const data = await api.browseClawHub(clawhubSort, clawhubNextCursor);
                          setClawhubBrowseResults(prev => [...prev, ...(data.items || [])]);
                          setClawhubNextCursor(data.next_cursor || null);
                        } catch {}
                        setClawhubLoading(false);
                      }}
                      className="px-6 py-3 rounded-xl bg-white text-gray-600 hover:bg-violet-50 hover:text-violet-600 font-medium shadow-[0_2px_8px_rgba(139,92,246,0.1)] transition-all"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* MCP Tab */}
        {activeTab === 'mcp' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Configured Servers */}
              <div className={cn(clay.card, clay.cardShadow, clay.radius, 'p-6')}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Server className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Configured</h3>
                    <p className="text-sm text-gray-500">{mcpData?.total_configured || 0} servers</p>
                  </div>
                </div>
                {mcpData?.configured.length === 0 ? (
                  <p className="text-gray-500">No MCP servers configured</p>
                ) : (
                  <div className="space-y-3">
                    {mcpData?.configured.map((server) => (
                      <div key={server.name} className="p-4 rounded-xl bg-gray-50">
                        <div className="font-medium text-gray-800">{server.name}</div>
                        {server.command && (
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            {server.command} {server.args?.join(' ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connected Servers */}
              <div className={cn(clay.card, clay.cardShadow, clay.radius, 'p-6')}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Connected</h3>
                    <p className="text-sm text-gray-500">{mcpData?.total_connected || 0} servers</p>
                  </div>
                </div>
                {mcpData?.connected.length === 0 ? (
                  <p className="text-gray-500">No MCP servers connected</p>
                ) : (
                  <div className="space-y-3">
                    {mcpData?.connected.map((server) => (
                      <div key={server.name} className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                        <div className="font-medium text-emerald-700">{server.name}</div>
                        {server.tools && server.tools.length > 0 && (
                          <div className="text-xs text-emerald-600 mt-1">
                            {server.tools.length} tools available
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="max-w-2xl">
            {/* Quick Start */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                Quick Start
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickStartSkills.map((skill) => (
                  <motion.div
                    key={skill.name}
                    whileHover={{ y: -2 }}
                    className={cn(
                      clay.card,
                      clay.cardShadow,
                      clay.cardHover,
                      clay.radius,
                      'p-4 cursor-pointer group transition-all'
                    )}
                    onClick={() => createQuickStart(skill)}
                  >
                    <h4 className="font-medium text-gray-800 mb-1">{skill.name}</h4>
                    <p className="text-sm text-gray-500 mb-3">{skill.description}</p>
                    <span className="text-sm text-violet-600 font-medium group-hover:underline">
                      Create Skill →
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Custom Skill Form */}
            <div className={cn(clay.card, clay.cardShadow, clay.radius, 'p-6')}>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-violet-600" />
                </div>
                Create Custom Skill
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="my-custom-skill"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-violet-200 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="What does this skill do?"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-violet-200 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prompt Context</label>
                  <textarea
                    value={createForm.prompt_context}
                    onChange={(e) => setCreateForm({ ...createForm, prompt_context: e.target.value })}
                    placeholder="Instructions to add to agent context..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:border-violet-200 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400 resize-none"
                  />
                </div>
                <button
                  onClick={() => createMutation.mutate(createForm)}
                  disabled={createMutation.isPending || !createForm.name}
                  className="w-full py-3 rounded-xl bg-violet-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-violet-600 transition-colors shadow-lg shadow-violet-500/25"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Skill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Skill Detail Modal */}
      <AnimatePresence>
        {detailSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setDetailSkill(null); setShowSkillCode(false); setSkillCode(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                'w-full max-w-2xl bg-white border-[3px] border-white rounded-3xl p-6 max-h-[90vh] overflow-y-auto',
                clay.cardShadow
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{detailSkill.name}</h2>
                  {detailSkill.author && (
                    <p className="text-sm text-gray-500">by @{detailSkill.author}</p>
                  )}
                </div>
                <button
                  onClick={() => { setDetailSkill(null); setShowSkillCode(false); setSkillCode(''); }}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <p className="text-gray-600 mb-6">{detailSkill.description}</p>

              <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-500">
                {detailSkill.version && (
                  <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-lg">
                    <GitBranch className="w-4 h-4" />
                    v{detailSkill.version}
                  </span>
                )}
                {detailSkill.downloads !== undefined && (
                  <span className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-lg">
                    <Download className="w-4 h-4" />
                    {formatDownloads(detailSkill.downloads)} downloads
                  </span>
                )}
                {detailSkill.stars !== undefined && detailSkill.stars > 0 && (
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg">
                    <Star className="w-4 h-4 fill-amber-600" />
                    {detailSkill.stars} stars
                  </span>
                )}
              </div>

              {detailSkill.tags && detailSkill.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {detailSkill.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* View Code */}
              {showSkillCode && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Source Code</h4>
                    <button
                      onClick={() => viewSkillCode(detailSkill.slug)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Hide
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-gray-50 text-sm text-gray-600 overflow-x-auto max-h-64 overflow-y-auto">
                    <code>{skillCode}</code>
                  </pre>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => viewSkillCode(detailSkill.slug)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                >
                  {showSkillCode ? 'Hide Code' : 'View Code'}
                </button>
                <button
                  onClick={() => installFromClawHub(detailSkill.slug)}
                  disabled={installingSlug === detailSkill.slug || isSkillInstalled(detailSkill.slug)}
                  className={cn(
                    'flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors',
                    isSkillInstalled(detailSkill.slug)
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-violet-500 text-white hover:bg-violet-600 shadow-lg shadow-violet-500/25'
                  )}
                >
                  {installingSlug === detailSkill.slug && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSkillInstalled(detailSkill.slug) ? 'Installed' : 'Install'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Skills;
