import {
  findTemplatesByOwner,
  findTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/repositories/template.repository";
import { findPipelineByIdOnly } from "@/repositories/pipeline.repository";

const VALID_LANGUAGES = ["javascript", "typescript", "python", "java", "cpp", "go", "rust"];

export async function listTemplates(userId) {
  return findTemplatesByOwner(userId);
}

export async function createNewTemplate(body, userId) {
  const { name, description, language, durationMinutes, problemIds, focusModeEnabled, rubricWeights, customPrompt, defaultPipelineId } = body;
  if (!name?.trim()) return { error: "name is required", status: 400 };
  if (language && !VALID_LANGUAGES.includes(language)) return { error: "Invalid language", status: 400 };

  // Validate pipeline ownership if provided
  if (defaultPipelineId) {
    const pipeline = await findPipelineByIdOnly(defaultPipelineId);
    if (!pipeline || pipeline.createdById !== userId) {
      return { error: "Pipeline not found or access denied", status: 400 };
    }
  }

  const template = await createTemplate({
    name: name.trim(),
    description: description?.trim() || null,
    ownerId: userId,
    language: language || "javascript",
    durationMinutes: durationMinutes || 60,
    problemIds: problemIds || [],
    focusModeEnabled: focusModeEnabled || false,
    rubricWeights: rubricWeights || null,
    customPrompt: customPrompt?.trim() || null,
    defaultPipelineId: defaultPipelineId || null,
  });
  return { template };
}

export async function updateExistingTemplate(id, body, userId) {
  const template = await findTemplateById(id);
  if (!template) return { error: "Template not found", status: 404 };
  if (template.ownerId !== userId) return { error: "Access denied", status: 403 };

  const { name, description, language, durationMinutes, problemIds, focusModeEnabled, rubricWeights, customPrompt, defaultPipelineId } = body;
  if (language && !VALID_LANGUAGES.includes(language)) return { error: "Invalid language", status: 400 };

  const updated = await updateTemplate(id, {
    ...(name !== undefined && { name: name.trim() }),
    ...(description !== undefined && { description: description?.trim() || null }),
    ...(language !== undefined && { language }),
    ...(durationMinutes !== undefined && { durationMinutes }),
    ...(problemIds !== undefined && { problemIds }),
    ...(focusModeEnabled !== undefined && { focusModeEnabled }),
    ...(rubricWeights !== undefined && { rubricWeights }),
    ...(customPrompt !== undefined && { customPrompt: customPrompt?.trim() || null }),
    ...(defaultPipelineId !== undefined && { defaultPipelineId: defaultPipelineId || null }),
  });
  return { template: updated };
}

export async function removeTemplate(id, userId) {
  const template = await findTemplateById(id);
  if (!template) return { error: "Template not found", status: 404 };
  if (template.ownerId !== userId) return { error: "Access denied", status: 403 };
  await deleteTemplate(id);
  return { ok: true };
}

export async function getTemplateForRoom(id, userId) {
  const template = await findTemplateById(id);
  if (!template) return { error: "Template not found", status: 404 };
  if (template.ownerId !== userId) return { error: "Access denied", status: 403 };
  return { template };
}
