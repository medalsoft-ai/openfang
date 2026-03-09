import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api/client';
import { Plus, Loader2, Play, History, X, GitBranch } from 'lucide-react';

interface WorkflowStep {
  name: string;
  agent_name: string;
  mode: 'sequential' | 'fan_out' | 'conditional' | 'loop';
  prompt: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[] | number;
  created_at: string;
}

interface WorkflowRun {
  id: string;
  workflow_id: string;
  input: string;
  output: string;
  status: string;
  created_at: string;
}

export function Workflows() {
  const [activeTab, setActiveTab] = useState<'list' | 'builder'>('list');
  const queryClient = useQueryClient();

  // Create workflow modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWf, setNewWf] = useState({
    name: '',
    description: '',
    steps: [{ name: '', agent_name: '', mode: 'sequential' as const, prompt: '{{input}}' }],
  });

  // Run workflow modal state
  const [runModal, setRunModal] = useState<Workflow | null>(null);
  const [runInput, setRunInput] = useState('');
  const [runResult, setRunResult] = useState('');

  // History modal state
  const [historyModal, setHistoryModal] = useState<Workflow | null>(null);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);

  const { data: workflows = [], isLoading, error } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: () => api.get('/api/workflows'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; steps: WorkflowStep[] }) =>
      api.post('/api/workflows', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setShowCreateModal(false);
      setNewWf({
        name: '',
        description: '',
        steps: [{ name: '', agent_name: '', mode: 'sequential', prompt: '{{input}}' }],
      });
    },
  });

  const runMutation = useMutation<unknown, Error, { id: string; input: string }>({
    mutationFn: ({ id, input }: { id: string; input: string }) =>
      api.post(`/api/workflows/${id}/run`, { input }),
    onSuccess: (data) => {
      const result = data as { output?: string };
      setRunResult(result.output || JSON.stringify(data, null, 2));
    },
    onError: (err: Error) => {
      setRunResult('Error: ' + err.message);
    },
  });

  const handleCreateWorkflow = () => {
    const steps = newWf.steps.map((s) => ({
      name: s.name || 'step',
      agent_name: s.agent_name,
      mode: s.mode,
      prompt: s.prompt || '{{input}}',
    }));
    createMutation.mutate({
      name: newWf.name,
      description: newWf.description,
      steps,
    });
  };

  const handleRunWorkflow = () => {
    if (!runModal) return;
    setRunResult('');
    runMutation.mutate({ id: runModal.id, input: runInput });
  };

  const handleViewRuns = async (wf: Workflow) => {
    try {
      const runs = await api.get<WorkflowRun[]>(`/api/workflows/${wf.id}/runs`);
      setWorkflowRuns(runs);
      setHistoryModal(wf);
    } catch {
      // Error handled silently
    }
  };

  const addStep = () => {
    setNewWf((prev) => ({
      ...prev,
      steps: [...prev.steps, { name: '', agent_name: '', mode: 'sequential', prompt: '{{input}}' }],
    }));
  };

  const removeStep = (index: number) => {
    setNewWf((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const updateStep = (index: number, field: keyof WorkflowStep, value: string) => {
    setNewWf((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    }));
  };

  const getStepsCount = (wf: Workflow) => {
    if (Array.isArray(wf.steps)) {
      return wf.steps.length + ' step' + (wf.steps.length !== 1 ? 's' : '');
    }
    return String(wf.steps);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12 text-destructive">
            <p>Failed to load workflows</p>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['workflows'] })}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Workflows</h1>
            <p className="text-muted-foreground">Manage and run automated workflows</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('list')}
            >
              List
            </Button>
            <Button
              variant={activeTab === 'builder' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => window.location.hash = '#/workflows/builder'}
            >
              Visual Builder
            </Button>
          </div>
        </div>

        {activeTab === 'list' && (
          <>
            {/* Info Card */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <div className="font-semibold text-sm mb-1">What are Workflows?</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  Workflows chain multiple agents into automated pipelines. Each step runs an agent with a prompt template,
                  passing output from one step as input to the next. Steps can run sequentially, fan out in parallel, loop, or branch conditionally.
                  <br />
                  <span className="mt-1 inline-block">
                    Try the{' '}
                    <button
                      className="text-primary font-semibold hover:underline"
                      onClick={() => window.location.hash = '#/workflows/builder'}
                    >
                      Visual Builder
                    </button>{' '}
                    to drag and drop workflow steps.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Workflow
              </Button>
            </div>

            {/* Workflows Table */}
            {workflows.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Name</th>
                        <th className="text-left p-4 font-medium">Steps</th>
                        <th className="text-left p-4 font-medium">Created</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workflows.map((wf) => (
                        <tr key={wf.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4">
                            <div className="font-semibold">{wf.name}</div>
                            <div className="text-xs text-muted-foreground">{wf.description}</div>
                          </td>
                          <td className="p-4">{getStepsCount(wf)}</td>
                          <td className="p-4 text-xs">{new Date(wf.created_at).toLocaleDateString()}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setRunModal(wf);
                                  setRunInput('');
                                  setRunResult('');
                                }}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Run
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewRuns(wf)}
                              >
                                <History className="h-3 w-3 mr-1" />
                                History
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <GitBranch className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
                <p className="text-muted-foreground mb-4">
                  Chain multiple agents into automated pipelines with branching, fan-out, and loops.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>Create Workflow</Button>
              </div>
            )}
          </>
        )}

        {/* Create Workflow Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newWf.name}
                  onChange={(e) => setNewWf((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="my-workflow"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newWf.description}
                  onChange={(e) => setNewWf((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this workflow do?"
                />
              </div>
              <div className="space-y-2">
                <Label>Steps</Label>
                <p className="text-xs text-muted-foreground">
                  Each step runs an agent. Use <code className="text-primary">{'{{input}}'}</code> in prompts to pass the previous step&apos;s output.
                </p>
                <div className="space-y-3">
                  {newWf.steps.map((step, i) => (
                    <Card key={i} className="p-3">
                      <div className="flex gap-2 items-center mb-2">
                        <span className="text-xs text-muted-foreground font-bold w-6">#{i + 1}</span>
                        <Input
                          value={step.name}
                          onChange={(e) => updateStep(i, 'name', e.target.value)}
                          placeholder="Step name"
                          className="flex-1"
                        />
                        <Input
                          value={step.agent_name}
                          onChange={(e) => updateStep(i, 'agent_name', e.target.value)}
                          placeholder="Agent name"
                          className="flex-1"
                        />
                        <Select
                          value={step.mode}
                          onValueChange={(v) => updateStep(i, 'mode', v)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sequential">Sequential</SelectItem>
                            <SelectItem value="fan_out">Fan Out</SelectItem>
                            <SelectItem value="conditional">Conditional</SelectItem>
                            <SelectItem value="loop">Loop</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeStep(i)}
                          disabled={newWf.steps.length === 1}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        value={step.prompt}
                        onChange={(e) => updateStep(i, 'prompt', e.target.value)}
                        placeholder="Prompt template (use {{input}})"
                      />
                    </Card>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Step
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateWorkflow}
                disabled={!newWf.name || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Run Workflow Modal */}
        <Dialog open={!!runModal} onOpenChange={(open) => !open && setRunModal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Run: {runModal?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Input</Label>
                <Textarea
                  value={runInput}
                  onChange={(e) => setRunInput(e.target.value)}
                  placeholder="Enter workflow input..."
                  rows={4}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleRunWorkflow}
                disabled={runMutation.isPending}
              >
                {runMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute
                  </>
                )}
              </Button>
              {runResult && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Result</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{runResult}</pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* History Modal */}
        <Dialog open={!!historyModal} onOpenChange={(open) => !open && setHistoryModal(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Run History: {historyModal?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {workflowRuns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No runs yet</p>
              ) : (
                <div className="space-y-3">
                  {workflowRuns.map((run) => (
                    <Card key={run.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={run.status === 'completed' ? 'default' : 'secondary'}>
                          {run.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(run.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-semibold">Input:</span>
                          <p className="text-sm text-muted-foreground truncate">{run.input || '(empty)'}</p>
                        </div>
                        <div>
                          <span className="text-xs font-semibold">Output:</span>
                          <pre className="text-xs whitespace-pre-wrap text-muted-foreground mt-1 max-h-32 overflow-y-auto">
                            {run.output || '(no output)'}
                          </pre>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default Workflows;
