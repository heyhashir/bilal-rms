import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { ApiError } from '../types/ApiError';

const MAX_CHUNKS = 100;
const WINDOWS_SIGNATURE = Buffer.from('MZ');

type UploadChunkInput = {
  version: string;
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  sha256: string;
  notes: string;
  chunk: Buffer;
};

const assertReleaseVersion = (version: string) => {
  if (version !== env.DESKTOP_BUNDLED_VERSION) {
    throw new ApiError(
      400,
      `Desktop release version must match the deployed application version (${env.DESKTOP_BUNDLED_VERSION})`,
    );
  }
};

const hashFile = async (filePath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });

const writeMetadata = async (input: {
  version: string;
  installerFile: string;
  sha256: string;
  notes: string;
  size: number;
}) => {
  const windowsDir = path.join(env.DESKTOP_RELEASE_DIR, 'windows');
  const metadataPath = path.join(windowsDir, 'latest.json');
  const temporaryMetadataPath = `${metadataPath}.tmp`;
  await fs.promises.writeFile(
    temporaryMetadataPath,
    JSON.stringify(
      {
        version: input.version,
        installerFile: input.installerFile,
        sha256: input.sha256,
        size: input.size,
        notes: input.notes,
        publishedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    { encoding: 'utf8', mode: 0o600 },
  );
  await fs.promises.rm(metadataPath, { force: true });
  await fs.promises.rename(temporaryMetadataPath, metadataPath);
};

export const desktopReleaseService = {
  async getStatus() {
    const version = env.DESKTOP_BUNDLED_VERSION;
    const installerFile = `BilalRMS-Setup-${version}.exe`;
    const installerPath = path.join(env.DESKTOP_RELEASE_DIR, 'windows', installerFile);
    const metadataPath = path.join(env.DESKTOP_RELEASE_DIR, 'windows', 'latest.json');
    const installerStat = await fs.promises.stat(installerPath).catch(() => null);
    const metadata = await fs.promises
      .readFile(metadataPath, 'utf8')
      .then((value) => JSON.parse(value) as Record<string, unknown>)
      .catch(() => null);

    return {
      version,
      installerFile,
      published: Boolean(installerStat),
      size: installerStat?.size ?? null,
      metadata,
    };
  },

  async uploadChunk(input: UploadChunkInput) {
    assertReleaseVersion(input.version);

    if (!/^[a-z0-9-]{8,80}$/i.test(input.uploadId)) {
      throw new ApiError(400, 'Invalid desktop release upload ID');
    }
    if (input.totalChunks < 1 || input.totalChunks > MAX_CHUNKS) {
      throw new ApiError(400, `Desktop release must contain between 1 and ${MAX_CHUNKS} chunks`);
    }
    if (input.chunkIndex < 0 || input.chunkIndex >= input.totalChunks) {
      throw new ApiError(400, 'Desktop release chunk index is out of range');
    }
    if (!/^[a-f0-9]{64}$/i.test(input.sha256)) {
      throw new ApiError(400, 'Invalid desktop release SHA-256 checksum');
    }
    if (input.chunk.length === 0) {
      throw new ApiError(400, 'Desktop release chunk is empty');
    }

    const incomingRoot = path.join(env.DESKTOP_RELEASE_DIR, '.incoming');
    const uploadDir = path.join(incomingRoot, input.uploadId);
    await fs.promises.mkdir(uploadDir, { recursive: true, mode: 0o700 });
    await fs.promises.writeFile(path.join(uploadDir, `${input.chunkIndex}.part`), input.chunk, { mode: 0o600 });

    const partPaths = Array.from({ length: input.totalChunks }, (_, index) => path.join(uploadDir, `${index}.part`));
    const partStates = await Promise.all(partPaths.map((partPath) => fs.promises.stat(partPath).catch(() => null)));
    const receivedChunks = partStates.filter(Boolean).length;

    if (receivedChunks !== input.totalChunks) {
      return {
        complete: false,
        receivedChunks,
        totalChunks: input.totalChunks,
      };
    }

    const installerFile = `BilalRMS-Setup-${input.version}.exe`;
    const windowsDir = path.join(env.DESKTOP_RELEASE_DIR, 'windows');
    const temporaryInstallerPath = path.join(uploadDir, `${installerFile}.assembling`);
    const output = await fs.promises.open(temporaryInstallerPath, 'w', 0o600);

    try {
      for (const partPath of partPaths) {
        const part = await fs.promises.readFile(partPath);
        await output.writeFile(part);
      }
    } finally {
      await output.close();
    }

    const signature = Buffer.alloc(WINDOWS_SIGNATURE.length);
    const assembled = await fs.promises.open(temporaryInstallerPath, 'r');
    try {
      await assembled.read(signature, 0, signature.length, 0);
    } finally {
      await assembled.close();
    }
    if (!signature.equals(WINDOWS_SIGNATURE)) {
      await fs.promises.rm(uploadDir, { recursive: true, force: true });
      throw new ApiError(400, 'Desktop release is not a valid Windows executable');
    }

    const actualSha256 = await hashFile(temporaryInstallerPath);
    if (actualSha256.toLowerCase() !== input.sha256.toLowerCase()) {
      await fs.promises.rm(uploadDir, { recursive: true, force: true });
      throw new ApiError(400, 'Desktop release checksum validation failed');
    }

    await fs.promises.mkdir(windowsDir, { recursive: true, mode: 0o700 });
    const installerPath = path.join(windowsDir, installerFile);
    await fs.promises.rm(installerPath, { force: true });
    await fs.promises.rename(temporaryInstallerPath, installerPath);
    const stat = await fs.promises.stat(installerPath);
    await writeMetadata({
      version: input.version,
      installerFile,
      sha256: actualSha256,
      notes: input.notes,
      size: stat.size,
    });
    await fs.promises.rm(uploadDir, { recursive: true, force: true });

    return {
      complete: true,
      receivedChunks,
      totalChunks: input.totalChunks,
      installerFile,
      sha256: actualSha256,
      size: stat.size,
    };
  },
};
