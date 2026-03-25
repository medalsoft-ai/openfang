---
phase: 03-execution-engine
plan: 04
type: execute
wave: 4
depends_on: [03-03]
files_modified:
  - crates/openfang-api/src/ws.rs
  - crates/openfang-runtime/src/hand_executor.rs
  - crates/openfang-webui/src/components/flow/StepNode.tsx
  - crates/openfang-webui/src/pages/Hands.tsx
autonomous: true
requirements:
  - UI-04
must_haves:
  truths:
    - WebSocket broadcasts step status changes to connected clients
    - StepNode displays execution status with visual indicators
    - UI updates in real-time when step status changes
  artifacts:
    - path: "crates/openfang-api/src/ws.rs"
      provides: "WebSocket step status broadcast"
      contains: "step_status_change message type"
    - path: "crates/openfang-webui/src/components/flow/StepNode.tsx"
      provides: "Visual execution status indicator"
      contains: "status prop with pending/running/completed/failed/waiting styles"
  key_links:
    - from: "hand_executor.rs"
      to: "ws.rs"
      via: "broadcast channel for step status changes"
    - from: "ws.rs"
      to: "StepNode.tsx"
      via: "WebSocket message"
---

<objective>
Implement WebSocket real-time updates and UI status indicators.

Purpose: Push step execution status changes to the frontend in real-time and display visual indicators on the flow diagram.
Output: WebSocket broadcast + StepNode status visualization
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-execution-engine/03-CONTEXT.md
@.planning/phases/03-execution-engine/03-RESEARCH.md
@crates/openfang-api/src/ws.rs (existing WebSocket implementation)
@crates/openfang-runtime/src/hand_executor.rs (HandExecutor from Plan 03-02)
@crates/openfang-webui/src/components/flow/StepNode.tsx (existing StepNode component)
@crates/openfang-webui/src/pages/Hands.tsx (Hands page with WebSocket)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Step Status Broadcast to WebSocket</name>
  <files>crates/openfang-api/src/ws.rs, crates/openfang-runtime/src/hand_executor.rs</files>
  <read_first>
    - crates/openfang-api/src/ws.rs (agent_ws function, message types)
    - crates/openfang-runtime/src/hand_executor.rs (HandExecutor, status update methods)
    - .planning/phases/03-execution-engine/03-CONTEXT.md (Decision 3: WebSocket message format)
  </read_first>
  <action>
    Add broadcast mechanism for step status changes:

    In crates/openfang-runtime/src/hand_executor.rs, add broadcast channel:
    ```rust
    use tokio::sync::broadcast;

    /// Step status change event for broadcasting
    #[derive(Debug, Clone, serde::Serialize)]
    pub struct StepStatusChange {
        pub execution_id: String,
        pub hand_id: String,
        pub agent_id: String,
        pub step_id: String,
        pub status: String,
        pub timestamp: String,
        pub output: Option<serde_json::Value>,
    }

    pub struct HandExecutor {
        store: ExecutionStore,
        active_executions: RwLock<HashMap<String, ExecutionState>>,
        broadcast_tx: broadcast::Sender<StepStatusChange>,
    }

    impl HandExecutor {
        pub fn new(store: ExecutionStore) -> Self {
            let (broadcast_tx, _) = broadcast::channel(100);
            Self {
                store,
                active_executions: RwLock::new(HashMap::new()),
                broadcast_tx,
            }
        }

        pub fn subscribe(&self) -> broadcast::Receiver<StepStatusChange> {
            self.broadcast_tx.subscribe()
        }

        // In methods that update step status, broadcast the change:
        async fn broadcast_status_change(&self, change: StepStatusChange) {
            let _ = self.broadcast_tx.send(change);
        }
    }
    ```

    Update complete_step, fail_step, start_step to broadcast changes:
    ```rust
    // In complete_step, after updating store:
    self.broadcast_status_change(StepStatusChange {
        execution_id: execution_id.to_string(),
        hand_id: state.hand_id.clone(),
        agent_id: state.agent_id.clone(),
        step_id: step_id.to_string(),
        status: "completed".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        output: Some(output),
    }).await;
    ```

    In crates/openfang-api/src/ws.rs, add step status subscription:
    ```rust
    // In handle_agent_ws, after setting up agent message forwarding:
    // Subscribe to step status changes for this agent
    let mut status_rx = state.kernel.hand_executor.subscribe();
    let agent_id_clone = agent_id.clone();

    tokio::spawn(async move {
        while let Ok(change) = status_rx.recv().await {
            // Only forward if this status change is for our agent
            if change.agent_id == agent_id_clone.to_string() {
                let msg = serde_json::json!({
                    "type": "step_status_change",
                    "data": change,
                });
                let _ = send_json(&sender, &msg).await;
            }
        }
    });
    ```
  </action>
  <verify>
    <automated>cargo build --workspace --lib</automated>
  </verify>
  <acceptance_criteria>
    - hand_executor.rs contains StepStatusChange struct with fields: execution_id, hand_id, agent_id, step_id, status, timestamp, output
    - HandExecutor has broadcast_tx: broadcast::Sender<StepStatusChange>
    - HandExecutor::subscribe returns broadcast::Receiver<StepStatusChange>
    - complete_step broadcasts status change
    - fail_step broadcasts status change
    - start_step broadcasts status change
    - ws.rs spawns task to forward step_status_change messages to WebSocket clients
    - Build compiles without errors
  </acceptance_criteria>
  <done>WebSocket broadcasts step status changes to connected clients</done>
