import { MarkdownKnowledgeLoader } from "./markdown_loader";

export function retrieveRelevantKnowledge(customerText: string): string {
  const scoped = MarkdownKnowledgeLoader.loadScopedKnowledge(customerText);
  return scoped.content;
}

export function getScopedKnowledgeFiles(customerText: string): string[] {
  const scoped = MarkdownKnowledgeLoader.loadScopedKnowledge(customerText);
  return scoped.filesLoaded;
}
