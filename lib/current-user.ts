export function getCurrentOwnerId(request: Request) {
  const userId = request.headers.get("oai-authenticated-user-id")?.trim();
  if (userId) return userId;

  const hostname = new URL(request.url).hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "local-preview";
  return null;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Sign in to save your study workspace." }, { status: 401 });
}
