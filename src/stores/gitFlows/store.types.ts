export interface GitFlowStep {
  id: string;
  name: string;
  args: string[];
  stopOnFailure: boolean;
}

export interface GitFlow {
  id: string;
  name: string;
  description: string | null;
  steps: GitFlowStep[];
}

export interface GitFlowInput {
  remote: string | null;
  defaultBranch: string | null;
  variables: Record<string, string>;
}

export type GitFlowStepStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "timedOut"
  | "skipped";

export type GitFlowStepOutcome = "success" | "failed" | "timedOut";

export type OutputStream = "stdout" | "stderr";

export interface GitFlowStepRun {
  stepId: string;

  status: GitFlowStepStatus;

  exitCode: number | null;

  stdout: string;
  stderr: string;

  startedAt: number | null;
  finishedAt: number | null;
}

export interface GitFlowRun {
  id: string;
  flowId: string;

  steps: GitFlowStepRun[];

  isRunning: boolean;
  success: boolean | null;

  startedAt: number | null;
  finishedAt: number | null;
}

export type GitFlowEvent =
  | {
      type: "flowStarted";
      runId: string;
    }
  | {
      type: "stepStarted";
      runId: string;
      stepId: string;
    }
  | {
      type: "stepOutput";
      runId: string;
      stepId: string;
      stream: OutputStream;
      chunk: string;
    }
  | {
      type: "stepFinished";
      runId: string;
      stepId: string;
      exitCode: number | null;
      outcome: GitFlowStepOutcome;
    }
  | {
      type: "stepSkipped";
      runId: string;
      stepId: string;
    }
  | {
      type: "flowFailed";
      runId: string;
      error: string;
    }
  | {
      type: "flowFinished";
      runId: string;
      success: boolean;
    };

export interface GitFlowsStoreData {
  flows: GitFlow[];
  selected: GitFlow | null;

  activeRun: GitFlowRun | null;

  isLoading: boolean;
  isRunning: boolean;
  initialized: boolean;

  error: string | null;
}

export interface GitFlowsStoreAction {
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;

  select: (flow: GitFlow | null) => void;

  add: (flow: GitFlow) => Promise<void>;
  update: (flow: GitFlow) => Promise<void>;
  remove: (id: string) => Promise<void>;

  run: (flow: GitFlow) => Promise<void>;
}

export type GitFlowsStore = GitFlowsStoreData & GitFlowsStoreAction;
