//! Hand execution coordinator - simplified version.
//!
//! Only provides StepStatusChange for WebSocket broadcasting.
//! Hand execution is now handled via Session mechanism.

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
