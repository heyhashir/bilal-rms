import { Request, Response } from 'express';
import { desktopReleaseService } from '../../services/desktop-release.service';
import { ApiError } from '../../types/ApiError';
import { logAdminAudit } from '../../utils/adminAudit';
import { ApiResponse } from '../../utils/ApiResponse';

export const getDesktopReleaseStatus = async (_req: Request, res: Response) => {
  const release = await desktopReleaseService.getStatus();
  res.status(200).json(ApiResponse.success('Desktop release status loaded', { release }));
};

export const uploadDesktopReleaseChunk = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'Desktop release chunk is required');
  }

  const release = await desktopReleaseService.uploadChunk({
    version: req.body.version,
    uploadId: req.body.uploadId,
    chunkIndex: req.body.chunkIndex,
    totalChunks: req.body.totalChunks,
    sha256: req.body.sha256,
    notes: req.body.notes || '',
    chunk: req.file.buffer,
  });

  if (release.complete) {
    logAdminAudit(req, {
      action: 'desktop-release.published',
      targetType: 'desktop-release',
      targetId: req.body.version,
      details: {
        installerFile: release.installerFile,
        sha256: release.sha256,
        size: release.size,
      },
    });
  }

  res.status(release.complete ? 201 : 202).json(
    ApiResponse.success(release.complete ? 'Desktop release published' : 'Desktop release chunk received', {
      release,
    }),
  );
};
