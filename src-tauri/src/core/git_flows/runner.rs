use std::{process::Stdio, time::Duration};

use tauri::{AppHandle, Emitter};
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, BufReader},
    process::Command,
    time::timeout,
};

use crate::core::{
    config::models::{GitFlow, GitFlowStep},
    git::models::{Remote, RepoData},
    git_flows::models::GitFlowInput,
};

use super::{
    arguments::resolve_arguments,
    models::{GitFlowContext, GitFlowEvent, GitFlowStepOutcome, OutputStream},
};

const GIT_FLOW_EVENT: &str = "git-flow-event";
const DEFAULT_STEP_TIMEOUT: Duration = Duration::from_secs(5 * 60);

pub async fn run(
    app: &AppHandle,
    run_id: String,
    flow: GitFlow,
    context: GitFlowContext,
) -> Result<(), String> {
    emit(
        app,
        GitFlowEvent::FlowStarted {
            run_id: run_id.clone(),
        },
    )?;

    let mut flow_success = true;

    for (index, step) in flow.steps.iter().enumerate() {
        let succeeded = run_step(app, &run_id, step, &context).await?;

        if succeeded {
            continue;
        }

        flow_success = false;

        if step.stop_on_failure {
            for skipped_step in flow.steps.iter().skip(index + 1) {
                emit(
                    app,
                    GitFlowEvent::StepSkipped {
                        run_id: run_id.clone(),
                        step_id: skipped_step.id.clone(),
                    },
                )?;
            }

            break;
        }
    }

    emit(
        app,
        GitFlowEvent::FlowFinished {
            run_id,
            success: flow_success,
        },
    )?;

    Ok(())
}

async fn run_step(
    app: &AppHandle,
    run_id: &str,
    step: &GitFlowStep,
    context: &GitFlowContext,
) -> Result<bool, String> {
    let args = resolve_arguments(&step.args, context)?;

    emit(
        app,
        GitFlowEvent::StepStarted {
            run_id: run_id.to_owned(),
            step_id: step.id.clone(),
        },
    )?;

    let mut child = match Command::new("git")
        .args(&args)
        .current_dir(&context.repository_root)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,

        Err(error) => {
            let message = format!("Failed to start Git: {error}");

            emit_error(app, run_id, &step.id, &message)?;

            emit(
                app,
                GitFlowEvent::StepFinished {
                    run_id: run_id.to_owned(),
                    step_id: step.id.clone(),
                    exit_code: None,
                    outcome: GitFlowStepOutcome::Failed,
                },
            )?;

            return Ok(false);
        }
    };

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture Git stdout".to_owned())?;

    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture Git stderr".to_owned())?;

    let stdout_task = tokio::spawn(stream_output(
        app.clone(),
        run_id.to_owned(),
        step.id.clone(),
        OutputStream::Stdout,
        stdout,
    ));

    let stderr_task = tokio::spawn(stream_output(
        app.clone(),
        run_id.to_owned(),
        step.id.clone(),
        OutputStream::Stderr,
        stderr,
    ));

    let wait_result = timeout(DEFAULT_STEP_TIMEOUT, child.wait()).await;

    let (exit_code, outcome) = match wait_result {
        Ok(Ok(status)) => {
            let exit_code = status.code();

            let outcome = if status.success() {
                GitFlowStepOutcome::Success
            } else {
                GitFlowStepOutcome::Failed
            };

            (exit_code, outcome)
        }

        Ok(Err(error)) => {
            emit_error(
                app,
                run_id,
                &step.id,
                &format!("Failed while waiting for Git: {error}"),
            )?;

            (None, GitFlowStepOutcome::Failed)
        }

        Err(_) => {
            emit_error(app, run_id, &step.id, "Git command timed out")?;

            if let Err(error) = child.kill().await {
                emit_error(
                    app,
                    run_id,
                    &step.id,
                    &format!("Failed to terminate Git process: {error}"),
                )?;
            }

            // Reap the process after killing it.
            let _ = child.wait().await;

            (None, GitFlowStepOutcome::TimedOut)
        }
    };

    wait_for_stream(stdout_task).await?;
    wait_for_stream(stderr_task).await?;

    let succeeded = matches!(outcome, GitFlowStepOutcome::Success);

    emit(
        app,
        GitFlowEvent::StepFinished {
            run_id: run_id.to_owned(),
            step_id: step.id.clone(),
            exit_code,
            outcome,
        },
    )?;

    Ok(succeeded)
}

async fn stream_output<R>(
    app: AppHandle,
    run_id: String,
    step_id: String,
    stream: OutputStream,
    reader: R,
) -> Result<(), String>
where
    R: AsyncRead + Unpin,
{
    let mut lines = BufReader::new(reader).lines();

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|error| format!("Failed to read Git output: {error}"))?
    {
        emit(
            &app,
            GitFlowEvent::StepOutput {
                run_id: run_id.clone(),
                step_id: step_id.clone(),
                stream: stream.clone(),
                chunk: format!("{line}\n"),
            },
        )?;
    }

    Ok(())
}

async fn wait_for_stream(task: tokio::task::JoinHandle<Result<(), String>>) -> Result<(), String> {
    task.await
        .map_err(|error| format!("Git output task failed: {error}"))?
}

pub fn emit(app: &AppHandle, event: GitFlowEvent) -> Result<(), String> {
    app.emit(GIT_FLOW_EVENT, event)
        .map_err(|error| format!("Failed to emit Git flow event: {error}"))
}

fn emit_error(app: &AppHandle, run_id: &str, step_id: &str, message: &str) -> Result<(), String> {
    emit(
        app,
        GitFlowEvent::StepOutput {
            run_id: run_id.to_owned(),
            step_id: step_id.to_owned(),
            stream: OutputStream::Stderr,
            chunk: format!("{message}\n"),
        },
    )
}

fn preferred_remote(repo_data: &RepoData) -> Option<&Remote> {
    if let Some(upstream) = &repo_data.upstream {
        if let Some(remote) = repo_data
            .remotes
            .iter()
            .find(|remote| remote.name == upstream.remote)
        {
            return Some(remote);
        }
    }

    if let Some(remote) = repo_data
        .remotes
        .iter()
        .find(|remote| remote.name == "origin")
    {
        return Some(remote);
    }

    if repo_data.remotes.len() == 1 {
        return repo_data.remotes.first();
    }

    None
}

pub fn prepare_git_flow_context(repo_data: &RepoData, input: GitFlowInput) -> GitFlowContext {
    let remote = input
        .remote
        .as_deref()
        .and_then(|name| repo_data.remotes.iter().find(|r| r.name == name))
        .or_else(|| preferred_remote(repo_data));

    let default_branch = input
        .default_branch
        .clone()
        .or_else(|| remote.and_then(|r| r.default_branch.clone()));

    GitFlowContext {
        repository_root: repo_data.root.clone(),
        current_branch: repo_data.current_branch.clone(),
        remote: remote.map(|r| r.name.clone()),
        variables: input.variables,
        default_branch,
    }
}
