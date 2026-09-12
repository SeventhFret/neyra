import { useRepoData } from "../../stores";

export default function NeyraStatusBar() {
  const currentBranch = useRepoData((state) => state.currentBranch);
  const repoRoot = useRepoData((state) => state.root);

  return (
    <div>
      
    </div>
  )
}
