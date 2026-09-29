export interface GitFlowInputValues {
  remote?: string;
  defaultBranch?: string;
  variables: Record<string, string>;
}

export interface GitFlowInputsStoreState {
  inputs: Record<string, GitFlowInputValues>;
}

export interface GitFlowInputsStoreAction {
  getInputs: (
    repositoryRoot: string,
    flowId: string,
  ) => GitFlowInputValues | undefined;

  setInputs: (
    repositoryRoot: string,
    flowId: string,
    inputs: GitFlowInputValues,
  ) => void;

  removeInputs: (repositoryRoot: string, flowId: string) => void;
}
