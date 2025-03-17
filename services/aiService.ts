import { logError } from "../utils/Logger.ts";
import ConfigService from "./configService.ts";
import GitService from "./gitService.ts";

const AiService = {
  async generateAndApplyMessage() {
    await GitService.initialize();
    const onlyStagedSetting = ConfigService.get("onlyStaged") as boolean;
    const hasStagedChanges = await GitService.hasChanges("staged");

    const useStagedChanges = onlyStagedSetting || hasStagedChanges;

    const diff = await GitService.getDiff(useStagedChanges);
    if (!diff) logError("No changes to commit");

    const changedFiles = await GitService.getChangedFiles(useStagedChanges);
  },
};

export default AiService;
