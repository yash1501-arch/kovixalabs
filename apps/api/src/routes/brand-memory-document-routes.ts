import { Router } from "express";
import { listBrandDocuments, createBrandDocument, deleteBrandDocument, reembedBrandDocuments, brandDocumentStats } from "../controllers/brand-memory-document-controller.js";

const router = Router();

router.get("/workspaces/:workspaceId/brands/:brandId/documents", listBrandDocuments);
router.post("/workspaces/:workspaceId/brands/:brandId/documents", createBrandDocument);
router.delete("/workspaces/:workspaceId/documents/:documentId", deleteBrandDocument);
router.post("/workspaces/:workspaceId/brands/:brandId/documents/reembed", reembedBrandDocuments);
router.get("/workspaces/:workspaceId/brands/:brandId/documents/stats", brandDocumentStats);

export { router as brandMemoryDocumentRouter };
