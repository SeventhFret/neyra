import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  GitFlowInputsStoreAction,
  GitFlowInputsStoreState,
} from "./store.types";

const composeFlowInputsKey = (repositoryRoot: string, flowId: string) => {
  return `${repositoryRoot}:${flowId}`;
};

export const useGitFlowInputsStore = create<
  GitFlowInputsStoreState & GitFlowInputsStoreAction
>()(
  persist<GitFlowInputsStoreState & GitFlowInputsStoreAction>(
    (set, get) => ({
      inputs: {},
      getInputs: (repositoryRoot, flowId) => {
        const key = composeFlowInputsKey(repositoryRoot, flowId);
        return get().inputs[key];
      },
      setInputs: (repositoryRoot, flowId, inputs) => {
        const key = composeFlowInputsKey(repositoryRoot, flowId);
        set({
          inputs: {
            ...get().inputs,
            [key]: inputs,
          },
        });
      },
      removeInputs: (repositoryRoot, flowId) => {
        const key = composeFlowInputsKey(repositoryRoot, flowId);
        const { [key]: _, ...inputs } = get().inputs;

        set({ inputs });
      },
    }),
    {
      name: "git-flows-inputs",
    },
  ),
);
