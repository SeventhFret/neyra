use serde::Serialize;

#[derive(Debug, Clone)]
pub struct GitFlowContext {
    pub repository_root: String,
    pub current_branch: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum OutputStream {
    Stdout,
    Stderr,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum GitFlowStepOutcome {
    Success,
    Failed,
    TimedOut,
}

#[derive(Debug, Clone, Serialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum GitFlowEvent {
    FlowStarted {
        run_id: String,
    },

    StepStarted {
        run_id: String,
        step_id: String,
    },

    StepOutput {
        run_id: String,
        step_id: String,
        stream: OutputStream,
        chunk: String,
    },

    StepFinished {
        run_id: String,
        step_id: String,
        exit_code: Option<i32>,
        outcome: GitFlowStepOutcome,
    },

    StepSkipped {
        run_id: String,
        step_id: String,
    },

    FlowFinished {
        run_id: String,
        success: bool,
    },
}
