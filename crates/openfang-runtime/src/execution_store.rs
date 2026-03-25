//! SQLite storage for Hand execution state tracking.
//!
//! Provides CRUD operations for hand_executions and step_executions tables.

use chrono::{DateTime, Utc};
use openfang_types::error::{OpenFangError, OpenFangResult};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

/// Status of a Hand execution.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExecutionStatus {
    /// Execution is pending start.
    Pending,
    /// Execution is currently running.
    Running,
    /// Execution completed successfully.
    Completed,
    /// Execution failed.
    Failed,
}

impl ExecutionStatus {
    fn as_str(&self) -> &'static str {
        match self {
            ExecutionStatus::Pending => "pending",
            ExecutionStatus::Running => "running",
            ExecutionStatus::Completed => "completed",
            ExecutionStatus::Failed => "failed",
        }
    }

    fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(ExecutionStatus::Pending),
            "running" => Some(ExecutionStatus::Running),
            "completed" => Some(ExecutionStatus::Completed),
            "failed" => Some(ExecutionStatus::Failed),
            _ => None,
        }
    }
}

/// Status of a step execution.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum StepStatus {
    /// Step is pending execution.
    Pending,
    /// Step is currently running.
    Running,
    /// Step completed successfully.
    Completed,
    /// Step failed.
    Failed,
    /// Step is waiting for user input.
    Waiting,
    /// Step was skipped.
    Skipped,
}

impl StepStatus {
    fn as_str(&self) -> &'static str {
        match self {
            StepStatus::Pending => "pending",
            StepStatus::Running => "running",
            StepStatus::Completed => "completed",
            StepStatus::Failed => "failed",
            StepStatus::Waiting => "waiting",
            StepStatus::Skipped => "skipped",
        }
    }

    fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(StepStatus::Pending),
            "running" => Some(StepStatus::Running),
            "completed" => Some(StepStatus::Completed),
            "failed" => Some(StepStatus::Failed),
            "waiting" => Some(StepStatus::Waiting),
            "skipped" => Some(StepStatus::Skipped),
            _ => None,
        }
    }
}

