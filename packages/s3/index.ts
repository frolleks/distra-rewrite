import {
  S3Client,
  type S3File,
  type S3FilePresignOptions,
  type S3ListObjectsOptions,
  type S3ListObjectsResponse,
  type S3Options,
  type S3Stats,
} from "bun";
import type { Stats } from "node:fs";
import { mkdirSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

type S3WriteData = Parameters<S3Client["write"]>[1];
type S3ListCredentials = Parameters<S3Client["list"]>[1];
type LocalNetworkSink = ReturnType<S3File["writer"]>;

const DEFAULT_LOCAL_S3_ROOT = ".local/s3";
const DEFAULT_LOCAL_BUCKET = "local";

export type LocalS3Options = S3Options & {
  root?: string;
};

function isEnoent(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function normalizeKey(key: string): string {
  return key.replaceAll("\\", "/").replace(/^\/+/, "");
}

function assertObjectKey(key: string): string {
  const normalized = normalizeKey(key);

  if (!normalized) {
    throw new Error("LocalS3Client requires a non-empty object key");
  }

  return normalized;
}

function encodeContinuationToken(key: string): string {
  return `local:${Buffer.from(key).toString("base64url")}`;
}

function decodeContinuationToken(token: string | undefined): string | undefined {
  if (!token?.startsWith("local:")) return undefined;

  try {
    return Buffer.from(token.slice("local:".length), "base64url").toString("utf8");
  } catch {
    return undefined;
  }
}

function makeLocalEtag(size: number, modifiedMs: number): string {
  return `${size.toString(16)}-${Math.trunc(modifiedMs).toString(16)}`;
}

async function collectObjectKeys(root: string, current = ""): Promise<string[]> {
  const dirPath = current ? join(root, current) : root;
  const entries = await readdir(dirPath, { withFileTypes: true });
  const keys: string[] = [];

  for (const entry of entries) {
    const next = current ? `${current}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      keys.push(...(await collectObjectKeys(root, next)));
      continue;
    }

    if (entry.isFile()) {
      keys.push(next);
    }
  }

  return keys;
}

function buildNetworkSink(path: string, options?: S3Options): LocalNetworkSink {
  mkdirSync(dirname(path), { recursive: true });

  const sink = (Bun.file(path).writer as (opts?: S3Options) => ReturnType<S3File["writer"]>)(options);

  return {
    write: (chunk) => sink.write(chunk),
    flush: () => sink.flush(),
    end: (error) => sink.end(error),
    start: (startOptions) => sink.start(startOptions),
    ref: () => sink.ref(),
    unref: () => sink.unref(),
    stat: async () => (await Bun.file(path).stat()) as Stats,
  };
}

function decorateSliceBlob(blob: Blob, parent: LocalS3File): S3File {
  const sliceBlob = blob as Blob & Partial<S3File>;
  const nativeSlice = (blob as unknown as { slice: (...args: unknown[]) => Blob }).slice.bind(blob);

  Object.defineProperty(sliceBlob, "name", {
    get: () => parent.name,
  });

  Object.defineProperty(sliceBlob, "bucket", {
    get: () => parent.bucket,
  });

  Object.defineProperty(sliceBlob, "readable", {
    get: () => blob.stream(),
  });

  Object.defineProperty(sliceBlob, "exists", {
    value: () => parent.exists(),
  });

  Object.defineProperty(sliceBlob, "write", {
    value: (data: S3WriteData, options?: S3Options) => parent.write(data, options),
  });

  Object.defineProperty(sliceBlob, "delete", {
    value: () => parent.delete(),
  });

  Object.defineProperty(sliceBlob, "unlink", {
    value: () => parent.unlink(),
  });

  Object.defineProperty(sliceBlob, "stat", {
    value: () => parent.stat(),
  });

  Object.defineProperty(sliceBlob, "presign", {
    value: (options?: S3FilePresignOptions) => parent.presign(options),
  });

  Object.defineProperty(sliceBlob, "writer", {
    value: (options?: S3Options) => parent.writer(options),
  });

  Object.defineProperty(sliceBlob, "slice", {
    value: (...args: unknown[]) => decorateSliceBlob(nativeSlice(...args), parent),
  });

  return sliceBlob as S3File;
}

class LocalS3File extends Blob {
  readonly #client: LocalS3Client;
  readonly #key: string;
  readonly #bucketName: string;
  readonly #path: string;
  readonly #options?: S3Options;

  constructor(client: LocalS3Client, key: string, bucketName: string, path: string, options?: S3Options) {
    super();
    this.#client = client;
    this.#key = key;
    this.#bucketName = bucketName;
    this.#path = path;
    this.#options = options;
  }

  #bunFile() {
    if (this.#options?.type) {
      return Bun.file(this.#path, { type: this.#options.type } as BlobPropertyBag);
    }

    return Bun.file(this.#path);
  }

  get name(): string {
    return this.#key;
  }

  get bucket(): string {
    return this.#bucketName;
  }

  get readable() {
    return this.stream();
  }

  override get size(): number {
    return this.#bunFile().size;
  }

  override get type(): string {
    return this.#options?.type ?? this.#bunFile().type;
  }

  get lastModified(): number {
    return this.#bunFile().lastModified;
  }

  override arrayBuffer(): Promise<ArrayBuffer> {
    return this.#bunFile().arrayBuffer();
  }

  override bytes() {
    return this.#bunFile().bytes();
  }

  override formData(): Promise<FormData> {
    return this.#bunFile().formData();
  }

  override json<T = unknown>(): Promise<T> {
    return this.#bunFile().json() as Promise<T>;
  }

  override stream() {
    return this.#bunFile().stream();
  }

  override text(): Promise<string> {
    return this.#bunFile().text();
  }

  slice(begin?: number, end?: number, contentType?: string): S3File;
  slice(begin?: number, contentType?: string): S3File;
  slice(contentType?: string): S3File;
  slice(
    beginOrContentType?: number | string,
    endOrContentType?: number | string,
    contentType?: string,
  ): S3File {
    const file = this.#bunFile();
    let sliced: Blob;

    if (typeof beginOrContentType === "string") {
      sliced = file.slice(undefined, undefined, beginOrContentType);
    } else if (typeof endOrContentType === "string") {
      sliced = file.slice(beginOrContentType, undefined, endOrContentType);
    } else {
      sliced = file.slice(beginOrContentType, endOrContentType, contentType);
    }

    return decorateSliceBlob(sliced, this);
  }

  writer(options?: S3Options): LocalNetworkSink {
    return buildNetworkSink(this.#path, options ?? this.#options);
  }

  exists(): Promise<boolean> {
    return this.#bunFile().exists();
  }

  write(data: S3WriteData, options?: S3Options): Promise<number> {
    return this.#client.write(this.#key, data, { ...this.#options, ...options });
  }

  presign(options?: S3FilePresignOptions): string {
    return this.#client.presign(this.#key, { ...this.#options, ...options });
  }

  delete(): Promise<void> {
    return this.#client.delete(this.#key, this.#options);
  }

  unlink(): Promise<void> {
    return this.delete();
  }

  stat(): Promise<S3Stats> {
    return this.#client.stat(this.#key, this.#options);
  }
}

export class LocalS3Client implements Pick<
  S3Client,
  "file" | "write" | "presign" | "unlink" | "delete" | "size" | "exists" | "stat" | "list"
> {
  readonly #root: string;
  readonly #defaults: S3Options;

  constructor(options: LocalS3Options = {}) {
    const { root, ...s3Defaults } = options;
    this.#root = resolve(root ?? process.env.LOCAL_S3_ROOT ?? DEFAULT_LOCAL_S3_ROOT);
    this.#defaults = s3Defaults;
  }

  get root(): string {
    return this.#root;
  }

  get bucket(): string {
    return this.#resolveBucketName();
  }

  #mergeOptions(options?: S3Options): S3Options {
    return { ...this.#defaults, ...options };
  }

  #resolveBucketName(options?: S3Options): string {
    return options?.bucket ?? this.#defaults.bucket ?? process.env.S3_BUCKET ?? process.env.AWS_BUCKET ?? DEFAULT_LOCAL_BUCKET;
  }

  #resolveBucketRoot(options?: S3Options): string {
    return resolve(this.#root, this.#resolveBucketName(options));
  }

  #resolvePath(path: string, options?: S3Options): { key: string; bucket: string; fullPath: string } {
    const key = assertObjectKey(path);
    const bucket = this.#resolveBucketName(options);
    const bucketRoot = resolve(this.#root, bucket);
    const fullPath = resolve(bucketRoot, key);

    if (fullPath !== bucketRoot && !fullPath.startsWith(`${bucketRoot}${sep}`)) {
      throw new Error(`LocalS3Client rejected path traversal attempt for key: ${path}`);
    }

    return { key, bucket, fullPath };
  }

  file(path: string, options?: S3Options): S3File {
    const merged = this.#mergeOptions(options);
    const { key, bucket, fullPath } = this.#resolvePath(path, merged);
    return new LocalS3File(this, key, bucket, fullPath, merged) as unknown as S3File;
  }

  async write(path: string, data: S3WriteData, options?: S3Options): Promise<number> {
    const merged = this.#mergeOptions(options);
    const { fullPath } = this.#resolvePath(path, merged);

    await mkdir(dirname(fullPath), { recursive: true });

    const target = merged.type ? Bun.file(fullPath, { type: merged.type } as BlobPropertyBag) : Bun.file(fullPath);
    return Bun.write(target as unknown as string, data as never);
  }

  presign(path: string, options?: S3FilePresignOptions): string {
    const merged = this.#mergeOptions(options);
    const { fullPath } = this.#resolvePath(path, merged);
    return pathToFileURL(fullPath).toString();
  }

  async unlink(path: string, options?: S3Options): Promise<void> {
    const merged = this.#mergeOptions(options);
    const { fullPath } = this.#resolvePath(path, merged);

    try {
      await Bun.file(fullPath).delete();
    } catch (error) {
      if (!isEnoent(error)) {
        throw error;
      }
    }
  }

  delete(path: string, options?: S3Options): Promise<void> {
    return this.unlink(path, options);
  }

  async size(path: string, options?: S3Options): Promise<number> {
    return (await this.stat(path, options)).size;
  }

  async exists(path: string, options?: S3Options): Promise<boolean> {
    const merged = this.#mergeOptions(options);
    const { fullPath } = this.#resolvePath(path, merged);
    return Bun.file(fullPath).exists();
  }

  async stat(path: string, options?: S3Options): Promise<S3Stats> {
    const merged = this.#mergeOptions(options);
    const { fullPath } = this.#resolvePath(path, merged);
    const stats = await Bun.file(fullPath).stat();
    const modified = stats.mtime ?? new Date(stats.mtimeMs);
    const type = merged.type ?? Bun.file(fullPath).type;

    return {
      size: stats.size,
      lastModified: modified,
      etag: makeLocalEtag(stats.size, modified.getTime()),
      type,
    };
  }

  async list(input?: S3ListObjectsOptions | null, options?: S3ListCredentials): Promise<S3ListObjectsResponse> {
    const listInput = input ?? {};
    const bucket = this.#resolveBucketName(options);
    const bucketRoot = this.#resolveBucketRoot(options);
    const prefix = normalizeKey(listInput.prefix ?? "");
    const continuationToken = listInput.continuationToken;
    const decodedToken = decodeContinuationToken(continuationToken);
    const startAfter = normalizeKey(listInput.startAfter ?? decodedToken ?? "");
    const delimiter = listInput.delimiter;
    const maxKeys = Math.max(0, Math.min(listInput.maxKeys ?? 1000, 1000));

    let keys: string[];
    try {
      keys = await collectObjectKeys(bucketRoot);
    } catch (error) {
      if (!isEnoent(error)) throw error;
      keys = [];
    }

    keys = keys
      .map((key) => normalizeKey(key))
      .filter((key) => key.startsWith(prefix))
      .filter((key) => (startAfter ? key > startAfter : true))
      .sort((a, b) => a.localeCompare(b));

    const contents: NonNullable<S3ListObjectsResponse["contents"]> = [];
    const commonPrefixes: NonNullable<S3ListObjectsResponse["commonPrefixes"]> = [];
    const seenCommonPrefixes = new Set<string>();

    let itemsCount = 0;
    let isTruncated = false;
    let nextContinuationToken: string | undefined;
    let lastIncludedKey: string | undefined;

    for (const key of keys) {
      const suffix = key.slice(prefix.length);

      if (delimiter) {
        const delimiterIndex = suffix.indexOf(delimiter);

        if (delimiterIndex >= 0) {
          const groupedPrefix = `${prefix}${suffix.slice(0, delimiterIndex + delimiter.length)}`;

          if (seenCommonPrefixes.has(groupedPrefix)) {
            continue;
          }

          if (itemsCount >= maxKeys) {
            isTruncated = true;
            nextContinuationToken = encodeContinuationToken(lastIncludedKey ?? key);
            break;
          }

          seenCommonPrefixes.add(groupedPrefix);
          commonPrefixes.push({ prefix: groupedPrefix });
          itemsCount += 1;
          lastIncludedKey = key;
          continue;
        }
      }

      if (itemsCount >= maxKeys) {
        isTruncated = true;
        nextContinuationToken = encodeContinuationToken(lastIncludedKey ?? key);
        break;
      }

      const fullPath = join(bucketRoot, key);
      const stats = await Bun.file(fullPath).stat();
      const modified = stats.mtime ?? new Date(stats.mtimeMs);

      contents.push({
        key,
        size: stats.size,
        lastModified: modified.toISOString(),
        eTag: makeLocalEtag(stats.size, modified.getTime()),
      });

      itemsCount += 1;
      lastIncludedKey = key;
    }

    return {
      name: bucket,
      prefix: listInput.prefix,
      delimiter,
      maxKeys,
      continuationToken,
      startAfter: listInput.startAfter,
      keyCount: itemsCount,
      isTruncated,
      nextContinuationToken,
      contents: contents.length > 0 ? contents : undefined,
      commonPrefixes: commonPrefixes.length > 0 ? commonPrefixes : undefined,
    };
  }
}

export function createClient(provider: "local", options?: LocalS3Options): LocalS3Client;
export function createClient(provider: "cloud", options?: S3Options): S3Client;
export function createClient(provider: "local" | "cloud", options?: LocalS3Options | S3Options) {
  if (provider === "local") {
    return new LocalS3Client(options as LocalS3Options | undefined);
  }

  return new S3Client(options as S3Options | undefined);
}
