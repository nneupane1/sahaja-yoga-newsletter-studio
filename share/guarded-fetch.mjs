// Check server authorization before every browser-local API operation.
export function guardedPreviewFetch({ api, original, authorize, userId, origin, denied }) {
  let disposed = false;
  const fetch = async (input, init) => {
    const request = new Request(input instanceof Request ? input : new URL(String(input), origin), init);
    const url = new URL(request.url);
    if (url.origin !== origin || !url.pathname.startsWith("/api/") || url.pathname === "/api/auth") return original(request);
    try {
      const user = await authorize();
      if (disposed || user.userId !== userId) throw Error("This account session has ended.");
    } catch (error) {
      if (!disposed) denied(error);
      return Response.json({ error: "Please sign in to continue." }, { status: 401 });
    }
    if (url.pathname.startsWith("/api/assets/")) return original(request);
    return api(request);
  };
  return { fetch, dispose() { disposed = true; } };
}
