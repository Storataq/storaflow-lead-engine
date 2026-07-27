export * from "@/lib/crm/pipeline/constants";
export { emitPipelineAutomationEvent } from "@/lib/crm/pipeline/automation";
export {
  buildDealNextBestActions,
  buildDealNextBestActionsForDeal,
  type DealNbaItem,
} from "@/lib/crm/pipeline/nba";
export {
  buildPipelineForecast,
  type DealForecastRow,
  type PipelineForecast,
} from "@/lib/crm/pipeline/forecast";