/// Record of a Hand execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandExecutionRecord {
    pub id: String,
    pub hand_id: String,
    pub agent_id: String,
    pub status: ExecutionStatus,
    pub current_step_id: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Record of a step execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepExecutionRecord {
    pub id: String,
    pub execution_id: String,
    pub step_id: String,
    pub status: StepStatus,
    pub input: Option<serde_json::Value>,
    pub output: Option<serde_json::Value>,
    pub error: Option<String>,
    pub retry_count: i32,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Store for execution state persistence.
#[derive(Clone)]
pub struct ExecutionStore {
    conn: Arc<Mutex<Connection>>,
}

impl ExecutionStore {
    /// Create a new execution store wrapping the given connection.
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    /// Create a new hand execution record.
    pub async fn create_execution(&self, exec: &HandExecutionRecord) -> OpenFangResult<()> {
        let conn = Arc::clone(&self.conn);
        let exec = exec.clone();

        tokio::task::spawn_blocking(move || {
            let conn = conn
                .lock()
                .map_err(|e| OpenFangError::Internal(e.to_string()))?;

            let started_at_str = exec.started_at.map(|dt| dt.to_rfc3339());
            let completed_at_str = exec.completed_at.map(|dt| dt.to_rfc3339());

            conn.execute(
                "INSERT INTO hand_executions (id, hand_id, agent_id, status, current_step_id, started_at, completed_at, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![
                    exec.id,
                    exec.hand_id,
                    exec.agent_id,
                    exec.status.as_str(),
                    exec.current_step_id,
                    started_at_str,
                    completed_at_str,
                    exec.created_at.to_rfc3339(),
                ],
            )
            .map_err(|e| OpenFangError::Memory(e.to_string()))?;

            Ok(())
        })
        .await
        .map_err(|e| OpenFangError::Internal(e.to_string()))?
    }

    /// Get a hand execution by ID.
    pub async fn get_execution(&self, id: &str) -> OpenFangResult<Option<HandExecutionRecord>> {
        let conn = Arc::clone(&self.conn);
        let id = id.to_string();

        tokio::task::spawn_blocking(move || {
            let conn = conn
                .lock()
                .map_err(|e| OpenFangError::Internal(e.to_string()))?;

            let mut stmt = conn
                .prepare(
                    "SELECT id, hand_id, agent_id, status, current_step_id, started_at, completed_at, created_at
                     FROM hand_executions WHERE id = ?1",
                )
                .map_err(|e| OpenFangError::Memory(e.to_string()))?;

            let result = stmt.query_row(rusqlite::params![id], |row| {
                let status_str: String = row.get(3)?;
                let started_at_str: Option<String> = row.get(5)?;
                let completed_at_str: Option<String> = row.get(6)?;
                let created_at_str: String = row.get(7)?;

                Ok(HandExecutionRecord {
                    id: row.get(0)?,
                    hand_id: row.get(1)?,
                    agent_id: row.get(2)?,
                    status: ExecutionStatus::from_str(&status_str)
                        .unwrap_or(ExecutionStatus::Pending),
                    current_step_id: row.get(4)?,
                    started_at: started_at_str
                        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                        .map(|dt| dt.with_timezone(&Utc)),
                    completed_at: completed_at_str
                        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                        .map(|dt| dt.with_timezone(&Utc)),
                    created_at: DateTime::parse_from_rfc3339(&created_at_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                })
            });

            match result {
                Ok(record) => Ok(Some(record)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(OpenFangError::Memory(e.to_string())),
            }
        })
        .await
        .map_err(|e| OpenFangError::Internal(e.to_string()))?
    }

    /// Update execution status and current step.
    pub async fn update_execution_status(
        &self,
        id: &str,
        status: ExecutionStatus,
        current_step_id: Option<&str>,
    ) -> OpenFangResult<()> {
        let conn = Arc::clone(&self.conn);
        let id = id.to_string();
        let status_str = status.as_str().to_string();
        let current_step_id = current_step_id.map(|s| s.to_string());

        tokio::task::spawn_blocking(move || {
            let conn = conn
                .lock()
                .map_err(|e| OpenFangError::Internal(e.to_string()))?;

            let completed_at = if status_str == "completed" || status_str == "failed" {
                Some(Utc::now().to_rfc3339())
            } else {
                None
            };

            conn.execute(
                "UPDATE hand_executions SET status = ?1, current_step_id = ?2, completed_at = ?3 WHERE id = ?4",
                rusqlite::params![status_str, current_step_id, completed_at, id],
            )
            .map_err(|e| OpenFangError::Memory(e.to_string()))?;

            Ok(())
        })
        .await
        .map_err(|e| OpenFangError::Internal(e.to_string()))?
    }

    /// Create a new step execution record.
    pub async fn create_step_execution(&self, step: &StepExecutionRecord) -> OpenFangResult<()> {
        let conn = Arc::clone(&self.conn);
        let step = step.clone();

        tokio::task::spawn_blocking(move || {
            let conn = conn
                .lock()
                .map_err(|e| OpenFangError::Internal(e.to_string()))?;

            let input_str = step.input.map(|v| v.to_string());
            let output_str = step.output.map(|v| v.to_string());
            let started_at_str = step.started_at.map(|dt| dt.to_rfc3339());
            let completed_at_str = step.completed_at.map(|dt| dt.to_rfc3339());

            conn.execute(
                "INSERT INTO step_executions (id, execution_id, step_id, status, input, output, error, retry_count, started_at, completed_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                rusqlite::params![
                    step.id,
                    step.execution_id,
                    step.step_id,
                    step.status.as_str(),
                    input_str,
                    output_str,
                    step.error,
                    step.retry_count,
                    started_at_str,
                    completed_at_str,
                ],
            )
            .map_err(|e| OpenFangError::Memory(e.to_string()))?;

            Ok(())
        })
        .await
        .map_err(|e| OpenFangError::Internal(e.to_string()))?
    }

    /// Update step status, output, and error.
    pub async fn update_step_status(
        &self,
        id: &str,
        status: StepStatus,
        output: Option<serde_json::Value>,
        error: Option<String>,
    ) -> OpenFangResult<()> {
        let conn = Arc::clone(&self.conn);
        let id = id.to_string();
        let status_str = status.as_str().to_string();
        let output_str = output.map(|v| v.to_string());

        tokio::task::spawn_blocking(move || {
            let conn = conn
                .lock()
                .map_err(|e| OpenFangError::Internal(e.to_string()))?;

            let completed_at = if status_str == "completed" || status_str == "failed" || status_str == "skipped" {
                Some(Utc::now().to_rfc3339())
            } else {
                None
            };

            conn.execute(
                "UPDATE step_executions SET status = ?1, output = ?2, error = ?3, completed_at = ?4 WHERE id = ?5",
                rusqlite::params![status_str, output_str, error, completed_at, id],
            )
            .map_err(|e| OpenFangError::Memory(e.to_string()))?;

            Ok(())
        })
        .await
        .map_err(|e| OpenFangError::Internal(e.to_string()))?
    }

    /// List all executions for a given hand_id.
    pub async fn list_executions_for_hand(
        &self,
        hand_id: &str,
    ) -> OpenFangResult<Vec<HandExecutionRecord>> {
        let conn = Arc::clone(&self.conn);
        let hand_id = hand_id.to_string();

        tokio::task::spawn_blocking(move || {
            let conn = conn
                .lock()
                .map_err(|e| OpenFangError::Internal(e.to_string()))?;

            let mut stmt = conn
                .prepare(
                    "SELECT id, hand_id, agent_id, status, current_step_id, started_at, completed_at, created_at
                     FROM hand_executions WHERE hand_id = ?1 ORDER BY created_at DESC",
                )
                .map_err(|e| OpenFangError::Memory(e.to_string()))?;

            let rows = stmt
                .query_map(rusqlite::params![hand_id], |row| {
                    let status_str: String = row.get(3)?;
                    let started_at_str: Option<String> = row.get(5)?;
                    let completed_at_str: Option<String> = row.get(6)?;
                    let created_at_str: String = row.get(7)?;

                    Ok(HandExecutionRecord {
                        id: row.get(0)?,
                        hand_id: row.get(1)?,
                        agent_id: row.get(2)?,
                        status: ExecutionStatus::from_str(&status_str)
                            .unwrap_or(ExecutionStatus::Pending),
                        current_step_id: row.get(4)?,
                        started_at: started_at_str
                            .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                            .map(|dt| dt.with_timezone(&Utc)),
                        completed_at: completed_at_str
                            .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                            .map(|dt| dt.with_timezone(&Utc)),
                        created_at: DateTime::parse_from_rfc3339(&created_at_str)
                            .map(|dt| dt.with_timezone(&Utc))
                            .unwrap_or_else(|_| Utc::now()),
                    })
                })
                .map_err(|e| OpenFangError::Memory(e.to_string()))?;

            let mut records = Vec::new();
            for row in rows {
                records.push(row.map_err(|e| OpenFangError::Memory(e.to_string()))?);
            }

            Ok(records)
        })
        .await
        .map_err(|e| OpenFangError::Internal(e.to_string()))?
    }

    /// Get a step execution by execution_id and step_id.
    pub async fn get_step_execution(
        &self,
        execution_id: &str,
        step_id: &str,
    ) -> OpenFangResult<Option<StepExecutionRecord>> {
        let conn = Arc::clone(&self.conn);
        let execution_id = execution_id.to_string();
        let step_id = step_id.to_string();

        tokio::task::spawn_blocking(move || {
            let conn = conn
                .lock()
                .map_err(|e| OpenFangError::Internal(e.to_string()))?;

            let mut stmt = conn
                .prepare(
                    "SELECT id, execution_id, step_id, status, input, output, error, retry_count, started_at, completed_at
                     FROM step_executions WHERE execution_id = ?1 AND step_id = ?2",
                )
                .map_err(|e| OpenFangError::Memory(e.to_string()))?;

            let result = stmt.query_row(rusqlite::params![execution_id, step_id], |row| {
                let status_str: String = row.get(3)?;
                let input_str: Option<String> = row.get(4)?;
                let output_str: Option<String> = row.get(5)?;
                let started_at_str: Option<String> = row.get(8)?;
                let completed_at_str: Option<String> = row.get(9)?;

                Ok(StepExecutionRecord {
                    id: row.get(0)?,
                    execution_id: row.get(1)?,
                    step_id: row.get(2)?,
                    status: StepStatus::from_str(&status_str).unwrap_or(StepStatus::Pending),
                    input: input_str.and_then(|s| serde_json::from_str(&s).ok()),
                    output: output_str.and_then(|s| serde_json::from_str(&s).ok()),
                    error: row.get(6)?,
                    retry_count: row.get(7)?,
                    started_at: started_at_str
                        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                        .map(|dt| dt.with_timezone(&Utc)),
                    completed_at: completed_at_str
                        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                        .map(|dt| dt.with_timezone(&Utc)),
                })
            });

            match result {
                Ok(record) => Ok(Some(record)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(OpenFangError::Memory(e.to_string())),
            }
        })
        .await
        .map_err(|e| OpenFangError::Internal(e.to_string()))?
    }

    /// Get all step executions for a given execution_id.
    pub async fn get_steps_for_execution(
        &self,
        execution_id: &str,
    ) -> OpenFangResult<Vec<StepExecutionRecord>> {
        let conn = Arc::clone(&self.conn);
        let execution_id = execution_id.to_string();

        tokio::task::spawn_blocking(move || {
            let conn = conn
                .lock()
                .map_err(|e| OpenFangError::Internal(e.to_string()))?;

            let mut stmt = conn
                .prepare(
                    "SELECT id, execution_id, step_id, status, input, output, error, retry_count, started_at, completed_at
                     FROM step_executions WHERE execution_id = ?1 ORDER BY step_id ASC",
                )
                .map_err(|e| OpenFangError::Memory(e.to_string()))?;

            let rows = stmt
                .query_map(rusqlite::params![execution_id], |row| {
                    let status_str: String = row.get(3)?;
                    let input_str: Option<String> = row.get(4)?;
                    let output_str: Option<String> = row.get(5)?;
                    let started_at_str: Option<String> = row.get(8)?;
                    let completed_at_str: Option<String> = row.get(9)?;

                    Ok(StepExecutionRecord {
                        id: row.get(0)?,
                        execution_id: row.get(1)?,
                        step_id: row.get(2)?,
                        status: StepStatus::from_str(&status_str).unwrap_or(StepStatus::Pending),
                        input: input_str.and_then(|s| serde_json::from_str(&s).ok()),
                        output: output_str.and_then(|s| serde_json::from_str(&s).ok()),
                        error: row.get(6)?,
                        retry_count: row.get(7)?,
                        started_at: started_at_str
                            .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                            .map(|dt| dt.with_timezone(&Utc)),
                        completed_at: completed_at_str
                            .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                            .map(|dt| dt.with_timezone(&Utc)),
                    })
                })
                .map_err(|e| OpenFangError::Memory(e.to_string()))?;

            let mut records = Vec::new();
            for row in rows {
                records.push(row.map_err(|e| OpenFangError::Memory(e.to_string()))?);
            }

            Ok(records)
        })
        .await
        .map_err(|e| OpenFangError::Internal(e.to_string()))?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use openfang_memory::migration::run_migrations;

    fn setup() -> ExecutionStore {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        ExecutionStore::new(Arc::new(Mutex::new(conn)))
    }

    #[tokio::test]
    async fn test_execution_store_new() {
        let _store = setup();
        // Just verify it doesn't panic by creating the store
    }

    #[tokio::test]
    async fn test_create_and_get_execution() {
        let store = setup();

        let exec = HandExecutionRecord {
            id: "exec-1".to_string(),
            hand_id: "hand-1".to_string(),
            agent_id: "agent-1".to_string(),
            status: ExecutionStatus::Pending,
            current_step_id: None,
            started_at: None,
            completed_at: None,
            created_at: Utc::now(),
        };

        store.create_execution(&exec).await.unwrap();

        let retrieved = store.get_execution("exec-1").await.unwrap();
        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, "exec-1");
        assert_eq!(retrieved.hand_id, "hand-1");
        assert_eq!(retrieved.agent_id, "agent-1");
        assert_eq!(retrieved.status, ExecutionStatus::Pending);
    }

    #[tokio::test]
    async fn test_update_execution_status() {
        let store = setup();

        let exec = HandExecutionRecord {
            id: "exec-1".to_string(),
            hand_id: "hand-1".to_string(),
            agent_id: "agent-1".to_string(),
            status: ExecutionStatus::Pending,
            current_step_id: None,
            started_at: None,
            completed_at: None,
            created_at: Utc::now(),
        };

        store.create_execution(&exec).await.unwrap();
        store
            .update_execution_status("exec-1", ExecutionStatus::Running, Some("step-1"))
            .await
            .unwrap();

        let retrieved = store.get_execution("exec-1").await.unwrap().unwrap();
        assert_eq!(retrieved.status, ExecutionStatus::Running);
        assert_eq!(retrieved.current_step_id, Some("step-1".to_string()));
    }

    #[tokio::test]
    async fn test_create_and_get_step_execution() {
        let store = setup();

        // First create the parent execution
        let exec = HandExecutionRecord {
            id: "exec-1".to_string(),
            hand_id: "hand-1".to_string(),
            agent_id: "agent-1".to_string(),
            status: ExecutionStatus::Pending,
            current_step_id: None,
            started_at: None,
            completed_at: None,
            created_at: Utc::now(),
        };
        store.create_execution(&exec).await.unwrap();

        let step = StepExecutionRecord {
            id: "step-exec-1".to_string(),
            execution_id: "exec-1".to_string(),
            step_id: "step-1".to_string(),
            status: StepStatus::Pending,
            input: Some(serde_json::json!({"key": "value"})),
            output: None,
            error: None,
            retry_count: 0,
            started_at: None,
            completed_at: None,
        };

        store.create_step_execution(&step).await.unwrap();

        let retrieved = store
            .get_step_execution("exec-1", "step-1")
            .await
            .unwrap();
        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, "step-exec-1");
        assert_eq!(retrieved.execution_id, "exec-1");
        assert_eq!(retrieved.step_id, "step-1");
        assert_eq!(retrieved.status, StepStatus::Pending);
        assert_eq!(retrieved.input, Some(serde_json::json!({"key": "value"})));
    }

    #[tokio::test]
    async fn test_update_step_status() {
        let store = setup();

        // Create parent execution
        let exec = HandExecutionRecord {
            id: "exec-1".to_string(),
            hand_id: "hand-1".to_string(),
            agent_id: "agent-1".to_string(),
            status: ExecutionStatus::Pending,
            current_step_id: None,
            started_at: None,
            completed_at: None,
            created_at: Utc::now(),
        };
        store.create_execution(&exec).await.unwrap();

        let step = StepExecutionRecord {
            id: "step-exec-1".to_string(),
            execution_id: "exec-1".to_string(),
            step_id: "step-1".to_string(),
            status: StepStatus::Pending,
            input: None,
            output: None,
            error: None,
            retry_count: 0,
            started_at: None,
            completed_at: None,
        };
        store.create_step_execution(&step).await.unwrap();

        store
            .update_step_status(
                "step-exec-1",
                StepStatus::Completed,
                Some(serde_json::json!({"result": "success"})),
                None,
            )
            .await
            .unwrap();

        let retrieved = store
            .get_step_execution("exec-1", "step-1")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(retrieved.status, StepStatus::Completed);
        assert_eq!(
            retrieved.output,
            Some(serde_json::json!({"result": "success"}))
        );
    }

    #[tokio::test]
    async fn test_list_executions_for_hand() {
        let store = setup();

        let exec1 = HandExecutionRecord {
            id: "exec-1".to_string(),
            hand_id: "hand-1".to_string(),
            agent_id: "agent-1".to_string(),
            status: ExecutionStatus::Completed,
            current_step_id: None,
            started_at: None,
            completed_at: None,
            created_at: Utc::now(),
        };

        let exec2 = HandExecutionRecord {
            id: "exec-2".to_string(),
            hand_id: "hand-1".to_string(),
            agent_id: "agent-1".to_string(),
            status: ExecutionStatus::Running,
            current_step_id: Some("step-1".to_string()),
            started_at: None,
            completed_at: None,
            created_at: Utc::now(),
        };

        let exec3 = HandExecutionRecord {
            id: "exec-3".to_string(),
            hand_id: "hand-2".to_string(),
            agent_id: "agent-2".to_string(),
            status: ExecutionStatus::Pending,
            current_step_id: None,
            started_at: None,
            completed_at: None,
            created_at: Utc::now(),
        };

        store.create_execution(&exec1).await.unwrap();
        store.create_execution(&exec2).await.unwrap();
        store.create_execution(&exec3).await.unwrap();

        let hand1_execs = store.list_executions_for_hand("hand-1").await.unwrap();
        assert_eq!(hand1_execs.len(), 2);

        let hand2_execs = store.list_executions_for_hand("hand-2").await.unwrap();
        assert_eq!(hand2_execs.len(), 1);
        assert_eq!(hand2_execs[0].id, "exec-3");
    }

    #[tokio::test]
    async fn test_get_steps_for_execution() {
        let store = setup();

        // Create parent execution
        let exec = HandExecutionRecord {
            id: "exec-1".to_string(),
            hand_id: "hand-1".to_string(),
            agent_id: "agent-1".to_string(),
            status: ExecutionStatus::Pending,
            current_step_id: None,
            started_at: None,
            completed_at: None,
            created_at: Utc::now(),
        };
        store.create_execution(&exec).await.unwrap();

        let step1 = StepExecutionRecord {
            id: "step-exec-1".to_string(),
            execution_id: "exec-1".to_string(),
            step_id: "step-1".to_string(),
            status: StepStatus::Completed,
            input: None,
            output: Some(serde_json::json!({"result": 1})),
            error: None,
            retry_count: 0,
            started_at: None,
            completed_at: None,
        };

        let step2 = StepExecutionRecord {
            id: "step-exec-2".to_string(),
            execution_id: "exec-1".to_string(),
            step_id: "step-2".to_string(),
            status: StepStatus::Running,
            input: None,
            output: None,
            error: None,
            retry_count: 0,
            started_at: None,
            completed_at: None,
        };

        store.create_step_execution(&step1).await.unwrap();
        store.create_step_execution(&step2).await.unwrap();

        let steps = store.get_steps_for_execution("exec-1").await.unwrap();
        assert_eq!(steps.len(), 2);
    }

    #[tokio::test]
    async fn test_get_nonexistent_execution() {
        let store = setup();

        let result = store.get_execution("nonexistent").await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_step_status_variants() {
        let store = setup();

        // Create parent execution
        let exec = HandExecutionRecord {
            id: "exec-1".to_string(),
            hand_id: "hand-1".to_string(),
            agent_id: "agent-1".to_string(),
            status: ExecutionStatus::Pending,
            current_step_id: None,
            started_at: None,
            completed_at: None,
            created_at: Utc::now(),
        };
        store.create_execution(&exec).await.unwrap();

        // Test all step statuses
        let statuses = [
            StepStatus::Pending,
            StepStatus::Running,
            StepStatus::Completed,
            StepStatus::Failed,
            StepStatus::Waiting,
            StepStatus::Skipped,
        ];

        for (i, status) in statuses.iter().enumerate() {
            let step = StepExecutionRecord {
                id: format!("step-exec-{}", i),
                execution_id: "exec-1".to_string(),
                step_id: format!("step-{}", i),
                status: status.clone(),
                input: None,
                output: None,
                error: None,
                retry_count: 0,
                started_at: None,
                completed_at: None,
            };
            store.create_step_execution(&step).await.unwrap();

            let retrieved = store
                .get_step_execution("exec-1", &format!("step-{}", i))
                .await
                .unwrap()
                .unwrap();
            assert_eq!(&retrieved.status, status);
        }
    }
}
