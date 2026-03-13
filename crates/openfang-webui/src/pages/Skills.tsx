// Skills - Multi-tab with ClawHub integration
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/api/client';
import type { Skill, ClawHubSkill, McpServersResponse } from '@/api/types';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { toaster } from '@/lib/toast';
import {
  Puzzle, Search, Zap, Check, X, Terminal,
  Star, Download, Trash2, Code2, Box, Loader2,
  Globe, Server, Plus, Eye, Sparkles, GitBranch,
  TrendingUp, Calendar, ExternalLink, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillWithSource extends Skill {
  source: { type: string; slug?: string; version?: string };
}

// Runtime badge colors
const runtimeColors: Record<string, string> = {
  prompt: 'var(--neon-cyan)',
  python: 'var(--neon-amber)',
  nodejs: 'var(--neon-green)',
  wasm: 'var(--neon-magenta)',
};

// Categories from Alpine
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

// Skill card component
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
  const [isHovered, setIsHovered] = useState(false);
  const color = runtimeColors[skill.runtime] || 'var(--neon-cyan)';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative"
    >
      <motion.div
        className="absolute -top-2 left-1/2 w-px bg-gradient-to-b from-transparent to-current"
        style={{ color }}
        initial={{ height: 0 }}
        animate={{ height: isHovered ? 8 : 0 }}
      />

      <SpotlightCard
        glowColor={`${color}20`}
        className="h-full"
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}15` }}
            >
              <Code2 className="w-5 h-5" style={{ color }} />
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono uppercase"
                style={{
                  backgroundColor: `${color}15`,
                  color,
                }}
              >
                {skill.runtime}
              </span>
              {skill.source?.type === 'builtin' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                  BUILTIN
                </span>
              )}
            </div>
          </div>

          <h3 className="font-semibold text-[var(--text-primary)] mb-1">{skill.name}</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">
            {skill.description}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-muted)]">
              {skill.tools_count} tool{skill.tools_count !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              {onDetail && (
                <motion.button
                  onClick={onDetail}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Eye className="w-4 h-4" />
                </motion.button>
              )}
              {onDelete && skill.source?.type !== 'builtin' && (
                <motion.button
                  onClick={onDelete}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              )}
              <motion.button
                onClick={onToggle}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  skill.enabled
                    ? 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-muted)]'
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {skill.enabled ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

// ClawHub skill card
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
  const color = runtimeColors[skill.runtime || 'prompt'] || 'var(--neon-cyan)';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <SpotlightCard
        glowColor={`${color}10`}
        className="h-full"
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}15` }}
            >
              <Globe className="w-5 h-5" style={{ color }} />
            </div>
            {skill.stars !== undefined && skill.stars > 0 && (
              <div className="flex items-center gap-1 text-xs text-[var(--neon-amber)]">
                <Star className="w-3 h-3" />
                {skill.stars}
              </div>
            )}
          </div>

          <h3 className="font-semibold text-[var(--text-primary)] mb-1">{skill.name}</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">
            {skill.description}
          </p>

          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-4">
            {skill.author && <span>@{skill.author}</span>}
            {skill.downloads !== undefined && (
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {formatDownloads(skill.downloads)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <button
              onClick={onDetail}
              className="flex-1 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] text-sm font-medium"
            >
              Details
            </button>
            <button
              onClick={onInstall}
              disabled={installing || skill.installed}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2',
                skill.installed
                  ? 'bg-[var(--neon-green)]/10 text-[var(--neon-green)]'
                  : 'bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/20'
              )}
            >
              {installing && <Loader2 className="w-4 h-4 animate-spin" />}
              {skill.installed ? 'Installed' : 'Install'}
            </button>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

function formatDownloads(n: number): string {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export function Skills() {
  const [activeTab, setActiveTab] = useState<'installed' | 'clawhub' | 'mcp' | 'create'>('installed');
  const queryClient = useQueryClient();

  // Installed skills state
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'enabled' | 'builtin'>('all');

  // ClawHub state
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

  // ClawHub search with debounce
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

  // ClawHub browse with cache
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

  // Install from ClawHub
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
      // Update detail modal if open
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

  // ClawHub display results
  const clawhubDisplayResults = clawhubSearch ? clawhubResults : clawhubBrowseResults;

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
            <h1 className="text-3xl font-bold">
              <NeonText color="amber">Skills</NeonText>
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              {skills.length} skill{skills.length !== 1 ? 's' : ''} • {skills.filter(s => s.enabled).length} enabled
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-[var(--surface-secondary)] rounded-lg p-1">
            {[
              { id: 'installed', label: 'Installed', icon: Puzzle },
              { id: 'clawhub', label: 'ClawHub', icon: Globe },
              { id: 'mcp', label: 'MCP', icon: Server },
              { id: 'create', label: 'Create', icon: Plus },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  activeTab === id
                    ? 'bg-[var(--neon-amber)]/20 text-[var(--neon-amber)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
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
              <div className="flex bg-[var(--surface-secondary)] rounded-lg p-1">
                {(['all', 'enabled', 'builtin'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm capitalize transition-colors',
                      activeFilter === filter
                        ? 'bg-[var(--neon-amber)]/20 text-[var(--neon-amber)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search skills..."
                  className="bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2 text-[var(--text-primary)] text-sm placeholder-[var(--text-primary)]/30 w-48"
                />
              </div>
            </motion.div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--neon-amber)]" />
              </div>
            ) : filteredSkills.length === 0 ? (
              <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="w-20 h-20 rounded-3xl bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-6">
                  <Puzzle className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No skills found</h3>
                <p className="text-[var(--text-muted)]">
                  {search ? 'Try a different search term' : 'Install skills to extend agent capabilities'}
                </p>
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" layout>
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

        {/* ClawHub Tab */}
        {activeTab === 'clawhub' && (
          <>
            {/* Search & Sort */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={clawhubSearch}
                  onChange={(e) => onSearchInput(e.target.value)}
                  placeholder="Search ClawHub..."
                  className="w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-lg pl-9 pr-4 py-2 text-[var(--text-primary)] text-sm"
                />
                {clawhubSearch && (
                  <button
                    onClick={() => { setClawhubSearch(''); setClawhubResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!clawhubSearch && (
                <div className="flex bg-[var(--surface-secondary)] rounded-lg p-1">
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
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                        clawhubSort === id
                          ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
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
                    className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {clawhubLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--neon-cyan)]" />
              </div>
            ) : clawhubDisplayResults.length === 0 ? (
              <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="w-20 h-20 rounded-3xl bg-[var(--surface-secondary)] flex items-center justify-center mx-auto mb-6">
                  <Globe className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  {clawhubSearch ? 'No results' : 'Browse ClawHub'}
                </h3>
                <p className="text-[var(--text-muted)]">
                  {clawhubSearch ? 'Try a different search term' : 'Discover and install skills from the community'}
                </p>
              </motion.div>
            ) : (
              <>
                <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" layout>
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
                      className="px-6 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Configured Servers */}
              <div className="p-6 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-default)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-[var(--neon-cyan)]" />
                  Configured ({mcpData?.total_configured || 0})
                </h3>
                {mcpData?.configured.length === 0 ? (
                  <p className="text-[var(--text-muted)]">No MCP servers configured</p>
                ) : (
                  <div className="space-y-3">
                    {mcpData?.configured.map((server) => (
                      <div key={server.name} className="p-3 rounded-lg bg-[var(--surface-tertiary)]">
                        <div className="font-medium text-[var(--text-primary)]">{server.name}</div>
                        {server.command && (
                          <div className="text-xs text-[var(--text-muted)] font-mono mt-1">
                            {server.command} {server.args?.join(' ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connected Servers */}
              <div className="p-6 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-default)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[var(--neon-green)]" />
                  Connected ({mcpData?.total_connected || 0})
                </h3>
                {mcpData?.connected.length === 0 ? (
                  <p className="text-[var(--text-muted)]">No MCP servers connected</p>
                ) : (
                  <div className="space-y-3">
                    {mcpData?.connected.map((server) => (
                      <div key={server.name} className="p-3 rounded-lg bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/20">
                        <div className="font-medium text-[var(--neon-green)]">{server.name}</div>
                        {server.tools && server.tools.length > 0 && (
                          <div className="text-xs text-[var(--text-muted)] mt-1">
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
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--neon-amber)]" />
                Quick Start
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickStartSkills.map((skill) => (
                  <div
                    key={skill.name}
                    className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--neon-cyan)]/50 transition-all group"
                  >
                    <h4 className="font-medium text-[var(--text-primary)] mb-1">{skill.name}</h4>
                    <p className="text-sm text-[var(--text-muted)] mb-3">{skill.description}</p>
                    <button
                      onClick={() => createQuickStart(skill)}
                      className="text-sm text-[var(--neon-cyan)] hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Create Skill →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Skill Form */}
            <div className="p-6 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-default)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--neon-cyan)]" />
                Create Custom Skill
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="my-custom-skill"
                    className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">Description</label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="What does this skill do?"
                    className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-2">Prompt Context</label>
                  <textarea
                    value={createForm.prompt_context}
                    onChange={(e) => setCreateForm({ ...createForm, prompt_context: e.target.value })}
                    placeholder="Instructions to add to agent context..."
                    rows={6}
                    className="w-full bg-[var(--surface-tertiary)] border border-[var(--border-default)] rounded-lg px-4 py-2 text-[var(--text-primary)] resize-none"
                  />
                </div>
                <button
                  onClick={() => createMutation.mutate(createForm)}
                  disabled={createMutation.isPending || !createForm.name}
                  className="w-full py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--void)] font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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
            className="fixed inset-0 bg-[var(--void)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setDetailSkill(null); setShowSkillCode(false); setSkillCode(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{detailSkill.name}</h2>
                  {detailSkill.author && (
                    <p className="text-sm text-[var(--text-muted)]">by @{detailSkill.author}</p>
                  )}
                </div>
                <button
                  onClick={() => { setDetailSkill(null); setShowSkillCode(false); setSkillCode(''); }}
                  className="p-2 rounded-lg hover:bg-[var(--surface-secondary)]"
                >
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              <p className="text-[var(--text-secondary)] mb-6">{detailSkill.description}</p>

              <div className="flex flex-wrap gap-4 mb-6 text-sm text-[var(--text-muted)]">
                {detailSkill.version && (
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-4 h-4" />
                    v{detailSkill.version}
                  </span>
                )}
                {detailSkill.downloads !== undefined && (
                  <span className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {formatDownloads(detailSkill.downloads)} downloads
                  </span>
                )}
                {detailSkill.stars !== undefined && detailSkill.stars > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {detailSkill.stars} stars
                  </span>
                )}
              </div>

              {detailSkill.tags && detailSkill.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {detailSkill.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-lg bg-[var(--surface-secondary)] text-xs text-[var(--text-muted)]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* View Code */}
              {showSkillCode && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-[var(--text-secondary)]">Source Code</h4>
                    <button
                      onClick={() => viewSkillCode(detailSkill.slug)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      Hide
                    </button>
                  </div>
                  <pre className="p-4 rounded-lg bg-[var(--surface-secondary)] text-sm text-[var(--text-secondary)] overflow-x-auto max-h-64 overflow-y-auto">
                    <code>{skillCode}</code>
                  </pre>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => viewSkillCode(detailSkill.slug)}
                  className="flex-1 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] font-medium"
                >
                  {showSkillCode ? 'Hide Code' : 'View Code'}
                </button>
                <button
                  onClick={() => installFromClawHub(detailSkill.slug)}
                  disabled={installingSlug === detailSkill.slug || isSkillInstalled(detailSkill.slug)}
                  className={cn(
                    'flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2',
                    isSkillInstalled(detailSkill.slug)
                      ? 'bg-[var(--neon-green)]/10 text-[var(--neon-green)]'
                      : 'bg-[var(--neon-cyan)] text-[var(--void)]'
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