</task>

<task type="auto">
  <name>Task 2: Add Execution Status to StepNode Component</name>
  <files>crates/openfang-webui/src/components/flow/StepNode.tsx</files>
  <read_first>
    - crates/openfang-webui/src/components/flow/StepNode.tsx (current implementation)
    - crates/openfang-webui/src/api/types.ts (Step types)
  </read_first>
  <action>
    Update StepNode to display execution status:

    Add status prop and visual indicators:
    ```typescript
    interface StepNodeProps {
      id: string;
      data: {
        label: string;
        stepType: StepTypeVariant;
        status?: 'pending' | 'running' | 'completed' | 'failed' | 'waiting';
        isActive?: boolean;
      };
      selected?: boolean;
    }

    // Status color mapping
    const statusColors = {
      pending: { border: 'border-gray-300', bg: 'bg-gray-50', indicator: 'bg-gray-400' },
      running: { border: 'border-blue-500', bg: 'bg-blue-50', indicator: 'bg-blue-500 animate-pulse' },
      completed: { border: 'border-green-500', bg: 'bg-green-50', indicator: 'bg-green-500' },
      failed: { border: 'border-red-500', bg: 'bg-red-50', indicator: 'bg-red-500' },
      waiting: { border: 'border-yellow-500', bg: 'bg-yellow-50', indicator: 'bg-yellow-500 animate-bounce' },
    };

    // In the component render:
    const status = data.status || 'pending';
    const colors = statusColors[status];

    // Add status indicator to node:
    <div className={cn(
      "relative rounded-lg border-2 p-3 min-w-[150px]",
      colors.border,
      colors.bg,
      selected && "ring-2 ring-primary"
    )}>
      {/* Status indicator dot */}
      <div className={cn(
        "absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-white",
        colors.indicator
      )} />

      {/* Step type icon */}
      <div className="flex items-center gap-2 mb-2">
        {getStepIcon(data.stepType)}
        <span className="font-medium text-sm">{data.label}</span>
      </div>

      {/* Status label */}
      <div className="text-xs text-muted-foreground capitalize">
        {status}
      </div>
    </div>
    ```

    Add CSS animations for running (pulse) and waiting (bounce) states.
  </action>
  <verify>
    <automated>cd crates/openfang-webui && npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - StepNode.tsx has data.status prop with type 'pending' | 'running' | 'completed' | 'failed' | 'waiting'
    - statusColors mapping exists with all 5 statuses
    - Status indicator dot is rendered with correct color
    - Running status has animate-pulse class
    - Waiting status has animate-bounce class
    - TypeScript typecheck passes
  </acceptance_criteria>
  <done>StepNode displays execution status with visual indicators</done>
</task>

<task type="auto">
  <name>Task 3: Wire WebSocket to Hands Page</name>
  <files>crates/openfang-webui/src/pages/Hands.tsx</files>
  <read_first>
    - crates/openfang-webui/src/pages/Hands.tsx (existing WebSocket connection)
    - crates/openfang-webui/src/components/flow/FlowCanvas.tsx (if exists)
  </read_first>
  <action>
    Add WebSocket message handling for step status changes:

    In Hands.tsx, extend the WebSocket message handler:
    ```typescript
    // Add execution state tracking
    const [executionState, setExecutionState] = useState<{
      executionId?: string;
      stepStatuses: Record<string, 'pending' | 'running' | 'completed' | 'failed' | 'waiting'>;
    }>({ stepStatuses: {} });

    // In WebSocket onMessage handler:
    case 'step_status_change':
      const { step_id, status } = message.data;
      setExecutionState(prev => ({
        ...prev,
        stepStatuses: {
          ...prev.stepStatuses,
          [step_id]: status,
        },
      }));
      break;
    ```

    Pass execution status to FlowCanvas and StepNode:
    ```typescript
    // When rendering FlowCanvas:
    <FlowCanvas
      steps={steps}
      executionStatus={executionState.stepStatuses}
      // ... other props
    />
    ```

    Update the nodes creation to include status:
    ```typescript
    const nodes = steps.map(step => ({
      id: step.id,
      type: 'stepNode',
      data: {
        label: step.name,
        stepType: step.stepType,
        status: executionState.stepStatuses[step.id] || 'pending',
      },
      // ... position
    }));
    ```
  </action>
  <verify>
    <automated>cd crates/openfang-webui && npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - Hands.tsx has executionState with stepStatuses Record
    - WebSocket handler handles 'step_status_change' message type
    - setExecutionState updates step status when message received
    - FlowCanvas receives executionStatus prop
    - Nodes are created with status from executionState
    - TypeScript typecheck passes
  </acceptance_criteria>
  <done>Hands page receives and displays real-time execution status</done>
</task>

</tasks>

<verification>
- WebSocket broadcasts step status changes
- StepNode shows visual status indicators
- Hands page updates when status changes received
- Build passes: cargo build --workspace --lib
- TypeScript typecheck passes
</verification>

<success_criteria>
1. Step status changes are broadcast via WebSocket
2. StepNode displays status with color-coded indicators
3. Running steps show pulse animation
4. Waiting steps show bounce animation
5. UI updates in real-time without refresh
6. No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-engine/03-04-websocket-SUMMARY.md`
</output>
