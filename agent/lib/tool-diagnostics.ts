function videoId(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048 || !URL.canParse(value)) return;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") return;
  let id: string | null = null;
  if (url.hostname === "youtu.be") id = url.pathname.slice(1);
  if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else id = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})$/)?.[1] ?? null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : undefined;
}

// Fixed-field projection only: no enumeration, recursion, getters or toJSON.
function field(value: unknown, name: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, name);
  if (!descriptor || !("value" in descriptor)) return undefined;
  return descriptor.value;
}

export function toolInputMetadata(toolName: string, input: unknown) {
  if (toolName === "youtube_video_excerpt") return { videoId: videoId(field(input, "videoUrl")) };
  return {};
}

export function toolResultMetadata(toolName: string, output: unknown) {
  const reportedError = field(output, "isError") === true;
  if (toolName === "youtube_video_excerpt") {
    const status = field(output, "status");
    return { reportedError, videoId: videoId(field(output, "videoUrl")),
      excerptAvailable: status === "ok" ? true : status === "unavailable" ? false : undefined };
  }
  // Search/fetch/MCP bodies may be huge. Runtime outcome and a top-level MCP
  // error flag remain useful without inspecting unknown response structures.
  return { reportedError };
}
