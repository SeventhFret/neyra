import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";

import { useRepoDataStore } from "../repoData/store";

import type {
  GitFlow,
  GitFlowEvent,
  GitFlowRun,
  GitFlowsStore,
  GitFlowStepOutcome,
  GitFlowStepStatus,
} from "./store.types";

const GIT_FLOW_EVENT = "git-flow-event";

let stopListening: (() => void) | null = null;
let pendingFlow: GitFlow | null = null;

export const useGitFlowsStore = create<GitFlowsStore>((set, get) => ({
  flows: [],
  selected: null,

  activeRun: null,

  isLoading: false,
  isRunning: false,
  initialized: false,

  error: null,

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    try {
      await ensureEventListener();

      set({
        initialized: true,
      });

      await get().refresh();
    } catch (error) {
      set({
        error: String(error),
      });
    }
  },

  refresh: async () => {
    set({
      isLoading: true,
      error: null,
    });

    try {
      const flows = await invoke<GitFlow[]>("get_git_flows_from_config");

      const selected = get().selected;

      set({
        flows,
        selected:
          flows.find((flow) => flow.id === selected?.id) ?? flows[0] ?? null,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: String(error),
      });
    }
  },

  select: (flow) => {
    set({
      selected: flow,
    });
  },

  add: async (flow) => {
    set({
      error: null,
    });

    try {
      await invoke("add_git_flow", {
        gitFlow: flow,
      });

      await get().refresh();

      const created = get().flows.find((item) => item.id === flow.id);

      if (created) {
        set({
          selected: created,
        });
      }
    } catch (error) {
      set({
        error: String(error),
      });

      throw error;
    }
  },

  update: async (flow) => {
    set({
      error: null,
    });

    try {
      await invoke("update_git_flow", {
        gitFlow: flow,
      });

      await get().refresh();

      const updated = get().flows.find((item) => item.id === flow.id);

      if (updated) {
        set({
          selected: updated,
        });
      }
    } catch (error) {
      set({
        error: String(error),
      });

      throw error;
    }
  },

  remove: async (id) => {
    set({
      error: null,
    });

    try {
      await invoke("remove_git_flow", {
        id,
      });

      const selected = get().selected?.id === id;

      await get().refresh();

      if (selected) {
        set({
          selected: get().flows[0] ?? null,
        });
      }
    } catch (error) {
      set({
        error: String(error),
      });

      throw error;
    }
  },

  run: async (flow) => {
    if (get().isRunning) {
      return;
    }

    set({
      error: null,
    });

    pendingFlow = flow;

    try {
      await ensureEventListener();

      const runId = await invoke<string>("run_git_flow", {
        id: flow.id,
      });

      set((state) => {
        if (state.activeRun?.id === runId) {
          return state;
        }

        return {
          activeRun: createRun(runId, flow),
          isRunning: true,
        };
      });
    } catch (error) {
      set({
        isRunning: false,
        error: String(error),
      });
    } finally {
      pendingFlow = null;
    }
  },
}));

async function ensureEventListener() {
  if (stopListening) {
    return;
  }

  stopListening = await listen<GitFlowEvent>(GIT_FLOW_EVENT, ({ payload }) => {
    handleGitFlowEvent(payload);
  });
}

function handleGitFlowEvent(event: GitFlowEvent) {
  const store = useGitFlowsStore;

  switch (event.type) {
    case "flowStarted": {
      const flow = pendingFlow;

      if (!flow) {
        return;
      }

      store.setState({
        activeRun: createRun(event.runId, flow),
        isRunning: true,
        error: null,
      });

      break;
    }

    case "stepStarted": {
      updateRun(event.runId, (run) => ({
        ...run,

        steps: run.steps.map((step) =>
          step.stepId === event.stepId
            ? {
                ...step,
                status: "running",
                startedAt: Date.now(),
              }
            : step,
        ),
      }));

      break;
    }

    case "stepOutput": {
      updateRun(event.runId, (run) => ({
        ...run,

        steps: run.steps.map((step) => {
          if (step.stepId !== event.stepId) {
            return step;
          }

          if (event.stream === "stdout") {
            return {
              ...step,
              stdout: step.stdout + event.chunk,
            };
          }

          return {
            ...step,
            stderr: step.stderr + event.chunk,
          };
        }),
      }));

      break;
    }

    case "stepFinished": {
      updateRun(event.runId, (run) => ({
        ...run,

        steps: run.steps.map((step) =>
          step.stepId === event.stepId
            ? {
                ...step,
                status: outcomeToStatus(event.outcome),
                exitCode: event.exitCode,
                finishedAt: Date.now(),
              }
            : step,
        ),
      }));

      break;
    }

    case "stepSkipped": {
      updateRun(event.runId, (run) => ({
        ...run,

        steps: run.steps.map((step) =>
          step.stepId === event.stepId
            ? {
                ...step,
                status: "skipped",
                finishedAt: Date.now(),
              }
            : step,
        ),
      }));

      break;
    }

    case "flowFinished": {
      updateRun(event.runId, (run) => ({
        ...run,
        isRunning: false,
        success: event.success,
        finishedAt: Date.now(),
      }));

      store.setState({
        isRunning: false,
      });

      void useRepoDataStore.getState().refresh();

      break;
    }
  }
}

function createRun(runId: string, flow: GitFlow): GitFlowRun {
  return {
    id: runId,
    flowId: flow.id,

    steps: flow.steps.map((step) => ({
      stepId: step.id,
      status: "pending",
      exitCode: null,
      stdout: "",
      stderr: "",
      startedAt: null,
      finishedAt: null,
    })),

    isRunning: true,
    success: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

function updateRun(runId: string, update: (run: GitFlowRun) => GitFlowRun) {
  useGitFlowsStore.setState((state) => {
    if (!state.activeRun || state.activeRun.id !== runId) {
      return state;
    }

    return {
      activeRun: update(state.activeRun),
    };
  });
}

function outcomeToStatus(outcome: GitFlowStepOutcome): GitFlowStepStatus {
  switch (outcome) {
    case "success":
      return "success";

    case "failed":
      return "failed";

    case "timedOut":
      return "timedOut";
  }
}
