/** Public facade for opt-in Item Importer core feature services. */

export {
  ITEM_YAML_SCHEMA_KEY,
  ITEM_YAML_SCHEMA_VERSION,
  readItemYamlSchemaVersion,
  migrateItemYamlDocument,
  isItemYamlMetadataKey
} from "./strictItemParsers/itemSchemaVersion.js";

export {
  itemToStrictYamlDocument,
  exportStrictItemYaml,
  exportStrictItemYamlBatch,
  createStrictYamlAttachmentFlags
} from "./itemYamlExporter.js";

export {
  buildItemParseInsights,
  deriveParseProvenance
} from "./itemParseInsights.js";

export {
  normalizeCustomProperties,
  resolveRegisteredPropertyIds,
  customPropertiesToFlagData,
  customPropertiesToItemSourcePatch
} from "./itemCustomProperties.js";

export {
  collectCompendiumImageCandidates,
  selectCompendiumImageCandidate,
  configureCompendiumImageCandidateCache,
  clearCompendiumImageCandidateCache,
  getCompendiumImageCandidateCacheStats
} from "./compendiumImageSelector.js";

export {
  synthesizeNaturalAutomation,
  validateSynthesizedAutomation
} from "./naturalAutomationSynthesis.js";

export {
  AutoAnimationsHandler,
  buildAutoAnimationFlagsFromCandidate,
  getAutoAnimationCandidates,
  getAutoAnimationPreview
} from "./integrations/autoAnimations.js";

export {
  parseItemText,
  parseItemTextWithInsights
} from "./parserRouting.js";
