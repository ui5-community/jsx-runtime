/**
 * # Feedback channel, pre-filled GitHub issue URL
 *
 * Builds a `github.com/…/issues/new?title=…&body=…&labels=…` URL
 * that opens the issue-composer with the current page fragment
 * embedded in the title, plus a small template in the body.
 *
 * Consumers (Welcome header, Explorer ToolHeader) call this from
 * a Button's `press` handler and pass the return value to
 * `window.open(url, "_blank", "noopener")`. No new server-side
 * plumbing needed.
 *
 * The `feedback` label needs to exist on the repository. If it's
 * missing, GitHub silently ignores the `?labels=` param, the
 * issue still opens fine.
 *
 * @namespace ui5.community.jsx.showcase.util
 */
const REPO_ISSUE_NEW =
	"https://github.com/ui5-community/jsx-runtime/issues/new";

/**
 * Return a pre-filled `issues/new` URL. Reads `window.location`
 * for the current hash + href so the reporter's page context is
 * captured automatically.
 */
export function buildFeedbackUrl(): string {
	const hash = (typeof window !== "undefined" && window.location.hash) || "(welcome page)";
	const href = (typeof window !== "undefined" && window.location.href) || "";
	const title = encodeURIComponent(`Feedback: ${hash}`);
	const body = encodeURIComponent(
		`**Where I was:** ${href}\n\n` +
		`**What happened / what I want:**\n\n\n` +
		`**Anything else:**\n\n\n` +
		`<sub>Filed from the JSX Runtime for UI5 showcase.</sub>`
	);
	const labels = encodeURIComponent("feedback");
	return `${REPO_ISSUE_NEW}?title=${title}&body=${body}&labels=${labels}`;
}

/** Open the feedback URL in a new tab. */
export function openFeedback(): void {
	if (typeof window === "undefined") return;
	window.open(buildFeedbackUrl(), "_blank", "noopener,noreferrer");
}
